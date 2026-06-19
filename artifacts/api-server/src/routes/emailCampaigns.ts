import { Router, type IRouter } from "express";
import { desc, eq, sql, isNull } from "drizzle-orm";
import {
  db,
  emailCampaignsTable,
  emailLogsTable,
  customerUsersTable,
  customersTable,
  accountsTable,
} from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { sendCampaignEmail, sendRawEmail } from "../lib/email";

const router: IRouter = Router();

// ─── GET /admin/email/stats ──────────────────────────────────────────────────

router.get("/admin/email/stats", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(emailLogsTable);
    const [{ failed }] = await db
      .select({ failed: sql<number>`count(*)::int` })
      .from(emailLogsTable)
      .where(eq(emailLogsTable.status, "failed"));
    const [{ campaigns }] = await db
      .select({ campaigns: sql<number>`count(*)::int` })
      .from(emailCampaignsTable);
    const [{ sent_campaigns }] = await db
      .select({ sent_campaigns: sql<number>`count(*)::int` })
      .from(emailCampaignsTable)
      .where(eq(emailCampaignsTable.status, "sent"));
    res.json({ totalEmails: total, failedEmails: failed, totalCampaigns: campaigns, sentCampaigns: sent_campaigns });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch email stats" });
  }
});

// ─── GET /admin/email/logs ───────────────────────────────────────────────────

router.get("/admin/email/logs", requireAdmin, async (req, res): Promise<void> => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit || "50")), 200);
    const offset = parseInt(String(req.query.offset || "0"));
    const type = req.query.type as string | undefined;

    const logs = await db
      .select()
      .from(emailLogsTable)
      .where(type ? eq(emailLogsTable.emailType, type) : undefined)
      .orderBy(desc(emailLogsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(emailLogsTable)
      .where(type ? eq(emailLogsTable.emailType, type) : undefined);

    res.json({ logs, total: count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch email logs" });
  }
});

// ─── POST /admin/email/send-single ──────────────────────────────────────────

router.post("/admin/email/send-single", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { to, name, subject, htmlContent } = req.body;
    if (!to || !subject || !htmlContent) {
      res.status(400).json({ error: "to, subject, and htmlContent are required" });
      return;
    }
    if (!to.includes("@")) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }

    const result = await sendRawEmail(to, name || null, subject, htmlContent, "admin_single");
    if (!result.ok) {
      res.status(500).json({ error: result.error || "Failed to send email" });
      return;
    }
    res.json({ sent: true, to });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email" });
  }
});

// ─── POST /admin/email/send-bulk ─────────────────────────────────────────────
// target: "all" | "buyers"
// Sends in batches, non-blocking for each recipient (fire-and-collect).

router.post("/admin/email/send-bulk", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { target, subject, htmlContent } = req.body;
    if (!target || !subject || !htmlContent) {
      res.status(400).json({ error: "target, subject, and htmlContent are required" });
      return;
    }
    if (!["all", "buyers"].includes(target)) {
      res.status(400).json({ error: "target must be 'all' or 'buyers'" });
      return;
    }

    // Collect recipients
    let recipients: { email: string; name: string | null }[] = [];

    if (target === "all") {
      // All customers with email
      const users = await db
        .select({ email: customerUsersTable.email, name: customerUsersTable.name })
        .from(customerUsersTable)
        .where(sql`${customerUsersTable.email} IS NOT NULL AND ${customerUsersTable.deletedAt} IS NULL`);
      recipients = users.filter((u) => u.email).map((u) => ({ email: u.email!, name: u.name }));
    } else {
      // buyers = customers who have purchased at least one account
      const buyers = await db
        .select({
          email: customerUsersTable.email,
          name: customerUsersTable.name,
        })
        .from(customerUsersTable)
        .innerJoin(customersTable, eq(customersTable.id, customerUsersTable.customerId))
        .innerJoin(accountsTable, eq(accountsTable.customerId, customersTable.id))
        .where(
          sql`${customerUsersTable.email} IS NOT NULL AND ${customerUsersTable.deletedAt} IS NULL`,
        );
      const seen = new Set<string>();
      for (const b of buyers) {
        if (b.email && !seen.has(b.email)) {
          seen.add(b.email);
          recipients.push({ email: b.email, name: b.name });
        }
      }
    }

    if (recipients.length === 0) {
      res.json({ sent: 0, failed: 0, total: 0, message: "No recipients with email addresses found" });
      return;
    }

    // Send in batches of 10 (rate limiting)
    let sent = 0;
    let failed = 0;
    const BATCH = 10;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((r) => sendCampaignEmail(r.email, r.name, subject, htmlContent)),
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.ok) sent++;
        else failed++;
      }
      // Small delay between batches to respect rate limits
      if (i + BATCH < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    res.json({ sent, failed, total: recipients.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to send bulk email" });
  }
});

// ─── GET /admin/email/campaigns ──────────────────────────────────────────────

router.get("/admin/email/campaigns", requireAdmin, async (_req, res): Promise<void> => {
  try {
    const campaigns = await db
      .select()
      .from(emailCampaignsTable)
      .orderBy(desc(emailCampaignsTable.createdAt));
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// ─── POST /admin/email/campaigns ─────────────────────────────────────────────

router.post("/admin/email/campaigns", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { title, subject, htmlContent, target } = req.body;
    if (!title || !subject || !htmlContent) {
      res.status(400).json({ error: "title, subject, and htmlContent are required" });
      return;
    }

    const [campaign] = await db
      .insert(emailCampaignsTable)
      .values({
        title: String(title).trim(),
        subject: String(subject).trim(),
        htmlContent: String(htmlContent),
        target: ["all", "buyers"].includes(target) ? target : "all",
        status: "draft",
      })
      .returning();

    res.status(201).json(campaign);
  } catch (err) {
    res.status(500).json({ error: "Failed to create campaign" });
  }
});

// ─── GET /admin/email/campaigns/:id ─────────────────────────────────────────

router.get("/admin/email/campaigns/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [campaign] = await db
      .select()
      .from(emailCampaignsTable)
      .where(eq(emailCampaignsTable.id, id));
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

// ─── PUT /admin/email/campaigns/:id ─────────────────────────────────────────

router.put("/admin/email/campaigns/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [campaign] = await db
      .select()
      .from(emailCampaignsTable)
      .where(eq(emailCampaignsTable.id, id));
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    if (campaign.status === "sent") {
      res.status(400).json({ error: "Cannot edit a campaign that has already been sent" });
      return;
    }

    const { title, subject, htmlContent, target } = req.body;
    const [updated] = await db
      .update(emailCampaignsTable)
      .set({
        ...(title ? { title: String(title).trim() } : {}),
        ...(subject ? { subject: String(subject).trim() } : {}),
        ...(htmlContent ? { htmlContent: String(htmlContent) } : {}),
        ...(target && ["all", "buyers"].includes(target) ? { target } : {}),
      })
      .where(eq(emailCampaignsTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update campaign" });
  }
});

// ─── DELETE /admin/email/campaigns/:id ──────────────────────────────────────

router.delete("/admin/email/campaigns/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [campaign] = await db
      .select()
      .from(emailCampaignsTable)
      .where(eq(emailCampaignsTable.id, id));
    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    if (campaign.status === "sent") {
      res.status(400).json({ error: "Cannot delete a sent campaign" });
      return;
    }
    await db.delete(emailCampaignsTable).where(eq(emailCampaignsTable.id, id));
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete campaign" });
  }
});

// ─── POST /admin/email/campaigns/:id/send ────────────────────────────────────

router.post("/admin/email/campaigns/:id/send", requireAdmin, async (req, res): Promise<void> => {
  try {
    const id = parseInt(req.params.id, 10);
    const [campaign] = await db
      .select()
      .from(emailCampaignsTable)
      .where(eq(emailCampaignsTable.id, id));

    if (!campaign) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }
    if (campaign.status === "sent") {
      res.status(400).json({ error: "Campaign already sent" });
      return;
    }

    // Collect recipients based on target
    let recipients: { email: string; name: string | null }[] = [];
    if (campaign.target === "buyers") {
      const buyers = await db
        .select({ email: customerUsersTable.email, name: customerUsersTable.name })
        .from(customerUsersTable)
        .innerJoin(customersTable, eq(customersTable.id, customerUsersTable.customerId))
        .innerJoin(accountsTable, eq(accountsTable.customerId, customersTable.id))
        .where(sql`${customerUsersTable.email} IS NOT NULL AND ${customerUsersTable.deletedAt} IS NULL`);
      const seen = new Set<string>();
      for (const b of buyers) {
        if (b.email && !seen.has(b.email)) { seen.add(b.email); recipients.push({ email: b.email, name: b.name }); }
      }
    } else {
      const users = await db
        .select({ email: customerUsersTable.email, name: customerUsersTable.name })
        .from(customerUsersTable)
        .where(sql`${customerUsersTable.email} IS NOT NULL AND ${customerUsersTable.deletedAt} IS NULL`);
      recipients = users.filter((u) => u.email).map((u) => ({ email: u.email!, name: u.name }));
    }

    // Send in batches
    let sent = 0;
    let failed = 0;
    const BATCH = 10;
    for (let i = 0; i < recipients.length; i += BATCH) {
      const batch = recipients.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map((r) => sendCampaignEmail(r.email, r.name, campaign.subject, campaign.htmlContent, campaign.id)),
      );
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.ok) sent++;
        else failed++;
      }
      if (i + BATCH < recipients.length) await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const [updated] = await db
      .update(emailCampaignsTable)
      .set({ status: "sent", sentCount: sent, failedCount: failed, sentAt: new Date() })
      .where(eq(emailCampaignsTable.id, id))
      .returning();

    res.json({ sent, failed, total: recipients.length, campaign: updated });
  } catch (err) {
    res.status(500).json({ error: "Failed to send campaign" });
  }
});

export default router;
