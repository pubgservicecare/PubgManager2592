import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, paymentsTable, accountsTable, historyTable, settingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { generateReceiptPdf } from "../lib/receipt";

const router: IRouter = Router();

function parseId(raw: unknown): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(String(v), 10);
}

function serializePayment(p: any) {
  return {
    id: p.id,
    accountId: p.accountId,
    amount: parseFloat(p.amount as string),
    note: p.note ?? null,
    dueDate: p.dueDate ?? null,
    paidAt: p.paidAt ? p.paidAt.toISOString() : null,
    receiptNumber: p.receiptNumber ?? null,
    isReversal: !!p.isReversal,
    reversesPaymentId: p.reversesPaymentId ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt ? p.updatedAt.toISOString() : null,
  };
}

async function generateReceiptNumber(accountId: number): Promise<string> {
  // RCPT-{accountId}-{count+1 zero-padded}. Concurrency-safe: use a
  // SERIALIZABLE-ish guard by reading current max suffix and falling back to
  // a timestamp-jittered suffix on retry inside the caller (UNIQUE constraint
  // on receipt_number guarantees data integrity).
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.accountId, accountId), sql`${paymentsTable.receiptNumber} IS NOT NULL`));
  const next = (Number(count) || 0) + 1;
  return `RCPT-${accountId}-${String(next).padStart(4, "0")}`;
}

// Insert a payment with a generated receipt number, retrying on unique
// collision so concurrent admin actions never both fail or both produce the
// same number.
async function insertWithReceipt(
  values: Omit<typeof paymentsTable.$inferInsert, "receiptNumber"> & { accountId: number }
) {
  const maxAttempts = 5;
  let lastErr: any = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let receiptNumber = await generateReceiptNumber(values.accountId);
    if (attempt > 0) {
      // suffix retry attempts to avoid the same collision
      receiptNumber = `${receiptNumber}-${attempt}`;
    }
    try {
      const [row] = await db
        .insert(paymentsTable)
        .values({ ...values, receiptNumber })
        .returning();
      return row;
    } catch (e: any) {
      lastErr = e;
      // Postgres unique violation
      if (e?.code !== "23505") throw e;
    }
  }
  throw lastErr ?? new Error("Failed to generate unique receipt number");
}

// -------- LIST payments for an account --------
router.get("/accounts/:id/payments", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }
  const rows = await db.select().from(paymentsTable).where(eq(paymentsTable.accountId, id));
  res.json(rows.map(serializePayment));
});

// -------- CREATE actual received payment --------
router.post("/accounts/:id/payments", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { amount, note, dueDate, paymentDate } = req.body ?? {};
  const amt = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (!amt || amt <= 0) {
    res.status(400).json({ error: "amount is required and must be positive" });
    return;
  }

  const paidAt = paymentDate ? new Date(paymentDate) : new Date();

  const payment = await insertWithReceipt({
    accountId: id,
    amount: amt.toString(),
    note: note ?? null,
    dueDate: dueDate ?? null,
    paidAt,
    isReversal: false,
  });

  await db.insert(historyTable).values({
    accountId: id,
    action: "Payment received",
    details: `Amount: ${amt}, Receipt: ${payment.receiptNumber}${note ? `, Note: ${note}` : ""}`,
  });

  res.status(201).json(serializePayment(payment));
});

// -------- CREATE scheduled (planned) installment --------
router.post("/accounts/:id/payments/scheduled", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid account id" });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const { amount, note, dueDate } = req.body ?? {};
  const amt = typeof amount === "number" ? amount : parseFloat(String(amount));
  if (!amt || amt <= 0) {
    res.status(400).json({ error: "amount is required and must be positive" });
    return;
  }
  if (!dueDate) {
    res.status(400).json({ error: "dueDate is required for scheduled installments" });
    return;
  }

  const [payment] = await db
    .insert(paymentsTable)
    .values({
      accountId: id,
      amount: amt.toString(),
      note: note ?? null,
      dueDate,
      paidAt: null,
      receiptNumber: null,
      isReversal: false,
    })
    .returning();

  await db.insert(historyTable).values({
    accountId: id,
    action: "Installment scheduled",
    details: `Expected: ${amt}, Due: ${dueDate}${note ? `, Note: ${note}` : ""}`,
  });

  res.status(201).json(serializePayment(payment));
});

// -------- MARK scheduled as paid --------
router.patch(
  "/accounts/:id/payments/:paymentId/mark-paid",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    const pid = parseId(req.params.paymentId);

    const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, pid));
    if (!existing || existing.accountId !== id) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    if (existing.paidAt) {
      res.status(409).json({ error: "Payment already marked as paid" });
      return;
    }
    if (existing.isReversal) {
      res.status(400).json({ error: "Cannot mark a reversal entry as paid" });
      return;
    }

    const { amount, paymentDate, note } = req.body ?? {};
    const amt = amount === undefined ? parseFloat(existing.amount as string) : (typeof amount === "number" ? amount : parseFloat(String(amount)));
    if (!amt || amt <= 0) {
      res.status(400).json({ error: "amount must be positive" });
      return;
    }

    const paidAt = paymentDate ? new Date(paymentDate) : new Date();

    // Generate receipt number with retry-on-collision (UNIQUE constraint).
    const maxAttempts = 5;
    let updated: any = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let receiptNumber = await generateReceiptNumber(id);
      if (attempt > 0) receiptNumber = `${receiptNumber}-${attempt}`;
      try {
        const [row] = await db
          .update(paymentsTable)
          .set({ amount: amt.toString(), note: note ?? existing.note, paidAt, receiptNumber })
          .where(eq(paymentsTable.id, pid))
          .returning();
        updated = row;
        break;
      } catch (e: any) {
        lastErr = e;
        if (e?.code !== "23505") throw e;
      }
    }
    if (!updated) throw lastErr ?? new Error("Failed to generate unique receipt number");

    await db.insert(historyTable).values({
      accountId: id,
      action: "Scheduled installment paid",
      details: `Amount: ${amt}, Receipt: ${updated.receiptNumber}`,
    });

    res.json(serializePayment(updated));
  }
);

// -------- EDIT payment (amount / note / due date / payment date) --------
router.patch("/accounts/:id/payments/:paymentId", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  const pid = parseId(req.params.paymentId);

  const [existing] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, pid));
  if (!existing || existing.accountId !== id) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  if (existing.isReversal) {
    res.status(400).json({ error: "Cannot edit a reversal entry. Reversals are immutable." });
    return;
  }

  const { amount, note, dueDate, paymentDate } = req.body ?? {};
  const updates: Record<string, any> = {};

  if (amount !== undefined) {
    const amt = typeof amount === "number" ? amount : parseFloat(String(amount));
    if (!amt || amt <= 0) {
      res.status(400).json({ error: "amount must be positive" });
      return;
    }
    updates.amount = amt.toString();
  }
  if (note !== undefined) updates.note = note || null;
  if (dueDate !== undefined) updates.dueDate = dueDate || null;
  if (paymentDate !== undefined) {
    if (!existing.paidAt && paymentDate) {
      // editing a scheduled-only entry to set paymentDate is not allowed; use mark-paid
      res.status(400).json({ error: "Use mark-paid endpoint to record actual payment for a scheduled installment" });
      return;
    }
    if (paymentDate) updates.paidAt = new Date(paymentDate);
  }

  if (Object.keys(updates).length === 0) {
    res.json(serializePayment(existing));
    return;
  }

  const [updated] = await db
    .update(paymentsTable)
    .set(updates)
    .where(eq(paymentsTable.id, pid))
    .returning();

  const summary = Object.entries(updates)
    .map(([k, v]) => `${k}=${v instanceof Date ? v.toISOString() : v}`)
    .join(", ");
  await db.insert(historyTable).values({
    accountId: id,
    action: "Payment edited",
    details: `Payment #${pid}: ${summary}`,
  });

  res.json(serializePayment(updated));
});

// -------- REVERSE a payment (no delete) --------
router.post(
  "/accounts/:id/payments/:paymentId/reverse",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = parseId(req.params.id);
    const pid = parseId(req.params.paymentId);

    const [original] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, pid));
    if (!original || original.accountId !== id) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    if (original.isReversal) {
      res.status(400).json({ error: "Cannot reverse a reversal entry" });
      return;
    }
    if (!original.paidAt) {
      res.status(400).json({ error: "Cannot reverse an unpaid scheduled installment. Edit or delete by setting expected to 0 instead." });
      return;
    }

    // Check if already reversed
    const existingReversals = await db
      .select()
      .from(paymentsTable)
      .where(and(eq(paymentsTable.reversesPaymentId, pid), eq(paymentsTable.isReversal, true)));
    if (existingReversals.length > 0) {
      res.status(409).json({ error: "This payment has already been reversed" });
      return;
    }

    const { reason } = req.body ?? {};
    const amt = parseFloat(original.amount as string);

    const [reversal] = await db
      .insert(paymentsTable)
      .values({
        accountId: id,
        amount: amt.toString(),
        note: reason ? `Reversal: ${reason}` : `Reversal of payment #${pid}`,
        dueDate: null,
        paidAt: new Date(),
        receiptNumber: null,
        isReversal: true,
        reversesPaymentId: pid,
      })
      .returning();

    await db.insert(historyTable).values({
      accountId: id,
      action: "Payment reversed",
      details: `Reversed payment #${pid} (${original.receiptNumber ?? "no receipt"}): -${amt}${reason ? `, Reason: ${reason}` : ""}`,
    });

    res.status(201).json(serializePayment(reversal));
  }
);

// -------- Receipt PDF helper (admin) --------
async function downloadReceipt(req: Request, res: Response, _next: NextFunction): Promise<void> {
  const id = parseId(req.params.id);
  const pid = parseId(req.params.paymentId);

  const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, pid));
  if (!payment || payment.accountId !== id) {
    res.status(404).json({ error: "Payment not found" });
    return;
  }
  if (!payment.paidAt || !payment.receiptNumber || payment.isReversal) {
    res.status(400).json({ error: "Receipt is only available for completed (non-reversed) payments" });
    return;
  }

  const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, id));
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const [settings] = await db.select().from(settingsTable).limit(1);
  const business = {
    siteName: settings?.siteName ?? "PUBG Account Manager",
    supportEmail: settings?.supportEmail ?? "support@example.com",
    whatsappNumber: settings?.whatsappNumber ?? "",
    footerText: settings?.footerText ?? "",
  };

  // Compute totals
  const allPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.accountId, id));
  let totalPaid = 0;
  for (const p of allPayments) {
    if (!p.paidAt) continue;
    const a = parseFloat(p.amount as string);
    totalPaid += p.isReversal ? -a : a;
  }
  const totalPrice = parseFloat(((account.finalSoldPrice as any) ?? account.priceForSale) as string);
  const remaining = Math.max(0, totalPrice - totalPaid);

  const filename = `${payment.receiptNumber}.pdf`;
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

  const stream = generateReceiptPdf({
    payment: {
      id: payment.id,
      receiptNumber: payment.receiptNumber,
      amount: parseFloat(payment.amount as string),
      note: payment.note,
      paidAt: payment.paidAt,
      dueDate: payment.dueDate,
    },
    account,
    business,
    totals: { totalPrice, totalPaid, remaining },
  });
  stream.pipe(res);
}

router.get("/accounts/:id/payments/:paymentId/receipt", requireAdmin, downloadReceipt);

// -------- Customer-facing receipt download --------
router.get(
  "/customer/payments/:paymentId/receipt",
  async (req, res): Promise<void> => {
    const sess = (req as any).session;
    if (!sess?.customerDbId) {
      res.status(401).json({ error: "Login required" });
      return;
    }
    const pid = parseId(req.params.paymentId);
    const [payment] = await db.select().from(paymentsTable).where(eq(paymentsTable.id, pid));
    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    }
    const [account] = await db.select().from(accountsTable).where(eq(accountsTable.id, payment.accountId));
    if (!account || account.customerId !== sess.customerDbId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!payment.paidAt || !payment.receiptNumber || payment.isReversal) {
      res.status(400).json({ error: "Receipt is only available for completed (non-reversed) payments" });
      return;
    }

    const [settings] = await db.select().from(settingsTable).limit(1);
    const business = {
      siteName: settings?.siteName ?? "PUBG Account Manager",
      supportEmail: settings?.supportEmail ?? "support@example.com",
      whatsappNumber: settings?.whatsappNumber ?? "",
      footerText: settings?.footerText ?? "",
    };

    const allPayments = await db.select().from(paymentsTable).where(eq(paymentsTable.accountId, account.id));
    let totalPaid = 0;
    for (const p of allPayments) {
      if (!p.paidAt) continue;
      const a = parseFloat(p.amount as string);
      totalPaid += p.isReversal ? -a : a;
    }
    const totalPrice = parseFloat(((account.finalSoldPrice as any) ?? account.priceForSale) as string);
    const remaining = Math.max(0, totalPrice - totalPaid);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${payment.receiptNumber}.pdf"`);

    const stream = generateReceiptPdf({
      payment: {
        id: payment.id,
        receiptNumber: payment.receiptNumber,
        amount: parseFloat(payment.amount as string),
        note: payment.note,
        paidAt: payment.paidAt,
        dueDate: payment.dueDate,
      },
      account,
      business,
      totals: { totalPrice, totalPaid, remaining },
    });
    stream.pipe(res);
  }
);

export default router;
