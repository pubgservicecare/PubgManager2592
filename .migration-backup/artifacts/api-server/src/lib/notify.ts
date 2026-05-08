import { db, notificationsTable } from "@workspace/db";

export type NotificationType =
  | "chat"
  | "payment_due"
  | "payment_received"
  | "account_status"
  | "wishlist"
  | "system";

export async function createNotification(input: {
  customerUserId: number;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
}): Promise<void> {
  try {
    await db.insert(notificationsTable).values({
      customerUserId: input.customerUserId,
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
    });
  } catch {
    // Non-fatal — notifications failures should never break the parent flow
  }
}
