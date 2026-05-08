import { Router, type IRouter } from "express";
import { desc } from "drizzle-orm";
import { db, accountsTable, customersTable, paymentsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(csvEscape).join(",");
  const body = rows.map((r) => columns.map((c) => csvEscape(r[c])).join(",")).join("\n");
  return header + "\n" + body + "\n";
}

function sendCsv(res: any, filename: string, csv: string): void {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

router.get("/admin/export/accounts.csv", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(accountsTable).orderBy(desc(accountsTable.createdAt));
  const csv = toCsv(
    rows.map((a) => ({
      id: a.id,
      title: a.title,
      account_id: a.accountId,
      status: a.status,
      price_for_sale: a.priceForSale,
      purchase_price: a.purchasePrice,
      final_sold_price: a.finalSoldPrice,
      customer_name: a.customerName,
      customer_contact: a.customerContact,
      seller_id: a.sellerId,
      is_featured: a.isFeatured,
      view_count: a.viewCount,
      created_at: a.createdAt.toISOString(),
    })),
    [
      "id", "title", "account_id", "status", "price_for_sale", "purchase_price", "final_sold_price",
      "customer_name", "customer_contact", "seller_id", "is_featured", "view_count", "created_at",
    ]
  );
  sendCsv(res, `accounts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
});

router.get("/admin/export/customers.csv", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(customersTable).orderBy(desc(customersTable.createdAt));
  const csv = toCsv(
    rows.map((c) => ({
      id: c.id,
      name: c.name,
      contact: c.contact,
      created_at: c.createdAt.toISOString(),
    })),
    ["id", "name", "contact", "created_at"]
  );
  sendCsv(res, `customers-${new Date().toISOString().slice(0, 10)}.csv`, csv);
});

router.get("/admin/export/payments.csv", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(paymentsTable).orderBy(desc(paymentsTable.createdAt));
  const csv = toCsv(
    rows.map((p) => ({
      id: p.id,
      account_id: p.accountId,
      amount: p.amount,
      note: p.note,
      due_date: p.dueDate,
      paid_at: p.paidAt ? p.paidAt.toISOString() : null,
      receipt_number: p.receiptNumber,
      is_reversal: p.isReversal,
      reverses_payment_id: p.reversesPaymentId,
      created_at: p.createdAt.toISOString(),
    })),
    [
      "id", "account_id", "amount", "note", "due_date", "paid_at",
      "receipt_number", "is_reversal", "reverses_payment_id", "created_at",
    ]
  );
  sendCsv(res, `payments-${new Date().toISOString().slice(0, 10)}.csv`, csv);
});

export default router;
