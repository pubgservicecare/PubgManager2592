import { Router, type IRouter } from "express";
import { eq, and, desc, inArray } from "drizzle-orm";
import { db, wishlistTable, accountsTable } from "@workspace/db";
import { requireCustomer, getCustomerSession } from "../middlewares/customerAuth";

const router: IRouter = Router();

router.get("/customer/wishlist", requireCustomer, async (req, res): Promise<void> => {
  const sess = getCustomerSession(req)!;
  const items = await db
    .select()
    .from(wishlistTable)
    .where(eq(wishlistTable.customerUserId, sess.customerUserId))
    .orderBy(desc(wishlistTable.createdAt));

  if (items.length === 0) {
    res.json({ items: [] });
    return;
  }

  const accountIds = items.map((i) => i.accountId);
  const accounts = await db.select().from(accountsTable).where(inArray(accountsTable.id, accountIds));
  const byId = new Map(accounts.map((a) => [a.id, a]));

  res.json({
    items: items
      .filter((i) => byId.has(i.accountId))
      .map((i) => {
        const a = byId.get(i.accountId)!;
        return {
          wishlistId: i.id,
          accountId: a.id,
          title: a.title,
          priceForSale: parseFloat(a.priceForSale as string),
          status: a.status,
          imageUrls: a.imageUrls || [],
          addedAt: i.createdAt.toISOString(),
        };
      }),
  });
});

router.get("/customer/wishlist/ids", requireCustomer, async (req, res): Promise<void> => {
  const sess = getCustomerSession(req)!;
  const items = await db
    .select({ accountId: wishlistTable.accountId })
    .from(wishlistTable)
    .where(eq(wishlistTable.customerUserId, sess.customerUserId));
  res.json({ ids: items.map((i) => i.accountId) });
});

router.post("/customer/wishlist/:accountId", requireCustomer, async (req, res): Promise<void> => {
  const sess = getCustomerSession(req)!;
  const accountId = parseInt(String(req.params.accountId), 10);
  if (!Number.isFinite(accountId)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }
  const [acc] = await db.select().from(accountsTable).where(eq(accountsTable.id, accountId));
  if (!acc) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  try {
    await db
      .insert(wishlistTable)
      .values({ customerUserId: sess.customerUserId, accountId })
      .onConflictDoNothing();
  } catch (e) {
    req.log.warn({ err: e }, "wishlist insert failed");
  }
  res.json({ ok: true, accountId });
});

router.delete("/customer/wishlist/:accountId", requireCustomer, async (req, res): Promise<void> => {
  const sess = getCustomerSession(req)!;
  const accountId = parseInt(String(req.params.accountId), 10);
  if (!Number.isFinite(accountId)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }
  await db
    .delete(wishlistTable)
    .where(
      and(eq(wishlistTable.customerUserId, sess.customerUserId), eq(wishlistTable.accountId, accountId))
    );
  res.json({ ok: true, accountId });
});

export default router;
