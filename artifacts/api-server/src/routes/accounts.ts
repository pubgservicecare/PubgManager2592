import { Router, type IRouter } from "express";
import { eq, desc, isNull, and, inArray, sql } from "drizzle-orm";
import { db, accountsTable, accountLinksTable, paymentsTable, customersTable, historyTable, sellersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { logActivity } from "../lib/activityLog";

const router: IRouter = Router();

const PUBLIC_VISIBLE_STATUSES = new Set(["active"]);

function isPending(linkStatus: string, accountStatus: string): boolean {
  if (linkStatus === "old_owner") return true;
  if ((accountStatus === "sold" || accountStatus === "installment") && linkStatus === "my_controlled") return true;
  return false;
}

async function attachSellerName(account: any): Promise<string | null> {
  if (!account.sellerId) return null;
  const [s] = await db.select().from(sellersTable).where(eq(sellersTable.id, account.sellerId));
  return s?.name ?? null;
}

async function attachSellerUsername(account: any): Promise<string | null> {
  if (!account.sellerId) return null;
  const [s] = await db.select({ username: sellersTable.username }).from(sellersTable).where(eq(sellersTable.id, account.sellerId));
  return s?.username ?? null;
}

async function buildAccountResponse(account: any, isAdmin = true) {
  const links = await db.select().from(accountLinksTable).where(eq(accountLinksTable.accountId, account.id));
  const linksWithPending = links.map((l) => ({
    ...l,
    isPending: isPending(l.status, account.status),
    createdAt: l.createdAt.toISOString(),
  }));
  const pendingLinksCount = linksWithPending.filter((l) => l.isPending).length;

  let totalPaid = null;
  let remainingAmount = null;
  let nextDueDate: string | null = null;
  let overdueCount = 0;
  let dueSoonCount = 0;

  if (account.status === "installment" && account.finalSoldPrice) {
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.accountId, account.id));
    totalPaid = 0;
    for (const p of payments) {
      if (!p.paidAt) continue;
      const a = parseFloat(p.amount as string);
      totalPaid += p.isReversal ? -a : a;
    }
    remainingAmount = Math.max(0, parseFloat(account.finalSoldPrice as string) - totalPaid);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDays = new Date(today);
    sevenDays.setDate(sevenDays.getDate() + 7);

    const upcoming = payments
      .filter((p) => !p.paidAt && !p.isReversal && p.dueDate)
      .map((p) => ({ ...p, _due: new Date(p.dueDate as any) }))
      .sort((a, b) => a._due.getTime() - b._due.getTime());

    if (upcoming.length > 0) {
      nextDueDate = (upcoming[0].dueDate as any) ?? null;
      overdueCount = upcoming.filter((p) => p._due < today).length;
      dueSoonCount = upcoming.filter((p) => p._due >= today && p._due <= sevenDays).length;
    }
  }

  const result: any = {
    id: account.id,
    title: account.title,
    accountId: account.accountId,
    priceForSale: parseFloat(account.priceForSale as string),
    purchaseDate: isAdmin ? account.purchaseDate : null,
    previousOwnerContact: isAdmin ? account.previousOwnerContact : null,
    videoUrl: account.videoUrl,
    imageUrls: account.imageUrls || [],
    description: account.description,
    status: account.status,
    visibility: account.visibility || "public",
    customerId: isAdmin ? account.customerId : null,
    customerName: isAdmin ? account.customerName : null,
    customerContact: isAdmin ? account.customerContact : null,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString(),
    links: isAdmin ? linksWithPending : [],
    pendingLinksCount,
    totalPaid,
    remainingAmount,
    nextDueDate,
    overdueCount,
    dueSoonCount,
    isFeatured: !!account.isFeatured,
    featuredOrder: account.featuredOrder ?? null,
    viewCount: account.viewCount ?? 0,
  };

  if (isAdmin) {
    const sellerName = await attachSellerName(account);
    const sellerUsername = await attachSellerUsername(account);
    result.sellerId = account.sellerId;
    result.sellerName = sellerName;
    result.sellerUsername = sellerUsername;
    result.purchasePrice = account.purchasePrice ? parseFloat(account.purchasePrice as string) : null;
    result.finalSoldPrice = account.finalSoldPrice ? parseFloat(account.finalSoldPrice as string) : null;
  } else {
    // Public: never expose real seller name/id, only their chosen public username
    const sellerUsername = await attachSellerUsername(account);
    result.sellerId = null;
    result.sellerName = null;
    result.sellerUsername = sellerUsername;
  }

  return result;
}

router.get("/accounts", async (req, res): Promise<void> => {
  const isPublic = req.query.public === "true";
  const isAdmin = (req as any).session?.isAdmin;
  const statusFilter = req.query.status as string;
  const listedBy = req.query.listedBy as string | undefined;
  const sellerIdQ = req.query.sellerId ? parseInt(req.query.sellerId as string, 10) : null;
  const sort = (req.query.sort as string) || "newest";

  const accounts = await db
    .select()
    .from(accountsTable)
    .where(isNull(accountsTable.deletedAt))
    .orderBy(desc(accountsTable.createdAt));

  let filtered = accounts;
  if (isPublic || !isAdmin) {
    filtered = accounts.filter((a) => PUBLIC_VISIBLE_STATUSES.has(a.status) && (a.visibility ?? "public") === "public");
  } else {
    if (statusFilter) filtered = filtered.filter((a) => a.status === statusFilter);
    if (listedBy === "admin") filtered = filtered.filter((a) => a.sellerId === null);
    else if (listedBy === "seller") filtered = filtered.filter((a) => a.sellerId !== null);
    if (sellerIdQ) filtered = filtered.filter((a) => a.sellerId === sellerIdQ);
  }

  const priceOf = (a: any) => parseFloat(a.priceForSale as string) || 0;
  const dateOf = (a: any) => new Date(a.createdAt as any).getTime();

  // Featured first (only for public/listing view)
  filtered.sort((a, b) => {
    const af = (a.isFeatured ?? 0) > 0 ? 1 : 0;
    const bf = (b.isFeatured ?? 0) > 0 ? 1 : 0;
    if (af !== bf) return bf - af;
    if (af === 1) {
      const ao = a.featuredOrder ?? 9999;
      const bo = b.featuredOrder ?? 9999;
      if (ao !== bo) return ao - bo;
    }
    switch (sort) {
      case "price_asc": return priceOf(a) - priceOf(b);
      case "price_desc": return priceOf(b) - priceOf(a);
      case "oldest": return dateOf(a) - dateOf(b);
      case "popular": return (b.viewCount ?? 0) - (a.viewCount ?? 0);
      case "newest":
      default: return dateOf(b) - dateOf(a);
    }
  });

  const result = await Promise.all(filtered.map((a) => buildAccountResponse(a, isAdmin && !isPublic)));
  res.json(result);
});

// Public: recently sold (last 30 days, sold or installment)
router.get("/accounts-recently-sold", async (_req, res): Promise<void> => {
  const all = await db
    .select()
    .from(accountsTable)
    .where(isNull(accountsTable.deletedAt))
    .orderBy(desc(accountsTable.updatedAt));

  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const recent = all
    .filter((a) => (a.status === "sold" || a.status === "installment") && a.updatedAt.getTime() >= cutoff)
    .slice(0, 12);

  res.json(
    recent.map((a) => ({
      id: a.id,
      title: a.title,
      priceForSale: parseFloat(a.priceForSale as string),
      status: a.status,
      imageUrls: a.imageUrls || [],
      soldAt: a.updatedAt.toISOString(),
    }))
  );
});

// Public: track view (best-effort, non-fatal)
router.post("/accounts/:id/view", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.execute(sql`UPDATE accounts SET view_count = view_count + 1 WHERE id = ${id}`);
  } catch (e) {
    req.log.warn({ err: e }, "view increment failed");
  }
  res.json({ ok: true });
});

// Admin: toggle featured / set order
router.patch("/accounts/:id/feature", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const { isFeatured, featuredOrder } = req.body || {};
  const updates: Record<string, any> = {};
  if (isFeatured !== undefined) updates.isFeatured = isFeatured ? 1 : 0;
  if (featuredOrder !== undefined) updates.featuredOrder = featuredOrder === null ? null : Number(featuredOrder);
  const [updated] = await db.update(accountsTable).set(updates).where(eq(accountsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  await db.insert(historyTable).values({ accountId: id, action: `Featured updated`, details: JSON.stringify(updates) });
  res.json(await buildAccountResponse(updated, true));
});

// Admin: bulk operations
router.post("/accounts/bulk", requireAdmin, async (req, res): Promise<void> => {
  const { ids, action, value } = req.body || {};
  if (!Array.isArray(ids) || ids.length === 0) {
    res.status(400).json({ error: "ids array required" });
    return;
  }
  const cleanIds = ids.map((x) => Number(x)).filter((x) => Number.isFinite(x));
  if (cleanIds.length === 0) {
    res.status(400).json({ error: "no valid ids" });
    return;
  }
  let updates: Record<string, any> | null = null;
  let softDelete = false;
  switch (action) {
    case "set_status_active": updates = { status: "active" }; break;
    case "set_status_hidden": updates = { status: "hidden" }; break;
    case "set_status_reserved": updates = { status: "reserved" }; break;
    case "set_status_under_review": updates = { status: "under_review" }; break;
    case "set_price": {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) {
        res.status(400).json({ error: "valid price required" });
        return;
      }
      updates = { priceForSale: n.toString() };
      break;
    }
    case "feature": updates = { isFeatured: 1 }; break;
    case "unfeature": updates = { isFeatured: 0, featuredOrder: null }; break;
    case "delete": softDelete = true; break;
    default:
      res.status(400).json({ error: "unknown action" });
      return;
  }

  let affected = 0;
  if (softDelete) {
    const r = await db
      .update(accountsTable)
      .set({ deletedAt: new Date() })
      .where(and(isNull(accountsTable.deletedAt), inArray(accountsTable.id, cleanIds)));
    affected = (r as any).rowCount ?? cleanIds.length;
  } else if (updates) {
    const r = await db
      .update(accountsTable)
      .set(updates)
      .where(and(isNull(accountsTable.deletedAt), inArray(accountsTable.id, cleanIds)));
    affected = (r as any).rowCount ?? cleanIds.length;
  }

  const adminUser = (req.session as any).username || "admin";
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: `Bulk action: ${action}`,
    targetType: "account",
    details: `${cleanIds.length} accounts`,
  });

  res.json({ ok: true, affected, action, ids: cleanIds });
});

router.post("/accounts", requireAdmin, async (req, res): Promise<void> => {
  const { title, accountId, purchasePrice, priceForSale, purchaseDate, previousOwnerContact, videoUrl, imageUrls, description } = req.body;
  if (!title || !accountId || !priceForSale) {
    res.status(400).json({ error: "title, accountId, and priceForSale are required" });
    return;
  }

  const [account] = await db.insert(accountsTable).values({
    title,
    accountId,
    purchasePrice: purchasePrice?.toString(),
    priceForSale: priceForSale.toString(),
    purchaseDate,
    previousOwnerContact,
    videoUrl,
    imageUrls: Array.isArray(imageUrls) ? imageUrls : null,
    description,
    status: "active",
  }).returning();

  await db.insert(historyTable).values({ accountId: account.id, action: "Account created", details: `Title: ${title}` });

  const adminUser = (req.session as any).username || "admin";
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: "Account created",
    targetType: "account",
    targetId: account.id,
    details: title,
  });

  res.status(201).json(await buildAccountResponse(account, true));
});

router.get("/accounts/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const isPublic = req.query.public === "true";
  const isAdmin = (req as any).session?.isAdmin;

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account || account.deletedAt) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  if ((isPublic || !isAdmin) && (!PUBLIC_VISIBLE_STATUSES.has(account.status) || (account.visibility ?? "public") !== "public")) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json(await buildAccountResponse(account, isAdmin && !isPublic));
});

router.patch("/accounts/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { title, accountId, purchasePrice, priceForSale, purchaseDate, previousOwnerContact, videoUrl, imageUrls, description, status } = req.body;
  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (accountId !== undefined) updates.accountId = accountId;
  if (purchasePrice !== undefined) updates.purchasePrice = purchasePrice?.toString();
  if (priceForSale !== undefined) updates.priceForSale = priceForSale.toString();
  if (purchaseDate !== undefined) updates.purchaseDate = purchaseDate;
  if (previousOwnerContact !== undefined) updates.previousOwnerContact = previousOwnerContact;
  if (videoUrl !== undefined) updates.videoUrl = videoUrl;
  if (imageUrls !== undefined) updates.imageUrls = Array.isArray(imageUrls) ? imageUrls : null;
  if (description !== undefined) updates.description = description;
  if (status !== undefined && ["active", "reserved", "under_review", "hidden"].includes(status)) {
    updates.status = status;
  }

  const [updated] = await db.update(accountsTable).set(updates).where(eq(accountsTable.id, id)).returning();
  await db.insert(historyTable).values({ accountId: id, action: "Account updated", details: JSON.stringify(updates) });

  const adminUser = (req.session as any).username || "admin";
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: "Account updated",
    targetType: "account",
    targetId: id,
    details: Object.keys(updates).join(", "),
  });

  res.json(await buildAccountResponse(updated, true));
});

router.patch("/accounts/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { status } = req.body;
  const allowed = ["active", "reserved", "under_review", "hidden"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: "Invalid status. Must be one of: " + allowed.join(", ") });
    return;
  }

  const [existing] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  if (existing.status === "sold" || existing.status === "installment") {
    res.status(400).json({ error: "Cannot change status of a sold/installment account" });
    return;
  }

  const [updated] = await db.update(accountsTable).set({ status }).where(eq(accountsTable.id, id)).returning();
  await db.insert(historyTable).values({ accountId: id, action: `Status changed to ${status}` });
  const adminUser = (req.session as any).username || "admin";
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: `Account status changed to ${status}`,
    targetType: "account",
    targetId: id,
    details: `${existing.title}`,
  });

  res.json(await buildAccountResponse(updated, true));
});

router.delete("/accounts/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [existing] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  await db.update(accountsTable).set({ deletedAt: new Date(), status: "hidden" }).where(eq(accountsTable.id, id));

  const adminUser = (req.session as any).username || "admin";
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: "Account deleted (soft)",
    targetType: "account",
    targetId: id,
    details: existing.title,
  });

  res.sendStatus(204);
});

router.post("/accounts/:id/sell", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account || account.deletedAt) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { customerName, customerContact, finalSoldPrice, paymentType } = req.body;
  if (!customerName || !customerContact || !finalSoldPrice || !paymentType) {
    res.status(400).json({ error: "customerName, customerContact, finalSoldPrice, and paymentType are required" });
    return;
  }

  let customer = (await db.select().from(customersTable).where(eq(customersTable.contact, customerContact)))[0];
  if (!customer) {
    [customer] = await db.insert(customersTable).values({ name: customerName, contact: customerContact }).returning();
  }

  const newStatus = paymentType === "full" ? "sold" : "installment";
  const [updated] = await db.update(accountsTable).set({
    status: newStatus,
    finalSoldPrice: finalSoldPrice.toString(),
    customerId: customer.id,
    customerName,
    customerContact,
  }).where(eq(accountsTable.id, id)).returning();

  if (paymentType === "full") {
    await db.insert(paymentsTable).values({ accountId: id, amount: finalSoldPrice.toString(), note: "Full payment" });
  }

  await db.insert(historyTable).values({
    accountId: id,
    action: "Account sold",
    details: `Customer: ${customerName}, Price: ${finalSoldPrice}, Type: ${paymentType}`,
  });

  const adminUser = (req.session as any).username || "admin";
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: `Account sold (${paymentType})`,
    targetType: "account",
    targetId: id,
    details: `${account.title} → ${customerName} for ${finalSoldPrice}`,
  });

  res.json(await buildAccountResponse(updated, true));
});

router.get("/dashboard", requireAdmin, async (_req, res): Promise<void> => {
  // Admin dashboard reflects ONLY admin-listed accounts (sellerId IS NULL).
  // Seller listings have their own per-seller dashboard at /api/admin/sellers/:id/dashboard.
  const accounts = (
    await db.select().from(accountsTable).where(isNull(accountsTable.deletedAt))
  ).filter((a) => a.sellerId === null);
  const links = await db.select().from(accountLinksTable);
  const payments = await db.select().from(paymentsTable);

  const activeAccounts = accounts.filter((a) => a.status === "active");
  const soldAccounts = accounts.filter((a) => a.status === "sold");
  const installmentAccounts = accounts.filter((a) => a.status === "installment");

  const totalInvestment = accounts.reduce((s, a) => s + (a.purchasePrice ? parseFloat(a.purchasePrice as string) : 0), 0);
  const totalRevenue = accounts
    .filter((a) => a.status === "sold" || a.status === "installment")
    .reduce((s, a) => s + (a.finalSoldPrice ? parseFloat(a.finalSoldPrice as string) : 0), 0);
  const netProfit = totalRevenue - totalInvestment;

  const pendingLinksCount = links.filter((l) => {
    const acc = accounts.find((a) => a.id === l.accountId);
    if (!acc) return false;
    return isPending(l.status, acc.status);
  }).length;

  let pendingPaymentsCount = 0;
  for (const acc of installmentAccounts) {
    const accPayments = payments.filter((p) => p.accountId === acc.id);
    let totalPaid = 0;
    for (const p of accPayments) {
      if (!p.paidAt) continue;
      const a = parseFloat(p.amount as string);
      totalPaid += p.isReversal ? -a : a;
    }
    const remaining = acc.finalSoldPrice ? parseFloat(acc.finalSoldPrice as string) - totalPaid : 0;
    if (remaining > 0) pendingPaymentsCount++;
  }

  // Due-payments alerts (overdue + due-soon within 7 days), admin-listed installment accounts only
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);

  const accountIdSet = new Set(installmentAccounts.map((a) => a.id));
  const upcomingPayments = payments
    .filter((p) => accountIdSet.has(p.accountId) && !p.paidAt && !p.isReversal && p.dueDate)
    .map((p) => ({ p, due: new Date(p.dueDate as any) }));

  const accountById = new Map(installmentAccounts.map((a) => [a.id, a] as const));
  const formatAlert = (entry: { p: any; due: Date }) => {
    const acc = accountById.get(entry.p.accountId);
    return {
      paymentId: entry.p.id,
      accountId: entry.p.accountId,
      accountTitle: acc?.title ?? "—",
      accountAccountId: acc?.accountId ?? "",
      customerName: acc?.customerName ?? null,
      customerContact: acc?.customerContact ?? null,
      amount: parseFloat(entry.p.amount as string),
      dueDate: entry.p.dueDate,
      daysUntilDue: Math.round((entry.due.getTime() - today.getTime()) / 86400000),
    };
  };

  const overdue = upcomingPayments
    .filter((e) => e.due < today)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .map(formatAlert);
  const dueSoon = upcomingPayments
    .filter((e) => e.due >= today && e.due <= sevenDays)
    .sort((a, b) => a.due.getTime() - b.due.getTime())
    .map(formatAlert);

  const { chatSessionsTable } = await import("@workspace/db");
  const sessions = await db.select().from(chatSessionsTable);
  const unreadChatsCount = sessions.reduce((s, sess) => s + sess.unreadCount, 0);

  res.json({
    totalInvestment,
    totalRevenue,
    netProfit,
    totalAccounts: accounts.length,
    activeAccounts: activeAccounts.length,
    soldAccounts: soldAccounts.length,
    installmentAccounts: installmentAccounts.length,
    pendingLinksCount,
    pendingPaymentsCount,
    unreadChatsCount,
    dueAlerts: {
      overdueCount: overdue.length,
      dueSoonCount: dueSoon.length,
      overdue,
      dueSoon,
    },
  });
});

export default router;
