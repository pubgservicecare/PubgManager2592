import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, activityLogsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/admin/activity", requireAdmin, async (req, res): Promise<void> => {
  const limit = Math.min(parseInt((req.query.limit as string) || "100", 10) || 100, 500);
  const actorType = req.query.actorType as string | undefined;

  const rows = actorType
    ? await db
        .select()
        .from(activityLogsTable)
        .where(eq(activityLogsTable.actorType, actorType as any))
        .orderBy(desc(activityLogsTable.createdAt))
        .limit(limit)
    : await db
        .select()
        .from(activityLogsTable)
        .orderBy(desc(activityLogsTable.createdAt))
        .limit(limit);

  res.json(
    rows.map((r) => ({
      ...r,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
    })),
  );
});

export default router;
