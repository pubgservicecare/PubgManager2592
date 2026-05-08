import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, notificationsTable, accountsTable, paymentsTable } from "@workspace/db";
import { requireCustomer, getCustomerSession } from "../middlewares/customerAuth";

const router: IRouter = Router();

async function ensurePaymentDueAlerts(customerUserId: number, customerDbId: number): Promise<void> {
  const accounts = await db
    .select()
    .from(accountsTable)
    .where(and(eq(accountsTable.customerId, customerDbId), eq(accountsTable.status, "installment")));

  if (accounts.length === 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDays = new Date(today);
  sevenDays.setDate(sevenDays.getDate() + 7);

  for (const acc of accounts) {
    const payments = await db.select().from(paymentsTable).where(eq(paymentsTable.accountId, acc.id));
    const upcoming = payments
      .filter((p) => !p.paidAt && !p.isReversal && p.dueDate)
      .map((p) => ({ p, due: new Date(p.dueDate as any) }))
      .filter((x) => x.due <= sevenDays);

    for (const { p, due } of upcoming) {
      const isOverdue = due < today;
      const tag = `payment-due:${p.id}:${isOverdue ? "overdue" : "soon"}`;
      const [existing] = await db
        .select({ id: notificationsTable.id })
        .from(notificationsTable)
        .where(and(eq(notificationsTable.customerUserId, customerUserId), eq(notificationsTable.link, tag)))
        .limit(1);
      if (existing) continue;

      const dueStr = (p.dueDate as any) as string;
      const amount = parseFloat(p.amount as string);
      await db.insert(notificationsTable).values({
        customerUserId,
        type: "payment_due",
        title: isOverdue
          ? `Overdue installment for ${acc.title}`
          : `Installment due soon — ${acc.title}`,
        message: isOverdue
          ? `Payment of PKR ${amount.toLocaleString()} was due on ${dueStr}. Please contact support.`
          : `Your next installment of PKR ${amount.toLocaleString()} is due on ${dueStr}.`,
        link: tag,
      });
    }
  }
}

router.get("/customer/notifications", requireCustomer, async (req, res): Promise<void> => {
  const sess = getCustomerSession(req)!;
  await ensurePaymentDueAlerts(sess.customerUserId, sess.customerDbId);

  const list = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.customerUserId, sess.customerUserId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json({
    items: list.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    })),
  });
});

router.get("/customer/notifications/unread-count", requireCustomer, async (req, res): Promise<void> => {
  const sess = getCustomerSession(req)!;
  await ensurePaymentDueAlerts(sess.customerUserId, sess.customerDbId);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.customerUserId, sess.customerUserId), eq(notificationsTable.read, false)));
  res.json({ count: row?.count ?? 0 });
});

router.patch("/customer/notifications/:id/read", requireCustomer, async (req, res): Promise<void> => {
  const sess = getCustomerSession(req)!;
  const id = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.customerUserId, sess.customerUserId)));
  res.json({ ok: true });
});

router.post("/customer/notifications/mark-all-read", requireCustomer, async (req, res): Promise<void> => {
  const sess = getCustomerSession(req)!;
  await db
    .update(notificationsTable)
    .set({ read: true })
    .where(and(eq(notificationsTable.customerUserId, sess.customerUserId), eq(notificationsTable.read, false)));
  res.json({ ok: true });
});

export default router;
