import { Router, type IRouter } from "express";
import { randomBytes, randomInt, createHash } from "crypto";
import { eq, sql, and, isNull, gt, desc } from "drizzle-orm";
import { logAuthEvent, getClientIp } from "../lib/authAudit";
import { checkRateLimit } from "../lib/rateLimit";
import { db, customerUsersTable, customersTable, sellersTable, emailVerificationsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { useSecureCookies, cookieSameSite } from "../app";
import { sendOtpEmail } from "../lib/email";

const googleAuthClient = new OAuth2Client();

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
  const rnd = randomBytes(3).toString("hex").toUpperCase();
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
      .where(and(eq(customerUsersTable.phone, phone), isNull(customerUsersTable.deletedAt)));

    if (!user) {
      await logAuthEvent("login_failure", null, getClientIp(req), { method: "phone" });
      req.log.info({ phone }, "customer login: user not found");
      res.status(401).json({ error: "Invalid number or password" });
      return;
    }

    if (!user.passwordHash) {
      req.log.info({ userId: user.id }, "customer login: account has no password (Google-only account)");
      res.status(401).json({ error: "This account uses Google Sign-In. Please use 'Continue with Google'." });
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
      await logAuthEvent("login_failure", user.id, getClientIp(req), { method: "phone", reason: "bad_password" });
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

    await logAuthEvent("login_success", user.id, getClientIp(req), { method: "phone" });
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

    if (!user || user.deletedAt) {
      req.session.destroy(() => {});
      res.status(401).json({ error: "Account not found or has been deleted" });
      return;
    }

    res.json({
      id: sess.customerId,
      phone: sess.customerPhone ?? null,
      email: user.email ?? null,
      name: sess.customerName,
      customerId: sess.customerDbId,
      referralCode: user.referralCode ?? null,
      hasPassword: !!user.passwordHash,
      hasGoogle: !!user.googleId,
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
      // Also try customer by email
      const [customerByEmail] = await db
        .select()
        .from(customerUsersTable)
        .where(sql`LOWER(${customerUsersTable.email}) = ${trimmed.toLowerCase()} AND ${customerUsersTable.deletedAt} IS NULL`)
        .limit(1);

      if (customerByEmail) {
        if (!customerByEmail.passwordHash) {
          res.status(401).json({ error: "This account uses Google Sign-In. Please use 'Continue with Google'." });
          return;
        }
        const ok = await bcrypt.compare(password, customerByEmail.passwordHash);
        if (!ok) {
          req.log.info({ userId: customerByEmail.id }, "auth/login: customer email password mismatch");
          res.status(401).json({ error: "Invalid email or password" });
          return;
        }
        await setCustomerSession(customerByEmail);
        await logAuthEvent("login_success", customerByEmail.id, getClientIp(req), { method: "email" });
        req.log.info({ userId: customerByEmail.id }, "auth/login: customer email login success");
        res.json({
          role: "customer",
          user: {
            id: customerByEmail.id,
            email: customerByEmail.email,
            name: customerByEmail.name,
            customerId: customerByEmail.customerId,
          },
        });
        return;
      }

      req.log.info({ identifier: trimmed }, "auth/login: no account found for email");
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
        sql`regexp_replace(${customerUsersTable.phone}, '[^0-9]', '', 'g') = ${phoneNorm} AND ${customerUsersTable.deletedAt} IS NULL`,
      );

    if (customerUser) {
      if (!customerUser.passwordHash) {
        req.log.info({ userId: customerUser.id }, "auth/login: Google-only account attempted phone login");
        res.status(401).json({ error: "This account uses Google Sign-In. Please use 'Continue with Google'." });
        return;
      }

      // Guard against legacy plaintext (should not exist in normal operation).
      if (!customerUser.passwordHash.startsWith("$2")) {
        req.log.warn({ userId: customerUser.id }, "auth/login: detected non-bcrypt hash for customer");
        res.status(401).json({ error: "Invalid number or password" });
        return;
      }

      const ok = await bcrypt.compare(password, customerUser.passwordHash);
      if (ok) {
        await setCustomerSession(customerUser);
        await logAuthEvent("login_success", customerUser.id, getClientIp(req), { method: "phone_unified" });
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
    if (!sess.customerId) {
      res.status(401).json({ error: "Not logged in as customer" });
      return;
    }
    const phoneNorm = normalizePhone(sess.customerPhone ?? "");
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
    if (!sess.customerId) {
      res.status(401).json({ error: "Not logged in as customer" });
      return;
    }
    const phoneNorm = normalizePhone(sess.customerPhone ?? "");
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

// ─── Auth Config (public — returns non-secret config for frontend) ────────────

router.get("/auth/config", (req, res): void => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  });
});

// ─── Google OAuth Callback ────────────────────────────────────────────────────

router.post("/auth/google/callback", async (req, res): Promise<void> => {
  try {
    const { credential } = req.body;
    if (!credential || typeof credential !== "string") {
      res.status(400).json({ error: "credential is required" });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(503).json({ error: "Google login is not configured" });
      return;
    }

    let ticket;
    try {
      ticket = await googleAuthClient.verifyIdToken({ idToken: credential, audience: clientId });
    } catch (e) {
      req.log.warn({ err: e }, "google auth: invalid ID token");
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ error: "Invalid Google token payload" });
      return;
    }

    const { sub: googleId, email, name: googleName, email_verified } = payload;

    if (!email_verified) {
      res.status(401).json({ error: "Google account email is not verified" });
      return;
    }
    if (!email || !googleId) {
      res.status(400).json({ error: "Google account is missing email or ID" });
      return;
    }

    // 1. Find by google_id (returning user)
    let isNewAccount = false;
    let [user] = await db
      .select()
      .from(customerUsersTable)
      .where(eq(customerUsersTable.googleId, googleId));

    if (!user) {
      // 2. Find by email (link existing phone account)
      const [byEmail] = await db
        .select()
        .from(customerUsersTable)
        .where(eq(customerUsersTable.email, email));

      if (byEmail) {
        [user] = await db
          .update(customerUsersTable)
          .set({ googleId, emailVerified: true })
          .where(eq(customerUsersTable.id, byEmail.id))
          .returning();
      } else {
        // 3. New user — create CRM record + auth record
        isNewAccount = true;
        const displayName = (googleName || email.split("@")[0]).trim();

        const [customer] = await db
          .insert(customersTable)
          .values({ name: displayName, contact: email })
          .returning();

        if (!customer) {
          req.log.error("google auth: failed to create customer record");
          res.status(500).json({ error: "Failed to create account" });
          return;
        }

        let myReferralCode = generateReferralCode(displayName);
        for (let i = 0; i < 5; i++) {
          const [collision] = await db
            .select({ id: customerUsersTable.id })
            .from(customerUsersTable)
            .where(eq(customerUsersTable.referralCode, myReferralCode))
            .limit(1);
          if (!collision) break;
          myReferralCode = generateReferralCode(displayName);
        }

        [user] = await db
          .insert(customerUsersTable)
          .values({
            googleId,
            email,
            emailVerified: true,
            authProvider: "google",
            name: displayName,
            customerId: customer.id,
            referralCode: myReferralCode,
          })
          .returning();
      }
    }

    if (!user) {
      res.status(500).json({ error: "Failed to create or retrieve account" });
      return;
    }

    await regenerateSession(req);
    const sess = req.session as any;
    sess.customerId = user.id;
    sess.customerPhone = user.phone ?? null;
    sess.customerName = user.name;
    sess.customerDbId = user.customerId;
    await saveSession(req);

    await logAuthEvent("google_login_success", user.id, getClientIp(req), { isNewAccount });
    req.log.info({ userId: user.id, provider: "google" }, "google auth: login success");

    res.json({
      id: user.id,
      phone: user.phone ?? null,
      email: user.email ?? null,
      name: user.name,
      customerId: user.customerId,
      isNewAccount,
      hasPassword: !!user.passwordHash,
      hasGoogle: true,
    });
  } catch (err) {
    req.log.error({ err }, "google auth: unexpected error");
    res.status(500).json({ error: "Google login failed, please try again" });
  }
});

// ─── Set / Change Password ────────────────────────────────────────────────────

router.post("/customer/set-password", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId) {
      res.status(401).json({ error: "Login required" });
      return;
    }

    const { newPassword, currentPassword } = req.body;
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
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

    if (user.passwordHash) {
      if (!currentPassword) {
        res.status(400).json({ error: "Current password is required to set a new one" });
        return;
      }
      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }
    }

    await logAuthEvent("password_changed", sess.customerId, getClientIp(req));
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(customerUsersTable)
      .set({ passwordHash })
      .where(eq(customerUsersTable.id, user.id));

    req.log.info({ userId: user.id }, "customer: password set/changed");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "customer/set-password: error");
    res.status(500).json({ error: "Failed to set password. Please try again." });
  }
});

// ─── Link Google Account ──────────────────────────────────────────────────────

router.post("/customer/link-google", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId) {
      res.status(401).json({ error: "Login required" });
      return;
    }

    const { credential } = req.body;
    if (!credential || typeof credential !== "string") {
      res.status(400).json({ error: "credential is required" });
      return;
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      res.status(503).json({ error: "Google login is not configured" });
      return;
    }

    let ticket;
    try {
      ticket = await googleAuthClient.verifyIdToken({ idToken: credential, audience: clientId });
    } catch {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(401).json({ error: "Invalid Google token payload" });
      return;
    }

    const { sub: googleId, email, email_verified } = payload;
    if (!email_verified) {
      res.status(401).json({ error: "Google account email is not verified" });
      return;
    }
    if (!email || !googleId) {
      res.status(400).json({ error: "Google account missing email or ID" });
      return;
    }

    const [byGoogleId] = await db
      .select({ id: customerUsersTable.id })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.googleId, googleId))
      .limit(1);

    if (byGoogleId && byGoogleId.id !== sess.customerId) {
      res.status(409).json({ error: "This Google account is already linked to another account." });
      return;
    }

    const [byEmail] = await db
      .select({ id: customerUsersTable.id })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.email, email))
      .limit(1);

    if (byEmail && byEmail.id !== sess.customerId) {
      res.status(409).json({ error: "This Google email is already used by another account." });
      return;
    }

    await db
      .update(customerUsersTable)
      .set({ googleId, email, emailVerified: true, authProvider: "google" })
      .where(eq(customerUsersTable.id, sess.customerId));

    await logAuthEvent("google_linked", sess.customerId, getClientIp(req), { email });
    req.log.info({ userId: sess.customerId }, "customer: Google account linked");
    res.json({ linked: true, email });
  } catch (err) {
    req.log.error({ err }, "customer/link-google: error");
    res.status(500).json({ error: "Failed to link Google account. Please try again." });
  }
});

// ─── Unlink Google Account ────────────────────────────────────────────────────

router.post("/customer/unlink-google", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId) {
      res.status(401).json({ error: "Login required" });
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
    if (!user.googleId) {
      res.status(400).json({ error: "No Google account is linked." });
      return;
    }
    if (!user.passwordHash) {
      res.status(400).json({
        error: "Set a password first before unlinking Google, otherwise you will lose account access.",
      });
      return;
    }

    await db
      .update(customerUsersTable)
      .set({ googleId: null, authProvider: user.phone ? "phone" : "email" })
      .where(eq(customerUsersTable.id, sess.customerId));

    await logAuthEvent("google_unlinked", sess.customerId, getClientIp(req));
    req.log.info({ userId: sess.customerId }, "customer: Google account unlinked");
    res.json({ unlinked: true });
  } catch (err) {
    req.log.error({ err }, "customer/unlink-google: error");
    res.status(500).json({ error: "Failed to unlink Google account. Please try again." });
  }
});

// ─── Delete Account (Soft Delete) ────────────────────────────────────────────

router.delete("/customer/account", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId) {
      res.status(401).json({ error: "Login required" });
      return;
    }

    const { password } = req.body || {};
    const [user] = await db
      .select()
      .from(customerUsersTable)
      .where(eq(customerUsersTable.id, sess.customerId));

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.passwordHash) {
      if (!password) {
        res.status(400).json({ error: "Password confirmation required to delete account" });
        return;
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Incorrect password" });
        return;
      }
    }

    await db
      .update(customerUsersTable)
      .set({ deletedAt: new Date() })
      .where(eq(customerUsersTable.id, sess.customerId));

    await logAuthEvent("account_deleted", sess.customerId, getClientIp(req));
    req.log.info({ userId: sess.customerId }, "customer: account soft-deleted");

    req.session.destroy(() => {
      clearSessionCookie(res);
      res.json({ deleted: true });
    });
  } catch (err) {
    req.log.error({ err }, "customer/account DELETE: error");
    res.status(500).json({ error: "Failed to delete account. Please try again." });
  }
});

// ─── Email Update: Request OTP ────────────────────────────────────────────────

function hashOtp(v: string): string {
  return createHash("sha256").update(v).digest("hex");
}

router.post("/customer/update-email/request", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId) {
      res.status(401).json({ error: "Login required" });
      return;
    }

    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Valid email address is required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    if (!(await checkRateLimit(`update-email:${sess.customerId}`, 3, 30 * 60 * 1000))) {
      res.status(429).json({ error: "Too many requests. Please wait 30 minutes." });
      return;
    }

    const [existing] = await db
      .select({ id: customerUsersTable.id })
      .from(customerUsersTable)
      .where(and(eq(customerUsersTable.email, emailLower), isNull(customerUsersTable.deletedAt)))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "This email is already in use by another account." });
      return;
    }

    const otp = String(randomInt(100000, 1000000));
    const otpHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(emailVerificationsTable).values({ email: emailLower, otpHash, expiresAt });
    await sendOtpEmail(emailLower, otp, "signup");

    req.log.info({ userId: sess.customerId, email: emailLower }, "customer: email-update OTP sent");
    res.json({ sent: true });
  } catch (err) {
    req.log.error({ err }, "customer/update-email/request: error");
    res.status(500).json({ error: "Failed to send code. Please try again." });
  }
});

// ─── Email Update: Verify OTP ─────────────────────────────────────────────────

router.post("/customer/update-email/verify", async (req, res): Promise<void> => {
  try {
    const sess = req.session as any;
    if (!sess.customerId) {
      res.status(401).json({ error: "Login required" });
      return;
    }

    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: "email and otp are required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const now = new Date();

    const [record] = await db
      .select()
      .from(emailVerificationsTable)
      .where(
        and(
          eq(emailVerificationsTable.email, emailLower),
          isNull(emailVerificationsTable.verifiedAt),
          gt(emailVerificationsTable.expiresAt, now),
        ),
      )
      .orderBy(desc(emailVerificationsTable.createdAt))
      .limit(1);

    if (!record) {
      res.status(400).json({ error: "Code expired or not found. Please request a new one." });
      return;
    }
    if (record.attemptCount >= 5) {
      res.status(400).json({ error: "Too many wrong attempts. Please request a new code." });
      return;
    }

    await db
      .update(emailVerificationsTable)
      .set({ attemptCount: record.attemptCount + 1 })
      .where(eq(emailVerificationsTable.id, record.id));

    if (hashOtp(String(otp).trim()) !== record.otpHash) {
      const remaining = 4 - record.attemptCount;
      res.status(400).json({
        error: `Wrong code. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? "" : "s"} left.` : "Request a new code."}`,
      });
      return;
    }

    await db
      .update(emailVerificationsTable)
      .set({ verifiedAt: new Date() })
      .where(eq(emailVerificationsTable.id, record.id));

    await db
      .update(customerUsersTable)
      .set({ email: emailLower, emailVerified: true })
      .where(eq(customerUsersTable.id, sess.customerId));

    await logAuthEvent("email_changed", sess.customerId, getClientIp(req), { newEmail: emailLower });
    req.log.info({ userId: sess.customerId, email: emailLower }, "customer: email updated");
    res.json({ updated: true, email: emailLower });
  } catch (err) {
    req.log.error({ err }, "customer/update-email/verify: error");
    res.status(500).json({ error: "Email update failed. Please try again." });
  }
});

export default router;
