import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, customerUsersTable, customersTable, sellersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { useSecureCookies, cookieSameSite } from "../app";

const router: IRouter = Router();

function looksLikeEmail(s: string): boolean {
  return typeof s === "string" && s.includes("@");
}

/** Strip all non-digit characters for phone comparison (dashes, spaces, +). */
function normalizePhone(s: string): string {
  return String(s || "").replace(/\D/g, "");
}

/**
 * Canonical phone: trim outer whitespace then strip formatting characters
 * so that "0300-123-4567", "0300 1234567", and "03001234567" all resolve
 * to the same canonical form stored in and queried from the database.
 */
function canonicalPhone(s: string): string {
  return normalizePhone(String(s || "").trim());
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

const clearSessionCookie = (res: any) => {
  res.clearCookie("connect.sid", {
    path: "/",
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: cookieSameSite,
  });
};

// ─── Customer Signup ────────────────────────────────────────────────────────

router.post("/customer/signup", async (req, res): Promise<void> => {
  try {
    const { phone: rawPhone, password, name, referralCode } = req.body;

    if (!rawPhone || !password || !name) {
      res.status(400).json({ error: "name, phone, and password are required" });
      return;
    }

    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    // Store a canonical phone number so all lookup paths match.
    const phone = canonicalPhone(rawPhone);
    if (!phone || phone.length < 6) {
      res.status(400).json({ error: "Please enter a valid phone number" });
      return;
    }

    const existing = await db
      .select({ id: customerUsersTable.id })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.phone, phone))
      .limit(1);
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

    // Hash the password — bcrypt.hash is always async; never store plaintext.
    const passwordHash = await bcrypt.hash(password, 10);

    const [customer] = await db
      .insert(customersTable)
      .values({ name: String(name).trim(), contact: phone })
      .returning();

    if (!customer) {
      req.log.error("customer signup: failed to create customer record");
      res.status(500).json({ error: "Failed to create customer record" });
      return;
    }

    // Generate a unique referral code (retry on rare collision).
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

    const [user] = await db
      .insert(customerUsersTable)
      .values({
        phone,
        passwordHash,
        name: String(name).trim(),
        customerId: customer.id,
        referralCode: myReferralCode,
        referredByUserId,
      })
      .returning();

    if (!user) {
      req.log.error("customer signup: failed to create user record");
      res.status(500).json({ error: "Failed to create user record" });
      return;
    }

    req.log.info({ userId: user.id, phone }, "customer signup: success");

    // Notify the referrer (non-blocking, ignore errors).
    if (referredByUserId) {
      import("../lib/notify")
        .then(({ createNotification }) =>
          createNotification({
            customerUserId: referredByUserId!,
            type: "system",
            title: "New referral signup!",
            message: `${name} signed up using your referral code. Thanks for spreading the word!`,
            link: "/my",
          }),
        )
        .catch(() => {});
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
    req.log.error({ err }, "customer signup: unexpected error");
    res.status(500).json({ error: "Signup failed, please try again" });
  }
});

// ─── Customer Login (direct endpoint) ───────────────────────────────────────

router.post("/customer/login", async (req, res): Promise<void> => {
  try {
    const { phone: rawPhone, password } = req.body;

    if (!rawPhone || !password) {
      res.status(400).json({ error: "phone and password are required" });
      return;
    }

    // Normalise the phone the same way we stored it at signup.
    const phone = canonicalPhone(rawPhone);

    const [user] = await db
      .select()
      .from(customerUsersTable)
      .where(eq(customerUsersTable.phone, phone));

    if (!user) {
      req.log.info({ phone }, "customer login: user not found");
      res.status(401).json({ error: "Invalid number or password" });
      return;
    }

    // Guard against legacy plaintext values (should not exist in normal flow).
    if (!user.passwordHash.startsWith("$2")) {
      req.log.warn({ userId: user.id }, "customer login: detected non-bcrypt hash, auto-rehashing");
      const rehashed = await bcrypt.hash(user.passwordHash, 10);
      await db
        .update(customerUsersTable)
        .set({ passwordHash: rehashed })
        .where(eq(customerUsersTable.id, user.id));
      req.log.info({ userId: user.id }, "customer login: auto-rehash complete — user must reset password");
      res.status(401).json({ error: "Invalid number or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      req.log.info({ userId: user.id }, "customer login: password mismatch");
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

    req.log.info({ userId: user.id }, "customer login: success");

    res.json({
      id: user.id,
      phone: user.phone,
      name: user.name,
      customerId: user.customerId,
    });
  } catch (err) {
    req.log.error({ err }, "customer login: unexpected error");
    res.status(500).json({ error: "Login failed, please try again" });
  }
});

// ─── Customer Logout ─────────────────────────────────────────────────────────

router.post("/customer/logout", (req, res): void => {
  req.session.destroy(() => {
    clearSessionCookie(res);
    res.json({ success: true });
  });
});

// ─── Customer /me ─────────────────────────────────────────────────────────────

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
    req.log.error({ err }, "customer/me: unexpected error");
    res.status(500).json({ error: "Failed to fetch user info" });
  }
});

// ─── Customer Referral ────────────────────────────────────────────────────────

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
    req.log.error({ err }, "customer/referral: unexpected error");
    res.status(500).json({ error: "Failed to fetch referral info" });
  }
});

// ─── Unified Login (/auth/login) ──────────────────────────────────────────────
//
// Accepts a single identifier (phone OR email) + password.
// Tries customer (by normalised phone) then seller (by email or phone).

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

    // 1) Email → try seller by email.
    if (isEmail) {
      const [seller] = await db
        .select()
        .from(sellersTable)
        .where(sql`LOWER(${sellersTable.email}) = ${trimmed.toLowerCase()}`);
      if (seller) {
        const ok = await bcrypt.compare(password, seller.passwordHash);
        if (!ok) {
          req.log.info({ sellerId: seller.id }, "auth/login: seller email password mismatch");
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
        req.log.info({ sellerId: seller.id }, "auth/login: seller login success (email)");
        res.json({
          role: "seller",
          user: { id: seller.id, name: seller.name, email: seller.email, status: seller.status },
        });
        return;
      }
      req.log.info({ identifier: trimmed }, "auth/login: seller not found by email");
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // 2) Phone → normalise and try customer first (digits-only match).
    //    Using regexp_replace on the stored value is resilient to any format
    //    the phone was stored in (e.g. "0300-123-4567" stored vs "03001234567" entered).
    const [customerUser] = await db
      .select()
      .from(customerUsersTable)
      .where(
        sql`regexp_replace(${customerUsersTable.phone}, '[^0-9]', '', 'g') = ${phoneNorm}`,
      );

    if (customerUser) {
      // Guard against legacy plaintext (should not exist in normal operation).
      if (!customerUser.passwordHash.startsWith("$2")) {
        req.log.warn({ userId: customerUser.id }, "auth/login: detected non-bcrypt hash for customer");
        res.status(401).json({ error: "Invalid number or password" });
        return;
      }

      const ok = await bcrypt.compare(password, customerUser.passwordHash);
      if (ok) {
        await setCustomerSession(customerUser);
        req.log.info({ userId: customerUser.id }, "auth/login: customer login success");
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
      req.log.info({ userId: customerUser.id }, "auth/login: customer password mismatch");
      // Don't fall through to seller check — the identifier matched a customer.
      res.status(401).json({ error: "Invalid number or password" });
      return;
    }

    // 3) No customer found → try seller by phone (digits-only match).
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
      req.log.info({ sellerId: seller.id }, "auth/login: seller login success (phone)");
      res.json({
        role: "seller",
        user: { id: seller.id, name: seller.name, email: seller.email, status: seller.status },
      });
      return;
    }

    req.log.info({ identifier: trimmed }, "auth/login: no matching account found");
    res.status(401).json({ error: "Invalid credentials" });
  } catch (err) {
    req.log.error({ err }, "auth/login: unexpected error");
    res.status(500).json({ error: "Login failed, please try again" });
  }
});

// ─── Customer Seller-Status ───────────────────────────────────────────────────

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
    req.log.error({ err }, "customer/seller-status: unexpected error");
    res.status(500).json({ error: "Failed to fetch seller status" });
  }
});

// ─── Customer Become-Seller ───────────────────────────────────────────────────

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
    // Attach seller session.
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
    req.log.error({ err }, "customer/become-seller: unexpected error");
    res.status(500).json({ error: "Failed to process request" });
  }
});

export default router;
