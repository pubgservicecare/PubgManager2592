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

router.get("/admin/env-check", requireAdmin, (_req, res): void => {
  const has = (key: string) => !!process.env[key]?.trim();

  const hasNeon = has("NEON_DATABASE_URL");
  const hasDbUrl = has("DATABASE_URL");
  const activeDbSource: string | null = hasNeon ? "NEON_DATABASE_URL" : hasDbUrl ? "DATABASE_URL" : null;

  // NEON_DATABASE_URL is only "critical" if DATABASE_URL is also absent (no fallback).
  // If DATABASE_URL exists as fallback, NEON is merely the preferred/recommended choice.
  const neonCategory: "critical" | "feature" | "optional" = hasDbUrl ? "feature" : "critical";
  // DATABASE_URL is "critical" when it is the active DB source (NEON not set).
  const dbUrlCategory: "critical" | "feature" | "optional" = hasNeon ? "optional" : "critical";

  res.json({
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    activeDbSource,
    vars: [
      // ── Critical — app won't work without these ──────────────────────────
      {
        key: "NEON_DATABASE_URL",
        set: hasNeon,
        category: neonCategory,
        label: "Neon Database URL" + (activeDbSource === "NEON_DATABASE_URL" ? " ← active" : ""),
        description: hasDbUrl
          ? `Recommended explicit Neon PostgreSQL URL. Currently using DATABASE_URL as the active connection — app is connected. Set this on Render for a dedicated Neon instance.`
          : "Primary Neon PostgreSQL connection string. App uses DATABASE_URL as fallback, but neither is set — app will crash on startup.",
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
        description: "API key from resend.com. Used to send OTP, welcome, password-reset, and transactional emails. Get it from resend.com/api-keys.",
      },
      {
        key: "GOOGLE_CLIENT_ID",
        set: has("GOOGLE_CLIENT_ID"),
        category: "feature",
        label: "Google Client ID",
        description: "Enables 'Continue with Google' button on login/signup pages. Get it from Google Cloud Console → Credentials.",
      },
      {
        key: "SITE_URL",
        set: has("SITE_URL"),
        category: "feature",
        label: "Site URL",
        description: "Canonical domain e.g. https://www.codexstocks.org — used in sitemap.xml and SEO canonical tags.",
      },
      {
        key: "SAME_ORIGIN_DEPLOYMENT",
        set: has("SAME_ORIGIN_DEPLOYMENT"),
        category: "feature",
        label: "Same Origin Deployment",
        description: "Set to 'true' on Render to fix mobile iOS Safari login. Without it, iPhone users may fail to log in.",
      },
      {
        key: "FRONTEND_URL",
        set: has("FRONTEND_URL"),
        category: "feature",
        label: "Frontend URL (CORS)",
        description: "Comma-separated allowed CORS origins. Only needed in cross-origin mode (separate frontend + backend domains).",
      },
      // ── Optional ─────────────────────────────────────────────────────────
      {
        key: "DATABASE_URL",
        set: hasDbUrl,
        category: dbUrlCategory,
        label: "Database URL (Replit / fallback)" + (activeDbSource === "DATABASE_URL" ? " ← active" : ""),
        description: hasNeon
          ? "Replit-managed PostgreSQL fallback. NEON_DATABASE_URL takes priority — this is unused."
          : hasDbUrl
          ? "Active database connection. Set NEON_DATABASE_URL on Render for an explicit Neon instance."
          : "Replit auto-provisions this. Not present in this environment.",
      },
      {
        key: "GCS_BUCKET",
        set: has("GCS_BUCKET"),
        category: "optional",
        label: "GCS Bucket",
        description: "Google Cloud Storage bucket name for persistent image storage. Uses local filesystem (lost on redeploy) if not set.",
      },
      {
        key: "GCS_CREDENTIALS",
        set: has("GCS_CREDENTIALS"),
        category: "optional",
        label: "GCS Credentials",
        description: "Base64-encoded Google Cloud service account JSON. Required for GCS image uploads.",
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
  const gcsConfigured = has("GCS_BUCKET") && has("GCS_CREDENTIALS");

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
      ok: gcsConfigured,
      provider: gcsConfigured ? "Google Cloud Storage" : "Local filesystem",
      message: gcsConfigured
        ? "GCS configured — uploads are persistent"
        : "Using local filesystem — uploaded images will be lost on redeploy",
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
