import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, accountLinksTable, accountsTable, historyTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function isPending(linkStatus: string, accountStatus: string): boolean {
  if (linkStatus === "old_owner") return true;
  if ((accountStatus === "sold" || accountStatus === "installment") && linkStatus === "my_controlled") return true;
  return false;
}

function formatLink(l: any, accountStatus: string) {
  return {
    id: l.id,
    accountId: l.accountId,
    type: l.type,
    login: l.login,
    password: l.password,
    value: l.value,
    status: l.status,
    isPending: isPending(l.status, accountStatus),
    createdAt: l.createdAt.toISOString(),
  };
}

router.get("/accounts/:id/links", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const links = await db.select().from(accountLinksTable).where(eq(accountLinksTable.accountId, id));
  res.json(links.map((l) => formatLink(l, account.status)));
});

router.post("/accounts/:id/links", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { type, login, password, value, status } = req.body;
  if (!type || !status) {
    res.status(400).json({ error: "type and status are required" });
    return;
  }
  if (!login) {
    res.status(400).json({ error: "login is required" });
    return;
  }
  if (!password) {
    res.status(400).json({ error: "password is required" });
    return;
  }

  if (account.status === "active" && status === "transferred") {
    res.status(400).json({ error: "Cannot set transferred status on active account" });
    return;
  }

  const [link] = await db.insert(accountLinksTable).values({
    accountId: id,
    type,
    login: login || "",
    password: password || "",
    value: value || login || "",
    status,
  }).returning();

  await db.insert(historyTable).values({
    accountId: id,
    action: "Link added",
    details: `${type}: ${login} (${status})`,
  });

  res.status(201).json(formatLink(link, account.status));
});

router.patch("/accounts/:id/links/:linkId", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawLinkId = Array.isArray(req.params.linkId) ? req.params.linkId[0] : req.params.linkId;
  const id = parseInt(rawId, 10);
  const linkId = parseInt(rawLinkId, 10);

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { type, login, password, value, status } = req.body;
  if (account.status === "active" && status === "transferred") {
    res.status(400).json({ error: "Cannot set transferred status on active account" });
    return;
  }

  const updates: Record<string, string> = {};
  if (type !== undefined) updates.type = type;
  if (login !== undefined) updates.login = login;
  if (password !== undefined) updates.password = password;
  if (value !== undefined) updates.value = value;
  else if (login !== undefined) updates.value = login;
  if (status !== undefined) updates.status = status;

  const [updated] = await db
    .update(accountLinksTable)
    .set(updates)
    .where(and(eq(accountLinksTable.id, linkId), eq(accountLinksTable.accountId, id)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  await db.insert(historyTable).values({
    accountId: id,
    action: "Link updated",
    details: `${updated.type}: ${updated.login} (${updated.status})`,
  });

  res.json(formatLink(updated, account.status));
});

router.delete("/accounts/:id/links/:linkId", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawLinkId = Array.isArray(req.params.linkId) ? req.params.linkId[0] : req.params.linkId;
  const id = parseInt(rawId, 10);
  const linkId = parseInt(rawLinkId, 10);

  const [deleted] = await db
    .delete(accountLinksTable)
    .where(and(eq(accountLinksTable.id, linkId), eq(accountLinksTable.accountId, id)))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  await db.insert(historyTable).values({
    accountId: id,
    action: "Link deleted",
    details: `${deleted.type}: ${deleted.login}`,
  });

  res.sendStatus(204);
});

export default router;
