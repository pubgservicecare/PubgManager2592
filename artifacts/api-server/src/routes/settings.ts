import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

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

function getInitialAdminCredentials(): { adminUsername: string; adminPassword: string } {
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminUsername || !adminPassword) {
    throw new Error(
      "ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required for first-run setup.",
    );
  }
  return { adminUsername, adminPassword };
}

router.get("/settings", async (_req, res): Promise<void> => {
  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values(getInitialAdminCredentials()).returning();
  }
  const { adminPassword: _pw, ...safeSettings } = settings;
  res.json(safeSettings);
});

router.patch("/settings", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body ?? {};

  let [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    [settings] = await db.insert(settingsTable).values(getInitialAdminCredentials()).returning();
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
  if (body.adminPassword) updates.adminPassword = body.adminPassword;

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
    if (updates[k] === null) delete updates[k];
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

export default router;
