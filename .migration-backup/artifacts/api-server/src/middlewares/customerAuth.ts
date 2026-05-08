import type { Request, Response, NextFunction } from "express";

export function requireCustomer(req: Request, res: Response, next: NextFunction): void {
  const sess = (req as any).session;
  if (!sess?.customerId) {
    res.status(401).json({ error: "Login required" });
    return;
  }
  next();
}

export function getCustomerSession(req: Request): {
  customerUserId: number;
  customerDbId: number;
  name: string;
  phone: string;
} | null {
  const sess = (req as any).session;
  if (!sess?.customerId) return null;
  return {
    customerUserId: sess.customerId,
    customerDbId: sess.customerDbId,
    name: sess.customerName,
    phone: sess.customerPhone,
  };
}
