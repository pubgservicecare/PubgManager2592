import { Router, type IRouter } from "express";
import { db, settingsTable, customerUsersTable, sellersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
    username: string;
  }
}

router.post("/auth/admin/login", async (req, res): Promise<void> => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const usernameMatch = username === settings.adminUsername;
  const passwordMatch = settings.adminPassword.startsWith("$2")
    ? await bcrypt.compare(password, settings.adminPassword)
    : password === settings.adminPassword;

  if (usernameMatch && passwordMatch) {
    req.session.isAdmin = true;
    req.session.username = settings.adminUsername;
    res.json({ success: true, username: settings.adminUsername });
    return;
  }

  res.status(401).json({ error: "Invalid credentials" });
});

// Unified login: identifier = phone → customer, identifier = email → seller
router.post("/auth/login", async (req, res): Promise<void> => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    res.status(400).json({ error: "Identifier and password required" });
    return;
  }

  const isEmail = typeof identifier === "string" && identifier.includes("@");

  if (isEmail) {
    // Try seller login
    const normalizedEmail = String(identifier).trim().toLowerCase();
    const [seller] = await db
      .select()
      .from(sellersTable)
      .where(sql`LOWER(${sellersTable.email}) = ${normalizedEmail}`);

    if (!seller) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    const valid = await bcrypt.compare(password, seller.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    if (seller.status === "pending") {
      res.status(403).json({ error: "Your application is still under review by admin", status: "pending" });
      return;
    }
    if (seller.status === "rejected") {
      res.status(403).json({ error: `Application rejected: ${seller.rejectionReason || "Contact support"}`, status: "rejected" });
      return;
    }
    if (seller.status === "suspended") {
      res.status(403).json({ error: "Your account has been suspended", status: "suspended" });
      return;
    }

    req.session.regenerate((err) => {
      if (err) { res.status(500).json({ error: "Session error, please try again" }); return; }
      req.session.sellerId = seller.id;
      req.session.sellerName = seller.name;
      req.session.sellerEmail = seller.email;
      req.session.sellerStatus = seller.status;
      res.json({ role: "seller", id: seller.id, name: seller.name, email: seller.email, status: seller.status });
    });
  } else {
    // Try customer login by phone
    const phone = String(identifier).trim();
    const [user] = await db
      .select()
      .from(customerUsersTable)
      .where(eq(customerUsersTable.phone, phone));

    if (!user) {
      res.status(401).json({ error: "Invalid phone number or password" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid phone number or password" });
      return;
    }

    req.session.regenerate((err) => {
      if (err) { res.status(500).json({ error: "Session error, please try again" }); return; }
      const sess = req.session as any;
      sess.customerId = user.id;
      sess.customerPhone = user.phone;
      sess.customerName = user.name;
      sess.customerDbId = user.customerId;
      res.json({ role: "customer", id: user.id, phone: user.phone, name: user.name, customerId: user.customerId });
    });
  }
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid", { path: "/", httpOnly: true, sameSite: "lax" });
    res.json({ success: true });
  });
});

router.get("/auth/me", (req, res): void => {
  if (req.session.isAdmin) {
    res.json({ authenticated: true, username: req.session.username });
  } else {
    res.json({ authenticated: false, username: null });
  }
});

export default router;
