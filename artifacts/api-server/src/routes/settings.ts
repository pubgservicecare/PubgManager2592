import { Router, type IRouter } from "express";
import { db, settingsTable, testDatabaseUrl } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";
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

  res.json({
    nodeEnv: process.env.NODE_ENV || "development",
    isProduction: process.env.NODE_ENV === "production",
    vars: [
      // ── Critical — app won't work without these ──────────────────────────
      {
        key: "NEON_DATABASE_URL",
        set: has("NEON_DATABASE_URL"),
        category: "critical",
        label: "Neon Database URL",
        description: "Primary Neon PostgreSQL connection string. Takes priority over DATABASE_URL. App won't start without a DB.",
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
      // ── Optional — for advanced features ────────────────────────────────
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
      {
        key: "DATABASE_URL",
        set: has("DATABASE_URL"),
        category: "optional",
        label: "Database URL (Replit fallback)",
        description: "Replit-managed PostgreSQL. Used automatically as fallback if NEON_DATABASE_URL is not set.",
      },
      // ── Email / Resend ────────────────────────────────────────────────────
      {
        key: "RESEND_API_KEY",
        set: has("RESEND_API_KEY"),
        category: "feature",
        label: "Resend API Key",
        description: "API key from resend.com. Used to send OTP, welcome, password-reset, and transactional emails. Get it from resend.com/api-keys.",
      },
    ],
  });
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
