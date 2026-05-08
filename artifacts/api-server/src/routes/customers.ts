import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, customersTable, accountsTable, paymentsTable, customerUsersTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

// Logged-in customer fetches their installment accounts + payment schedule
router.get("/customer/installments", async (req, res): Promise<void> => {
  const sess = (req as any).session;
  if (!sess?.customerDbId) {
    res.status(401).json({ error: "Login required" });
    return;
  }

  const accounts = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.customerId, sess.customerDbId), eq(accountsTable.status, "installment")))
    .orderBy(desc(accountsTable.createdAt));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);

  const result = await Promise.all(
    accounts.map(async (acc) => {
      const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.accountId, acc.id));
      let totalPaid = 0;
      for (const p of payments) {
        if (!p.paidAt) continue;
        const a = parseFloat(p.amount as string);
        totalPaid += p.isReversal ? -a : a;
      }
      const finalSoldPrice = acc.finalSoldPrice ? parseFloat(acc.finalSoldPrice as string) : 0;
      const remainingAmount = Math.max(0, finalSoldPrice - totalPaid);

      const upcoming = payments
        .filter((p) => !p.paidAt && !p.isReversal && p.dueDate)
        .map((p) => ({ p, due: new Date(p.dueDate as any) }))
        .sort((a, b) => a.due.getTime() - b.due.getTime());

      return {
        id: acc.id,
        title: acc.title,
        accountId: acc.accountId,
        status: acc.status,
        finalSoldPrice,
        totalPaid,
        remainingAmount,
        nextDueDate: upcoming.length > 0 ? upcoming[0].p.dueDate : null,
        overdueCount: upcoming.filter((e) => e.due < today).length,
        dueSoonCount: upcoming.filter((e) => e.due >= today && e.due <= sevenDays).length,
        payments: payments
          .sort((a, b) => {
            const ad = a.paidAt ?? (a.dueDate ? new Date(a.dueDate as any) : a.createdAt);
            const bd = b.paidAt ?? (b.dueDate ? new Date(b.dueDate as any) : b.createdAt);
            const at = ad instanceof Date ? ad.getTime() : new Date(ad as any).getTime();
            const bt = bd instanceof Date ? bd.getTime() : new Date(bd as any).getTime();
            return at - bt;
          })
          .map((p) => ({
            id: p.id,
            amount: parseFloat(p.amount as string),
            note: p.note ?? null,
            dueDate: p.dueDate ?? null,
            paidAt: p.paidAt ? p.paidAt.toISOString() : null,
            receiptNumber: p.receiptNumber ?? null,
            isReversal: !!p.isReversal,
          })),
      };
    })
  );

  res.json(result);
});

router.get("/customers", requireAdmin, async (_req, res): Promise<void> => {
  const customers = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));
  const result = await Promise.all(customers.map(async (c) => {
    const deals = await db.select().from(accountsTable).where(eq(accountsTable.customerId, c.id));
    return {
      ...c,
      createdAt: c.createdAt.toISOString(),
      deals: deals.map((d) => ({
        id: d.id,
        title: d.title,
        accountId: d.accountId,
        priceForSale: parseFloat(d.priceForSale as string),
        finalSoldPrice: d.finalSoldPrice ? parseFloat(d.finalSoldPrice as string) : null,
        purchasePrice: d.purchasePrice ? parseFloat(d.purchasePrice as string) : null,
        status: d.status,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        links: [],
        pendingLinksCount: 0,
      })),
    };
  }));
  res.json(result);
});

router.get("/customers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  const deals = await db.select().from(accountsTable).where(eq(accountsTable.customerId, id));
  res.json({
    ...customer,
    createdAt: customer.createdAt.toISOString(),
    deals: deals.map((d) => ({
      id: d.id,
      title: d.title,
      accountId: d.accountId,
      priceForSale: parseFloat(d.priceForSale as string),
      finalSoldPrice: d.finalSoldPrice ? parseFloat(d.finalSoldPrice as string) : null,
      purchasePrice: d.purchasePrice ? parseFloat(d.purchasePrice as string) : null,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      links: [],
      pendingLinksCount: 0,
    })),
  });
});

router.patch("/customers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid customer id" });
    return;
  }

  const body = (req.body ?? {}) as { name?: unknown; contact?: unknown };
  const updates: { name?: string; contact?: string } = {};
  if (typeof body.name === "string" && body.name.trim().length > 0) {
    updates.name = body.name.trim();
  }
  if (typeof body.contact === "string" && body.contact.trim().length > 0) {
    updates.contact = body.contact.trim();
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const [existing] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  await db.update(customersTable).set(updates).where(eq(customersTable.id, id));
  const [updated] = await db.select().from(customersTable).where(eq(customersTable.id, id));

  res.json({
    id: updated.id,
    name: updated.name,
    contact: updated.contact,
    createdAt: updated.createdAt.toISOString(),
    deals: [],
  });
});

router.delete("/customers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid customer id" });
    return;
  }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  // Detach any accounts from this customer (set customerId to NULL).
  await db.update(accountsTable).set({ customerId: null }).where(eq(accountsTable.customerId, id));
  // Remove customer login user records linked to this customer.
  await db.delete(customerUsersTable).where(eq(customerUsersTable.customerId, id));
  // Finally delete the customer.
  await db.delete(customersTable).where(eq(customersTable.id, id));

  res.json({ success: true });
});

export default router;
