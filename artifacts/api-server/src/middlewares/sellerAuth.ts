import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, sellersTable } from "@workspace/db";

export async function requireSeller(req: Request, res: Response, next: NextFunction): Promise<void> {
  const session = (req as any).session;
  if (!session?.sellerId) {
    res.status(401).json({ error: "Seller authentication required" });
    return;
  }
  // Re-validate against the DB on every request so admin actions
  // (suspend / delete / reject) take effect immediately, even for
  // sellers with active sessions.
  const [seller] = await db.select({
    id: sellersTable.id,
    status: sellersTable.status,
  }).from(sellersTable).where(eq(sellersTable.id, session.sellerId));

  if (!seller) {
    delete session.sellerId;
    delete session.sellerStatus;
    res.status(401).json({ error: "Seller account no longer exists" });
    return;
  }
  if (seller.status !== "approved") {
    session.sellerStatus = seller.status;
    const messages: Record<string, string> = {
      pending: "Your seller account is awaiting admin review.",
      rejected: "Your seller application was rejected.",
      suspended: "Your seller account has been suspended.",
    };
    res.status(403).json({ error: messages[seller.status] || "Account not approved", status: seller.status });
    return;
  }
  // Keep session in sync with DB for downstream code.
  session.sellerStatus = seller.status;
  next();
}
