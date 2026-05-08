import { Router, type IRouter } from "express";
import { eq, desc, and, isNull, inArray } from "drizzle-orm";
import { db, sellersTable, accountsTable, historyTable, customersTable, paymentsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { requireSeller } from "../middlewares/sellerAuth";
import { logActivity } from "../lib/activityLog";

const router: IRouter = Router();

function publicSellerInfo(seller: any) {
  return {
    id: seller.id,
    name: seller.name,
    totalListings: seller.totalListings,
    totalSold: seller.totalSold,
    createdAt: seller.createdAt instanceof Date ? seller.createdAt.toISOString() : seller.createdAt,
  };
}

function fullSellerInfo(seller: any) {
  return {
    id: seller.id,
    name: seller.name,
    email: seller.email,
    phone: seller.phone,
    whatsapp: seller.whatsapp,
    cnicNumber: seller.cnicNumber,
    cnicFrontUrl: seller.cnicFrontUrl,
    cnicBackUrl: seller.cnicBackUrl,
    selfieUrl: seller.selfieUrl,
    status: seller.status,
    rejectionReason: seller.rejectionReason,
    totalListings: seller.totalListings,
    totalSold: seller.totalSold,
    totalEarnings: parseFloat(seller.totalEarnings || "0"),
    approvedAt: seller.approvedAt ? seller.approvedAt.toISOString() : null,
    createdAt: seller.createdAt.toISOString(),
  };
}

router.get("/sellers/public/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.id, id));
  if (!seller || seller.status !== "approved") {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  res.json(publicSellerInfo(seller));
});

router.get("/admin/sellers", requireAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  let rows;
  if (status) {
    rows = await db.select().from(sellersTable).where(eq(sellersTable.status, status as any)).orderBy(desc(sellersTable.createdAt));
  } else {
    rows = await db.select().from(sellersTable).orderBy(desc(sellersTable.createdAt));
  }
  res.json(rows.map(fullSellerInfo));
});

router.get("/admin/sellers/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.id, id));
  if (!seller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.sellerId, id));
  res.json({ ...fullSellerInfo(seller), accounts: accounts.length });
});

// Admin views a single seller's full dashboard: stats + listings (with prices)
router.get("/admin/sellers/:id/dashboard", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.id, id));
  if (!seller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  const accounts = await db.select().from(accountsTable).where(and(eq(accountsTable.sellerId, id), isNull(accountsTable.deletedAt))).orderBy(desc(accountsTable.createdAt));
  const active = accounts.filter((a) => a.status === "active");
  const underReview = accounts.filter((a) => a.status === "under_review");
  const sold = accounts.filter((a) => a.status === "sold" || a.status === "installment");

  const totalRevenue = sold.reduce((s, a) => s + (a.finalSoldPrice ? parseFloat(a.finalSoldPrice as string) : 0), 0);
  const totalInvestment = accounts.reduce((s, a) => s + (a.purchasePrice ? parseFloat(a.purchasePrice as string) : 0), 0);
  const netProfit = sold.reduce((s, a) => {
    const sale = a.finalSoldPrice ? parseFloat(a.finalSoldPrice as string) : 0;
    const buy = a.purchasePrice ? parseFloat(a.purchasePrice as string) : 0;
    return s + (sale - buy);
  }, 0);

  res.json({
    seller: fullSellerInfo(seller),
    stats: {
      totalListings: accounts.length,
      activeListings: active.length,
      underReviewListings: underReview.length,
      soldListings: sold.length,
      totalRevenue,
      totalInvestment,
      netProfit,
    },
    accounts: accounts.map((a) => ({
      id: a.id,
      title: a.title,
      accountId: a.accountId,
      purchasePrice: a.purchasePrice ? parseFloat(a.purchasePrice as string) : null,
      priceForSale: parseFloat(a.priceForSale as string),
      finalSoldPrice: a.finalSoldPrice ? parseFloat(a.finalSoldPrice as string) : null,
      status: a.status,
      imageUrls: a.imageUrls || [],
      customerName: a.customerName,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

router.post("/admin/sellers/:id/approve", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const adminUsername = (req.session as any).username || "admin";
  const [updated] = await db.update(sellersTable).set({
    status: "approved",
    approvedAt: new Date(),
    approvedBy: adminUsername,
    rejectionReason: null,
  }).where(eq(sellersTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  await logActivity({ actorType: "admin", actorName: adminUsername, action: "Seller approved", targetType: "seller", targetId: id, details: updated.name });
  res.json(fullSellerInfo(updated));
});

router.post("/admin/sellers/:id/reject", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { reason } = req.body;
  const adminUser = (req.session as any).username || "admin";
  const [updated] = await db.update(sellersTable).set({
    status: "rejected",
    rejectionReason: reason || "Application rejected",
  }).where(eq(sellersTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  await logActivity({ actorType: "admin", actorName: adminUser, action: "Seller rejected", targetType: "seller", targetId: id, details: `${updated.name}: ${reason || ""}` });
  res.json(fullSellerInfo(updated));
});

router.post("/admin/sellers/:id/suspend", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const { reason } = req.body;
  const adminUser = (req.session as any).username || "admin";
  const result = await db.transaction(async (tx: any) => {
    const [updatedSeller] = await tx.update(sellersTable).set({
      status: "suspended",
      rejectionReason: reason || "Suspended by admin",
    }).where(eq(sellersTable.id, id)).returning();
    if (!updatedSeller) return { updatedSeller: null, hiddenCount: 0 };
    // Hide all currently-visible listings of this seller (active + under_review).
    // Sold/reserved/installment listings are committed orders and remain untouched.
    const hidden = await tx.update(accountsTable).set({ status: "hidden" })
      .where(and(
        eq(accountsTable.sellerId, id),
        inArray(accountsTable.status, ["active", "under_review"]),
        isNull(accountsTable.deletedAt),
      )).returning({ id: accountsTable.id });
    return { updatedSeller, hiddenCount: hidden.length };
  });
  if (!result.updatedSeller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: "Seller suspended",
    targetType: "seller",
    targetId: id,
    details: `${result.updatedSeller.name}: ${reason || ""} (${result.hiddenCount} listing${result.hiddenCount === 1 ? "" : "s"} hidden)`,
  });
  res.json(fullSellerInfo(result.updatedSeller));
});

router.post("/admin/sellers/:id/reinstate", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const adminUser = (req.session as any).username || "admin";
  const [updated] = await db.update(sellersTable).set({
    status: "approved",
    rejectionReason: null,
  }).where(eq(sellersTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  await logActivity({ actorType: "admin", actorName: adminUser, action: "Seller reinstated", targetType: "seller", targetId: id, details: updated.name });
  res.json(fullSellerInfo(updated));
});

router.delete("/admin/sellers/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  const adminUser = (req.session as any).username || "admin";
  const result = await db.transaction(async (tx: any) => {
    // Confirm seller exists first so a 404 has no side effects on listings.
    const [existing] = await tx.select({ id: sellersTable.id }).from(sellersTable).where(eq(sellersTable.id, id));
    if (!existing) return { seller: null as any, deletedCount: 0 };
    // Soft-delete every listing of this seller (and hide it) so nothing remains visible
    // anywhere after the seller row is removed.
    const removedListings = await tx.update(accountsTable)
      .set({ deletedAt: new Date(), status: "hidden" })
      .where(and(eq(accountsTable.sellerId, id), isNull(accountsTable.deletedAt)))
      .returning({ id: accountsTable.id });
    const [seller] = await tx.delete(sellersTable).where(eq(sellersTable.id, id)).returning();
    return { seller, deletedCount: removedListings.length };
  });
  if (!result.seller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  await logActivity({
    actorType: "admin",
    actorName: adminUser,
    action: "Seller deleted",
    targetType: "seller",
    targetId: id,
    details: `${result.seller.name} (${result.deletedCount} listing${result.deletedCount === 1 ? "" : "s"} removed)`,
  });
  res.sendStatus(204);
});

router.get("/seller/dashboard", requireSeller, async (req, res): Promise<void> => {
  const sellerId = (req.session as any).sellerId;
  const accounts = await db.select().from(accountsTable).where(and(eq(accountsTable.sellerId, sellerId), isNull(accountsTable.deletedAt)));
  const active = accounts.filter((a) => a.status === "active");
  const underReview = accounts.filter((a) => a.status === "under_review");
  const sold = accounts.filter((a) => a.status === "sold" || a.status === "installment");
  const totalEarnings = sold.reduce((s, a) => s + (a.finalSoldPrice ? parseFloat(a.finalSoldPrice as string) : 0), 0);
  const totalInvestment = accounts.reduce((s, a) => s + (a.purchasePrice ? parseFloat(a.purchasePrice as string) : 0), 0);
  const netProfit = sold.reduce((s, a) => {
    const sale = a.finalSoldPrice ? parseFloat(a.finalSoldPrice as string) : 0;
    const buy = a.purchasePrice ? parseFloat(a.purchasePrice as string) : 0;
    return s + (sale - buy);
  }, 0);

  res.json({
    totalListings: accounts.length,
    activeListings: active.length,
    underReviewListings: underReview.length,
    soldListings: sold.length,
    totalEarnings,
    totalInvestment,
    netProfit,
  });
});

router.get("/seller/accounts", requireSeller, async (req, res): Promise<void> => {
  const sellerId = (req.session as any).sellerId;
  const rows = await db.select().from(accountsTable).where(and(eq(accountsTable.sellerId, sellerId), isNull(accountsTable.deletedAt))).orderBy(desc(accountsTable.createdAt));
  res.json(rows.map((a) => ({
    id: a.id,
    title: a.title,
    accountId: a.accountId,
    purchasePrice: a.purchasePrice ? parseFloat(a.purchasePrice as string) : null,
    priceForSale: parseFloat(a.priceForSale as string),
    finalSoldPrice: a.finalSoldPrice ? parseFloat(a.finalSoldPrice as string) : null,
    status: a.status,
    visibility: a.visibility || "public",
    videoUrl: a.videoUrl,
    imageUrls: a.imageUrls || [],
    description: a.description,
    customerName: a.customerName,
    createdAt: a.createdAt.toISOString(),
  })));
});

router.get("/seller/accounts/:id", requireSeller, async (req, res): Promise<void> => {
  const sellerId = (req.session as any).sellerId;
  const id = parseInt(req.params.id as string, 10);
  if (!Number.isFinite(id) || id <= 0) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [a] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, id), eq(accountsTable.sellerId, sellerId)));
  if (!a || a.deletedAt) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({
    id: a.id,
    title: a.title,
    accountId: a.accountId,
    purchasePrice: a.purchasePrice ? parseFloat(a.purchasePrice as string) : null,
    priceForSale: parseFloat(a.priceForSale as string),
    finalSoldPrice: a.finalSoldPrice ? parseFloat(a.finalSoldPrice as string) : null,
    status: a.status,
    visibility: a.visibility || "public",
    videoUrl: a.videoUrl,
    imageUrls: a.imageUrls || [],
    description: a.description,
    customerName: a.customerName,
    customerContact: a.customerContact,
    viewCount: a.viewCount ?? 0,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  });
});

router.post("/seller/accounts", requireSeller, async (req, res): Promise<void> => {
  const sellerId = (req.session as any).sellerId;
  const seller = (await db.select().from(sellersTable).where(eq(sellersTable.id, sellerId)))[0];
  const { title, accountId, purchasePrice, priceForSale, videoUrl, imageUrls, description, visibility } = req.body;
  if (!title || !accountId || !priceForSale) {
    res.status(400).json({ error: "title, accountId, priceForSale required" });
    return;
  }
  const vis = visibility === "private" ? "private" : "public";
  const cappedImages = Array.isArray(imageUrls) ? imageUrls.slice(0, 1) : null;

  const [acc] = await db.insert(accountsTable).values({
    title,
    accountId,
    purchasePrice: purchasePrice != null && purchasePrice !== "" ? purchasePrice.toString() : null,
    priceForSale: priceForSale.toString(),
    videoUrl,
    imageUrls: cappedImages,
    description,
    status: "active",
    visibility: vis,
    sellerId,
  }).returning();

  await db.update(sellersTable).set({
    totalListings: (await db.select().from(accountsTable).where(and(eq(accountsTable.sellerId, sellerId), isNull(accountsTable.deletedAt)))).length,
  }).where(eq(sellersTable.id, sellerId));

  await db.insert(historyTable).values({ accountId: acc.id, action: "Account created by seller", details: `Seller ID: ${sellerId}` });
  await logActivity({
    actorType: "seller",
    actorName: seller?.name || `Seller#${sellerId}`,
    actorId: sellerId,
    action: vis === "private" ? "Listing created (private)" : "Listing published",
    targetType: "account",
    targetId: acc.id,
    details: title,
  });
  res.status(201).json({ id: acc.id, title: acc.title });
});

router.patch("/seller/accounts/:id", requireSeller, async (req, res): Promise<void> => {
  const sellerId = (req.session as any).sellerId;
  const seller = (await db.select().from(sellersTable).where(eq(sellersTable.id, sellerId)))[0];
  const id = parseInt(req.params.id as string, 10);
  const [existing] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, id), eq(accountsTable.sellerId, sellerId)));
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const { title, accountId, purchasePrice, priceForSale, videoUrl, imageUrls, description, visibility } = req.body;
  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (accountId !== undefined) updates.accountId = accountId;
  if (purchasePrice !== undefined) updates.purchasePrice = purchasePrice != null && purchasePrice !== "" ? purchasePrice.toString() : null;
  if (priceForSale !== undefined) updates.priceForSale = priceForSale.toString();
  if (videoUrl !== undefined) updates.videoUrl = videoUrl;
  if (imageUrls !== undefined) updates.imageUrls = Array.isArray(imageUrls) ? imageUrls.slice(0, 1) : null;
  if (description !== undefined) updates.description = description;
  if (visibility !== undefined && (visibility === "public" || visibility === "private")) updates.visibility = visibility;
  const [updated] = await db.update(accountsTable).set(updates).where(eq(accountsTable.id, id)).returning();
  await logActivity({
    actorType: "seller",
    actorName: seller?.name || `Seller#${sellerId}`,
    actorId: sellerId,
    action: "Listing updated",
    targetType: "account",
    targetId: id,
    details: updated.title,
  });
  res.json({ id: updated.id, title: updated.title });
});

// Seller marks own account as sold (full payment only — installments are admin-only)
router.post("/seller/accounts/:id/sell", requireSeller, async (req, res): Promise<void> => {
  const sellerId = (req.session as any).sellerId;
  const seller = (await db.select().from(sellersTable).where(eq(sellersTable.id, sellerId)))[0];
  const id = parseInt(req.params.id as string, 10);
  const [existing] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, id), eq(accountsTable.sellerId, sellerId)));
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (existing.status === "sold" || existing.status === "installment") {
    res.status(400).json({ error: "Account already marked sold" });
    return;
  }

  const { finalSoldPrice, customerName, customerContact, note } = req.body;
  if (finalSoldPrice == null || finalSoldPrice === "") {
    res.status(400).json({ error: "finalSoldPrice is required" });
    return;
  }
  const priceStr = finalSoldPrice.toString();

  // Optional customer info — link only if BOTH name + contact provided
  let customerId: number | null = null;
  let custName: string | null = null;
  let custContact: string | null = null;
  if (customerName && customerContact) {
    custName = String(customerName).trim();
    custContact = String(customerContact).trim();
    let customer = (await db.select().from(customersTable).where(eq(customersTable.contact, custContact)))[0];
    if (!customer) {
      [customer] = await db.insert(customersTable).values({ name: custName, contact: custContact }).returning();
    }
    customerId = customer.id;
  } else if (customerName) {
    custName = String(customerName).trim();
  }

  const [updated] = await db.update(accountsTable).set({
    status: "sold",
    finalSoldPrice: priceStr,
    customerId,
    customerName: custName,
    customerContact: custContact,
  }).where(eq(accountsTable.id, id)).returning();

  // Single full-payment record carrying the seller's note (if any)
  await db.insert(paymentsTable).values({
    accountId: id,
    amount: priceStr,
    note: note ? String(note).slice(0, 1000) : "Full payment (by seller)",
    paidAt: new Date(),
  });

  await db.insert(historyTable).values({
    accountId: id,
    action: "Account marked sold by seller",
    details: `Price: ${priceStr}${custName ? `, Customer: ${custName}` : ""}${note ? ` — Note: ${String(note).slice(0, 200)}` : ""}`,
  });

  await logActivity({
    actorType: "seller",
    actorName: seller?.name || `Seller#${sellerId}`,
    actorId: sellerId,
    action: "Marked listing sold",
    targetType: "account",
    targetId: id,
    details: `${updated.title} for ${priceStr}`,
  });

  res.json({ id: updated.id, title: updated.title, status: updated.status });
});

router.delete("/seller/accounts/:id", requireSeller, async (req, res): Promise<void> => {
  const sellerId = (req.session as any).sellerId;
  const seller = (await db.select().from(sellersTable).where(eq(sellersTable.id, sellerId)))[0];
  const id = parseInt(req.params.id as string, 10);
  const [existing] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, id), eq(accountsTable.sellerId, sellerId)));
  if (!existing || existing.deletedAt) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (existing.status !== "active" && existing.status !== "under_review" && existing.status !== "hidden") {
    res.status(400).json({ error: "Only active/pending listings can be deleted" });
    return;
  }
  await db.update(accountsTable).set({ deletedAt: new Date(), status: "hidden" }).where(eq(accountsTable.id, id));
  await logActivity({
    actorType: "seller",
    actorName: seller?.name || `Seller#${sellerId}`,
    actorId: sellerId,
    action: "Listing deleted",
    targetType: "account",
    targetId: id,
    details: existing.title,
  });
  res.sendStatus(204);
});

export default router;
