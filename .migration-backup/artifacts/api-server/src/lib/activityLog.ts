import { db, activityLogsTable } from "@workspace/db";

export type ActorType = "admin" | "seller" | "customer" | "system";

export interface LogActivityArgs {
  actorType: ActorType;
  actorName: string;
  actorId?: number | null;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  details?: string | null;
}

export async function logActivity(args: LogActivityArgs): Promise<void> {
  try {
    await db.insert(activityLogsTable).values({
      actorType: args.actorType,
      actorName: args.actorName,
      actorId: args.actorId ?? null,
      action: args.action,
      targetType: args.targetType ?? null,
      targetId: args.targetId ?? null,
      details: args.details ?? null,
    });
  } catch (e) {
    // Best-effort, never throw
  }
}
