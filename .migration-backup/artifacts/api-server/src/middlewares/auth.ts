import { type Request, type Response, type NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const session = (req as any).session;
  if (!session || !session.isAdmin) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
