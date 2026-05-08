import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, historyTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/accounts/:id/history", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const entries = await db.select().from(historyTable).where(eq(historyTable.accountId, id)).orderBy(desc(historyTable.createdAt));
  res.json(entries.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })));
});

export default router;
