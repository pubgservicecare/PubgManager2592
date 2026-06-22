import { Router, type IRouter } from "express";
import { db, settingsTable, testDatabaseUrl } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";
import { sendRawEmail } from "../lib/email";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

const SETTING_FIELDS = [
  "siteName",
  "siteDescription",
  "heroTagline",
  "footerText",
  "logoUrl",
  "supportEmail",
  "whatsappNumber",
  "businessAddress",
  "allowSellerRegistration",
  "defaultSellerCommissionPercent",
  "showSellerNamesPublicly",
  "bannerEnabled",
  "bannerText",
  "popularSearches",
  "paymentMethodsInfo",
  "maintenanceMode",
  "maintenanceMessage",
  "facebookUrl",
  "instagramUrl",
  "youtubeUrl",
  "tiktokUrl",
  "discordUrl",
  "adminUsername",
  // Legacy GCS fields
  "gcsKeyJson",
  "gcsBucketPublicPath",
  "gcsBucketPrivatePath",
  // External database
  "neonDatabaseUrl",
  // New storage fields
  "storageProvider",
  "gcsBucketName",
  "gcsProjectId",
  "gcsServiceAccountEmail",
  "gcsPrivateKey",
  "gcsPublicBaseUrl",
  "gcsFolderPath",
] as const;

const BOOLEAN_FIELDS = new Set([
  "allowSellerRegistration",
  "showSellerNamesPublicly",
  "bannerEnabled",
  "maintenanceMode",
]);

const NUMERIC_FIELDS = new Set(["defaultSellerCommissionPercent"]);

async function getInitialAdminCredentials(): Promise<{ adminUsername: string; adminPassword: string }> {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required for first-run setup.",
    );
  }
  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  return { adminUsername, adminPassword: hashedPassword };
}

router.get("/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values(await getInitialAdminCredentials()).returning();
  }
  const { adminPassword: _pw, ...safeSettings } = settings;
  res.json(safeSettings);
});

router.patch("/settings", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body ?? {};

  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values(await getInitialAdminCredentials()).returning();
  }

  const updates: Record<string, any> = {};
  for (const field of SETTING_FIELDS) {
    if (body[field] === undefined) continue;
    if (BOOLEAN_FIELDS.has(field as any)) {
      updates[field] = !!body[field];
    } else if (NUMERIC_FIELDS.has(field as any)) {
      const n = Number(body[field]);
      if (Number.isFinite(n) && n >= 0 && n <= 100) updates[field] = Math.round(n);
    } else {
      updates[field] = body[field] === "" ? null : body[field];
    }
  }
  if (body.adminPassword) updates.adminPassword = await bcrypt.hash(body.adminPassword, 12);

  const requiredText: Array<keyof typeof settingsTable.$inferSelect> = [
    "siteName",
    "siteDescription",
    "heroTagline",
    "footerText",
    "supportEmail",
    "whatsappNumber",
    "maintenanceMessage",
    "adminUsername",
    "popularSearches",
    "storageProvider",
  ];
  for (const k of requiredText) {
    if (updates[k as string] === null) delete updates[k as string];
  }

  const { eq } = await import("drizzle-orm");
  const [updated] = await db.update(settingsTable).set(updates).where(eq(settingsTable.id, settings.id)).returning();

  const adminUser = (req.session as any).username || "admin";
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: "Settings updated",
    targetType: "settings",
    targetId: updated.id,
    details: Object.keys(updates).join(", "),
  });

  const { adminPassword: _pw, ...safeSettings } = updated;
  res.json(safeSettings);
});

/**
 * POST /settings/test-neon-connection
 * Tests a Neon (or any PostgreSQL) connection string without
 * affecting the current live database pool.
 */
router.post("/settings/test-neon-connection", requireAdmin, async (req, res): Promise<void> => {
  const { url } = req.body ?? {};
  if (!url || typeof url !== "string") {
    res.status(400).json({ ok: false, error: "No database URL provided." });
    return;
  }

  const result = await testDatabaseUrl(url);
  if (result.ok) {
    res.json({ ok: true, message: "Connection successful — Neon database is reachable." });
  } else {
    res.status(400).json({ ok: false, error: result.error || "Connection failed." });
  }
});

// ─── Env Check — shows status of all required env vars (admin only) ──────────

router.get("/admin/env-check", requireAdmin, async (_req, res): Promise<void> => {
  const has = (key: string) => !!process.env[key]?.trim();

  const hasNeon = has("NEON_DATABASE_URL");
  const hasDbUrl = has("DATABASE_URL");
  const isSameOrigin = process.env.SAME_ORIGIN_DEPLOYMENT === "true";
  const isProd = process.env.NODE_ENV === "production";
  const activeDbSource: string | null = hasNeon ? "NEON_DATABASE_URL" : hasDbUrl ? "DATABASE_URL" : null;

  // ── GCS status from DB (GCS is configured via Admin Settings, not env vars) ─
  let storageProvider = "local";
  let gcsConfiguredInDb = false;
  let gcsBucketName: string | null = null;
  try {
    const [s] = await db
      .select({
        storageProvider: settingsTable.storageProvider,
        gcsBucketName: settingsTable.gcsBucketName,
        gcsPrivateKey: settingsTable.gcsPrivateKey,
        gcsKeyJson: settingsTable.gcsKeyJson,
      })
      .from(settingsTable)
      .limit(1);
    if (s) {
      storageProvider = s.storageProvider ?? "local";
      gcsBucketName = s.gcsBucketName ?? null;
      gcsConfiguredInDb =
        storageProvider === "gcs" &&
        !!(s.gcsBucketName && (s.gcsPrivateKey || s.gcsKeyJson));
    }
  } catch {
    // DB unavailable — show unknown
  }

  // ── Category helpers ──────────────────────────────────────────────────────
  // NEON_DATABASE_URL: only "critical" when DATABASE_URL is also absent.
  const neonCategory: "critical" | "feature" | "optional" = hasDbUrl ? "feature" : "critical";
  // DATABASE_URL: "critical" only when it is the sole active DB source.
  const dbUrlCategory: "critical" | "feature" | "optional" = hasNeon ? "optional" : "critical";
  // FRONTEND_URL: not needed in same-origin mode (backend serves frontend directly).
  const frontendUrlCategory: "critical" | "feature" | "optional" = isSameOrigin ? "optional" : "feature";

  res.json({
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: isProd,
    activeDbSource,
    vars: [
      // ── Critical — app won't work without these ──────────────────────────
      {
        key: "NEON_DATABASE_URL",
        set: hasNeon,
        category: neonCategory,
        label: "Neon Database URL" + (activeDbSource === "NEON_DATABASE_URL" ? " ← active" : ""),
        description: hasDbUrl
          ? "DATABASE_URL is the active DB connection — app is fully connected. NEON_DATABASE_URL is optional but recommended for an explicit Neon instance on Render."
          : "Neither NEON_DATABASE_URL nor DATABASE_URL is set — app will crash on startup. Set at least one.",
      },
      {
        key: "SESSION_SECRET",
        set: has("SESSION_SECRET"),
        category: "critical",
        label: "Session Secret",
        description: "Random 32+ character string for signing user sessions. Login will not work without this.",
      },
      // ── Feature — needed for specific features ───────────────────────────
      {
        key: "RESEND_API_KEY",
        set: has("RESEND_API_KEY"),
        category: "feature",
        label: "Resend API Key",
        description: "Required for OTP emails, welcome emails, and password resets. Get it from resend.com/api-keys.",
      },
      {
        key: "SAME_ORIGIN_DEPLOYMENT",
        set: has("SAME_ORIGIN_DEPLOYMENT"),
        category: "feature",
        label: "Same-Origin Deployment",
        description: "Set to 'true' on Render — backend serves the frontend directly, fixing iOS Safari login and making FRONTEND_URL (CORS) unnecessary.",
      },
      {
        key: "GOOGLE_CLIENT_ID",
        set: has("GOOGLE_CLIENT_ID"),
        category: "feature",
        label: "Google OAuth Client ID  (login only)",
        description:
          "Enables 'Continue with Google' sign-in button on login/signup pages. " +
          "⚠️ This is ONLY for Google social login — it is completely unrelated to Google Cloud Storage. " +
          "GCS (image uploads) is configured in Admin → Settings → File Storage, not via this env var.",
      },
      {
        key: "FRONTEND_URL",
        set: has("FRONTEND_URL"),
        category: frontendUrlCategory,
        label: "Frontend URL  (CORS)",
        description: isSameOrigin
          ? "✅ Not needed — SAME_ORIGIN_DEPLOYMENT=true means the backend serves the frontend. No cross-origin requests, no CORS headers required."
          : "Comma-separated allowed CORS origins e.g. https://www.codexstocks.org. Required when frontend and backend are on separate domains.",
      },
      // ── Optional — always have a working default ─────────────────────────
      {
        key: "SITE_URL",
        set: has("SITE_URL"),
        badge: has("SITE_URL") ? "✓ SET" : "✓ DEFAULT",
        badgeOk: true,
        category: "optional",
        label: "Site URL",
        description: has("SITE_URL")
          ? `Set to: ${process.env.SITE_URL} — sitemap.xml, SEO canonical tags, and structured data use this.`
          : "Using built-in default: https://www.codexstocks.org — sitemap.xml and SEO tags work correctly. Set this env var only to change the domain.",
      },
      {
        key: "DATABASE_URL",
        set: hasDbUrl,
        category: dbUrlCategory,
        label: "Database URL" + (activeDbSource === "DATABASE_URL" ? " ← active" : " (fallback)"),
        description: hasNeon
          ? "NEON_DATABASE_URL takes priority — this fallback is unused."
          : hasDbUrl
          ? "Active DB connection. Optionally set NEON_DATABASE_URL on Render for an explicit Neon instance."
          : "Not present in this environment.",
      },
      {
        key: "STORAGE_PROVIDER",
        set: gcsConfiguredInDb || storageProvider === "local",
        badge: gcsConfiguredInDb
          ? "✓ GCS ACTIVE"
          : storageProvider === "gcs"
          ? "⚠ INCOMPLETE"
          : "✓ LOCAL",
        badgeOk: gcsConfiguredInDb || storageProvider === "local",
        category: "optional",
        label: gcsConfiguredInDb
          ? `Storage: Google Cloud Storage  (bucket: ${gcsBucketName ?? "set"})`
          : storageProvider === "gcs"
          ? "Storage: GCS — credentials incomplete"
          : "Storage: Local Filesystem",
        description: gcsConfiguredInDb
          ? "GCS is active — images are stored persistently in Google Cloud Storage. Configured via Admin → Settings → File Storage (NOT via env vars — GOOGLE_CLIENT_ID is for OAuth login only)."
          : storageProvider === "gcs"
          ? "Storage is set to GCS but credentials are incomplete. Go to Admin → Settings → File Storage to finish setup."
          : "Using local filesystem — uploaded images will be lost on Render redeploy. To enable GCS: Admin → Settings → File Storage. " +
            "⚠️ GCS credentials are set via Admin Settings panel (NOT env vars). GOOGLE_CLIENT_ID is unrelated — it is only for Google social login.",
      },
    ],
  });
});

// ─── System Health — runs all live connectivity tests (admin only) ────────────

router.get("/admin/system-health", requireAdmin, async (_req, res): Promise<void> => {
  const has = (key: string) => !!process.env[key]?.trim();

  const hasNeon = has("NEON_DATABASE_URL");
  const hasDbUrl = has("DATABASE_URL");
  const activeDbSource = hasNeon ? "NEON_DATABASE_URL" : hasDbUrl ? "DATABASE_URL" : null;
  const dbUrl = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "";

  const dbResult = dbUrl
    ? await testDatabaseUrl(dbUrl)
    : { ok: false, error: "No database URL configured." };

  const emailConfigured = has("RESEND_API_KEY");
  const sessionOk = has("SESSION_SECRET");
  // GCS is configured via DB Admin Settings (not env vars) — query DB for real status
  let gcsConfiguredInDb = false;
  let dbStorageProvider = "local";
  let dbGcsBucketName: string | null = null;
  try {
    const [s] = await db
      .select({
        storageProvider: settingsTable.storageProvider,
        gcsBucketName: settingsTable.gcsBucketName,
        gcsPrivateKey: settingsTable.gcsPrivateKey,
        gcsKeyJson: settingsTable.gcsKeyJson,
      })
      .from(settingsTable)
      .limit(1);
    if (s) {
      dbStorageProvider = s.storageProvider ?? "local";
      dbGcsBucketName = s.gcsBucketName ?? null;
      gcsConfiguredInDb =
        dbStorageProvider === "gcs" &&
        !!(s.gcsBucketName && (s.gcsPrivateKey || s.gcsKeyJson));
    }
  } catch {
    // DB query failed — leave as local
  }

  const storageLabel = gcsConfiguredInDb
    ? `Google Cloud Storage (bucket: ${dbGcsBucketName ?? "set"})`
    : dbStorageProvider === "gcs"
    ? "GCS (credentials incomplete)"
    : "Local filesystem";

  res.json({
    timestamp: new Date().toISOString(),
    db: {
      ok: dbResult.ok,
      source: activeDbSource,
      message: dbResult.ok
        ? `Connected via ${activeDbSource}`
        : dbResult.error || "Connection failed",
    },
    email: {
      ok: emailConfigured,
      provider: emailConfigured ? "Resend" : null,
      message: emailConfigured
        ? "Resend configured — emails will be delivered"
        : "RESEND_API_KEY not set — OTP and transactional emails are disabled",
    },
    session: {
      ok: sessionOk,
      message: sessionOk
        ? "SESSION_SECRET set — logins are secure"
        : "SESSION_SECRET missing — user sessions will break",
    },
    storage: {
      ok: gcsConfiguredInDb || dbStorageProvider === "local",
      provider: storageLabel,
      message: gcsConfiguredInDb
        ? `GCS active — images are persistent (bucket: ${dbGcsBucketName ?? "set"})`
        : dbStorageProvider === "gcs"
        ? "GCS selected but credentials incomplete — go to Admin → Settings → File Storage"
        : "Using local filesystem — images will be lost on redeploy. Configure GCS in Admin → Settings → File Storage.",
    },
  });
});

// ─── Test Resend email (admin only) ──────────────────────────────────────────

router.post("/admin/test-email", requireAdmin, async (req, res): Promise<void> => {
  const { to } = req.body ?? {};
  if (!to || typeof to !== "string" || !to.includes("@")) {
    res.status(400).json({ ok: false, error: "A valid recipient email address is required." });
    return;
  }

  const resendConfigured = !!process.env.RESEND_API_KEY?.trim();
  if (!resendConfigured) {
    res.status(400).json({
      ok: false,
      error: "RESEND_API_KEY is not set. Add it to your environment variables and restart the server.",
    });
    return;
  }

  const html = `
    <h2 style="margin:0 0 8px;color:#FFFFFF;">✅ Test Email Successful</h2>
    <p style="margin:0 0 12px;color:#BBBBBB;">This email was sent from the <strong style="color:#FFAA00;">CODExSTOCKS admin panel</strong> to verify your Resend integration is working correctly.</p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;">
      <tr><td style="font-size:12px;color:#666;padding:8px 0;border-bottom:1px solid #1a1a1a;">Sent via</td><td style="font-size:13px;color:#fff;font-weight:600;padding:8px 0;border-bottom:1px solid #1a1a1a;text-align:right;">Resend API</td></tr>
      <tr><td style="font-size:12px;color:#666;padding:8px 0;border-bottom:1px solid #1a1a1a;">From</td><td style="font-size:13px;color:#fff;font-weight:600;padding:8px 0;border-bottom:1px solid #1a1a1a;text-align:right;">CODExSTOCKS &lt;noreply@codexstocks.org&gt;</td></tr>
      <tr><td style="font-size:12px;color:#666;padding:8px 0;">Time</td><td style="font-size:13px;color:#fff;font-weight:600;padding:8px 0;text-align:right;">${new Date().toLocaleString("en-PK", { timeZone: "Asia/Karachi" })} (PKT)</td></tr>
    </table>
    <p style="margin:16px 0 0;font-size:13px;color:#666;">Your email system is configured correctly. OTP, welcome, and password-reset emails will now reach your customers.</p>
  `;

  const result = await sendRawEmail(to.trim(), null, "CODExSTOCKS — Email Integration Test", html, "admin_test");

  if (result.ok) {
    req.log.info({ to }, "admin: test email sent successfully");
    res.json({ ok: true, message: `Test email sent to ${to.trim()}. Check your inbox (and spam folder).` });
  } else {
    req.log.warn({ to, error: result.error }, "admin: test email failed");
    res.status(500).json({ ok: false, error: result.error ?? "Failed to send test email." });
  }
});

// ─── Test current DB connection (admin only) ──────────────────────────────────

router.get("/admin/test-db-current", requireAdmin, async (_req, res): Promise<void> => {
  const result = await testDatabaseUrl(
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "",
  );
  if (result.ok) {
    res.json({ ok: true, message: "✅ Database connection successful — Neon is reachable." });
  } else {
    res.status(400).json({ ok: false, error: result.error || "Connection failed." });
  }
});

export default router;
