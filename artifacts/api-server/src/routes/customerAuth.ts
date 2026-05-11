import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, customerUsersTable, customersTable, sellersTable } from "@workspace/db";
import bcrypt from "bcryptjs";

const router: IRouter = Router();

function looksLikeEmail(s: string): boolean {
  return typeof s === "string" && s.includes("@");
}

function normalizePhone(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

function generateReferralCode(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "USER";
  const rnd = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${base}${rnd}`;
}

function saveSession(req: any): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.save((err: any) => (err ? reject(err) : resolve()));
  });
}

function regenerateSession(req: any): Promise<void> {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err: any) => (err ? reject(err) : resolve()));
  });
}

router.post("/customer/signup", async (req, res): Promise<void> => {
  try {
    const { phone, password, name, referralCode } = req.body;

    if (!phone || !password || !name) {
      res.status(400).json({ error: "name, phone, and password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const existing = await db.select().from(customerUsersTable).where(eq(customerUsersTable.phone, phone));
    if (existing.length > 0) {
      res.status(409).json({ error: "An account with this number already exists" });
      return;
    }

    let referredByUserId: number | null = null;
    if (referralCode && typeof referralCode === "string") {
      const [referrer] = await db
        .select()
        .from(customerUsersTable)
        .where(eq(customerUsersTable.referralCode, referralCode.trim().toUpperCase()));
      if (referrer) referredByUserId = referrer.id;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [customer] = await db.insert(customersTable).values({
      name,
      contact: phone,
    }).returning();

    if (!customer) {
      res.status(500).json({ error: "Failed to create customer record" });
      return;
    }

    // Generate a unique referral code (retry on rare collision)
    let myReferralCode = generateReferralCode(name);
    for (let i = 0; i < 5; i++) {
      const [collision] = await db
        .select({ id: customerUsersTable.id })
        .from(customerUsersTable)
        .where(eq(customerUsersTable.referralCode, myReferralCode))
        .limit(1);
      if (!collision) break;
      myReferralCode = generateReferralCode(name);
    }

    const [user] = await db.insert(customerUsersTable).values({
      phone,
      passwordHash,
      name,
      customerId: customer.id,
      referralCode: myReferralCode,
      referredByUserId,
    }).returning();

    if (!user) {
      res.status(500).json({ error: "Failed to create user record" });
      return;
    }

    // Notify the referrer (non-blocking, ignore errors)
    if (referredByUserId) {
      import("../lib/notify").then(({ createNotification }) =>
        createNotification({
          customerUserId: referredByUserId!,
          type: "system",
          title: "New referral signup!",
          message: `${name} signed up using your referral code. Thanks for spreading the word!`,
          link: "/my",
        })
      ).catch(() => {});
    }

    await regenerateSession(req);
    const sess = req.session as any;
    sess.customerId = user.id;
    sess.customerPhone = user.phone;
    sess.customerName = user.name;
    sess.customerDbId = customer.id;
    await saveSession(req);

    res.status(201).json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      customerId: customer.id,
    });
  } catch (err) {
    req.log.error({ err }, "customer signup failed");
    res.status(500).json({ error: "Signup failed, please try again" });
  }
});

router.post("/customer/login", async (req, res): Promise<void> => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      res.status(400).json({ error: "phone and password are required" });
      return;
    }

    const [user] = await db.select().from(customerUsersTable).where(eq(customerUsersTable.phone, phone));
    if (!user) {
      res.status(401).json({ error: "Invalid number or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid number or password" });
      return;
    }

    await regenerateSession(req);
    const sess = req.session as any;
    sess.customerId = user.id;
    sess.customerPhone = user.phone;
    sess.customerName = user.name;
    sess.customerDbId = user.customerId;
    await saveSession(req);

    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      customerId: user.customerId,
    });
  } catch (err) {
    req.log.error({ err }, "customer login failed");
    res.status(500).json({ error: "Login failed, please try again" });
  }
});

router.post("/customer/logout", (req, res): void => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

router.get("/customer/me", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId) {
      res.status(401).json({ error: "Not logged in" });
      return;
    }
    const [user] = await db
      .select()
      .from(customerUsersTable)
      .where(eq(customerUsersTable.id, sess.customerId));
    res.json({
      id: sess.customerId,
      phone: sess.customerPhone,
      name: sess.customerName,
      customerId: sess.customerDbId,
      referralCode: user?.referralCode ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "customer/me failed");
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

router.get("/customer/referral", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId) {
      res.status(401).json({ error: "Not logged in" });
      return;
    }
    const [user] = await db
      .select()
      .from(customerUsersTable)
      .where(eq(customerUsersTable.id, sess.customerId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.referredByUserId, sess.customerId));
    res.json({
      referralCode: user.referralCode,
      referralCount: count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "customer/referral failed");
    res.status(500).json({ error: "Failed to fetch referral info" });
  }
});

// Unified login: accepts a single identifier (phone OR email) + password.
// Tries to authenticate against customers (by phone) and sellers (by email or phone).
router.post("/auth/login", async (req, res): Promise<void> => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      res.status(400).json({ error: "identifier and password are required" });
      return;
    }

    const isEmail = looksLikeEmail(identifier);
    const trimmed = String(identifier).trim();
    const phoneNorm = normalizePhone(trimmed);

    const setSellerSession = async (seller: typeof sellersTable.$inferSelect) => {
      await regenerateSession(req);
      const sess = req.session as any;
      sess.sellerId = seller.id;
      sess.sellerName = seller.name;
      sess.sellerEmail = seller.email;
      sess.sellerStatus = seller.status;
      await saveSession(req);
    };

    const setCustomerSession = async (u: typeof customerUsersTable.$inferSelect) => {
      await regenerateSession(req);
      const sess = req.session as any;
      sess.customerId = u.id;
      sess.customerPhone = u.phone;
      sess.customerName = u.name;
      sess.customerDbId = u.customerId;
      await saveSession(req);
    };

    // 1) If looks like email, try seller by email first.
    if (isEmail) {
      const [seller] = await db
        .select()
        .from(sellersTable)
        .where(sql`LOWER(${sellersTable.email}) = ${trimmed.toLowerCase()}`);
      if (seller) {
        const ok = await bcrypt.compare(password, seller.passwordHash);
        if (!ok) {
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
        await setSellerSession(seller);
        res.json({
          role: "seller",
          user: { id: seller.id, name: seller.name, email: seller.email, status: seller.status },
        });
        return;
      }
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // 2) Phone path: try customer by exact match first.
    const [customerUser] = await db
      .select()
      .from(customerUsersTable)
      .where(eq(customerUsersTable.phone, trimmed));
    if (customerUser) {
      const ok = await bcrypt.compare(password, customerUser.passwordHash);
      if (ok) {
        await setCustomerSession(customerUser);
        res.json({
          role: "customer",
          user: {
            id: customerUser.id,
            phone: customerUser.phone,
            name: customerUser.name,
            customerId: customerUser.customerId,
          },
        });
        return;
      }
    }

    // 3) Fallback: try seller by phone (digits-only match).
    const sellersByPhone = await db
      .select()
      .from(sellersTable)
      .where(sql`regexp_replace(${sellersTable.phone}, '[^0-9]', '', 'g') = ${phoneNorm}`);
    for (const seller of sellersByPhone) {
      const ok = await bcrypt.compare(password, seller.passwordHash);
      if (!ok) continue;
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
      await setSellerSession(seller);
      res.json({
        role: "seller",
        user: { id: seller.id, name: seller.name, email: seller.email, status: seller.status },
      });
      return;
    }

    res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    req.log.error({ err }, "auth/login failed");
    res.status(500).json({ error: "Login failed, please try again" });
  }
});

router.get("/customer/seller-status", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId || !sess.customerPhone) {
      res.status(401).json({ error: "Not logged in as customer" });
      return;
    }
    const phoneNorm = normalizePhone(sess.customerPhone);
    const matches = await db
      .select()
      .from(sellersTable)
      .where(sql`regexp_replace(${sellersTable.phone}, '[^0-9]', '', 'g') = ${phoneNorm}`);
    if (matches.length === 0) {
      res.json({ exists: false });
      return;
    }
    const approved = matches.find((s) => s.status === "approved");
    const chosen = approved || matches[0];
    res.json({
      exists: true,
      sellerId: chosen.id,
      status: chosen.status,
      name: chosen.name,
      email: chosen.email,
    });
  } catch (err) {
    req.log.error({ err }, "customer/seller-status failed");
    res.status(500).json({ error: "Failed to fetch seller status" });
  }
});

router.post("/customer/become-seller", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId || !sess.customerPhone) {
      res.status(401).json({ error: "Not logged in as customer" });
      return;
    }
    const phoneNorm = normalizePhone(sess.customerPhone);
    const matches = await db
      .select()
      .from(sellersTable)
      .where(sql`regexp_replace(${sellersTable.phone}, '[^0-9]', '', 'g') = ${phoneNorm}`);
    if (matches.length === 0) {
      res.json({ linked: false, status: "none" });
      return;
    }
    const approved = matches.find((s) => s.status === "approved");
    if (!approved) {
      const chosen = matches[0];
      res.json({
        linked: false,
        status: chosen.status,
        message:
          chosen.status === "pending"
            ? "Your seller application is still under review by admin"
            : chosen.status === "rejected"
            ? `Your seller application was rejected${chosen.rejectionReason ? `: ${chosen.rejectionReason}` : ""}`
            : "Your seller account is currently unavailable",
      });
      return;
    }
    // Attach seller session
    sess.sellerId = approved.id;
    sess.sellerName = approved.name;
    sess.sellerEmail = approved.email;
    sess.sellerStatus = approved.status;
    await saveSession(req);
    res.json({
      linked: true,
      status: "approved",
      seller: { id: approved.id, name: approved.name, email: approved.email },
    });
  } catch (err) {
    req.log.error({ err }, "customer/become-seller failed");
    res.status(500).json({ error: "Failed to process request" });
  }
});

export default router;
