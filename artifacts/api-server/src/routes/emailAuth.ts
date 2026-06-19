import { Router, type IRouter } from "express";
import { createHash, randomBytes, randomInt } from "crypto";
import { eq, and, gt, isNull, desc, sql } from "drizzle-orm";
import {
  db,
  customerUsersTable,
  customersTable,
  emailVerificationsTable,
  passwordResetTokensTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "../lib/email";
import { checkRateLimit } from "../lib/rateLimit";
import { logAuthEvent, getClientIp } from "../lib/authAudit";

const router: IRouter = Router();

function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateVerificationToken(): { raw: string; hash: string } {
  const raw = randomBytes(32).toString("hex");
  return { raw, hash: hashValue(raw) };
}

function generateReferralCode(name: string): string {
  const base = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toUpperCase() || "USER";
  return `${base}${randomBytes(3).toString("hex").toUpperCase()}`;
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

// ─── Email Signup Step 1: Request OTP ────────────────────────────────────────

router.post("/auth/email-signup/request", async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Valid email address is required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    if (!(await checkRateLimit(`email-signup:${emailLower}`, 3, 30 * 60 * 1000))) {
      await logAuthEvent("email_signup_otp_failed", null, getClientIp(req), { reason: "rate_limited", email: emailLower });
      res.status(429).json({ error: "Too many requests. Please wait 30 minutes." });
      return;
    }

    const [existing] = await db
      .select({ id: customerUsersTable.id })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.email, emailLower))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "An account with this email already exists. Try logging in." });
      return;
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(emailVerificationsTable).values({
      email: emailLower,
      otpHash: hashValue(otp),
      expiresAt,
    });

    await sendOtpEmail(emailLower, otp, "signup");

    await logAuthEvent("email_signup_otp_sent", null, getClientIp(req), { email: emailLower });
    req.log.info({ email: emailLower }, "email-signup: OTP sent");
    res.json({ sent: true });
  } catch (err) {
    req.log.error({ err }, "email-signup/request: error");
    res.status(500).json({ error: "Failed to send code. Please try again." });
  }
});

// ─── Email Signup Step 2: Verify OTP ─────────────────────────────────────────

router.post("/auth/email-signup/verify", async (req, res): Promise<void> => {
  try {
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

    if (hashValue(String(otp).trim()) !== record.otpHash) {
      await logAuthEvent("email_signup_otp_failed", null, getClientIp(req), { email: emailLower, attempt: record.attemptCount + 1 });
      const remaining = 4 - record.attemptCount;
      res.status(400).json({
        error: `Wrong code. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? "" : "s"} left.` : "Request a new code."}`,
      });
      return;
    }

    const { raw, hash } = generateVerificationToken();
    await db
      .update(emailVerificationsTable)
      .set({ verifiedAt: new Date(), verifiedTokenHash: hash })
      .where(eq(emailVerificationsTable.id, record.id));

    req.log.info({ email: emailLower }, "email-signup: OTP verified");
    res.json({ verified: true, verificationToken: raw });
  } catch (err) {
    req.log.error({ err }, "email-signup/verify: error");
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
});

// ─── Email Signup Step 3: Complete ───────────────────────────────────────────

router.post("/auth/email-signup/complete", async (req, res): Promise<void> => {
  try {
    const { email, name, password, verificationToken } = req.body;
    if (!email || !name || !password || !verificationToken) {
      res.status(400).json({ error: "email, name, password, and verificationToken are required" });
      return;
    }
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    if (!String(name).trim()) {
      res.status(400).json({ error: "Name is required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const tokenHash = hashValue(verificationToken);
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

    const [record] = await db
      .select()
      .from(emailVerificationsTable)
      .where(
        and(
          eq(emailVerificationsTable.email, emailLower),
          eq(emailVerificationsTable.verifiedTokenHash, tokenHash),
          gt(emailVerificationsTable.verifiedAt!, fifteenMinsAgo),
        ),
      )
      .limit(1);

    if (!record) {
      res.status(400).json({ error: "Verification expired. Please start again." });
      return;
    }

    const [alreadyExists] = await db
      .select({ id: customerUsersTable.id })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.email, emailLower))
      .limit(1);
    if (alreadyExists) {
      res.status(409).json({ error: "This email is already registered. Try logging in." });
      return;
    }

    const displayName = String(name).trim();
    const passwordHash = await bcrypt.hash(password, 12);

    const [customer] = await db
      .insert(customersTable)
      .values({ name: displayName, contact: emailLower })
      .returning();
    if (!customer) {
      res.status(500).json({ error: "Failed to create account" });
      return;
    }

    let referralCode = generateReferralCode(displayName);
    for (let i = 0; i < 5; i++) {
      const [collision] = await db
        .select({ id: customerUsersTable.id })
        .from(customerUsersTable)
        .where(eq(customerUsersTable.referralCode, referralCode))
        .limit(1);
      if (!collision) break;
      referralCode = generateReferralCode(displayName);
    }

    const [user] = await db
      .insert(customerUsersTable)
      .values({
        email: emailLower,
        passwordHash,
        name: displayName,
        customerId: customer.id,
        authProvider: "email",
        emailVerified: true,
        referralCode,
      })
      .returning();
    if (!user) {
      res.status(500).json({ error: "Failed to create user" });
      return;
    }

    await regenerateSession(req);
    const sess = req.session as any;
    sess.customerId = user.id;
    sess.customerPhone = null;
    sess.customerName = user.name;
    sess.customerDbId = customer.id;
    await saveSession(req);

    await logAuthEvent("email_signup_complete", user.id, getClientIp(req), { email: emailLower });
    req.log.info({ userId: user.id }, "email-signup: complete");
    res.status(201).json({
      id: user.id,
      email: user.email,
      name: user.name,
      customerId: customer.id,
      isNewAccount: true,
    });
  } catch (err) {
    req.log.error({ err }, "email-signup/complete: error");
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
});

// ─── Forgot Password: Request OTP ────────────────────────────────────────────

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "Valid email address is required" });
      return;
    }

    const emailLower = email.toLowerCase().trim();

    if (!(await checkRateLimit(`forgot:${emailLower}`, 3, 60 * 60 * 1000))) {
      await logAuthEvent("forgot_password_requested", null, getClientIp(req), { reason: "rate_limited", email: emailLower });
      res.status(429).json({ error: "Too many requests. Please wait before trying again." });
      return;
    }

    const [user] = await db
      .select({ id: customerUsersTable.id })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.email, emailLower))
      .limit(1);

    if (user) {
      await db
        .update(passwordResetTokensTable)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(passwordResetTokensTable.customerUserId, user.id),
            isNull(passwordResetTokensTable.usedAt),
          ),
        );

      const otp = generateOtp();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.insert(passwordResetTokensTable).values({
        customerUserId: user.id,
        otpHash: hashValue(otp),
        expiresAt,
      });

      await sendOtpEmail(emailLower, otp, "reset");
      await logAuthEvent("forgot_password_requested", user.id, getClientIp(req), { email: emailLower });
      req.log.info({ userId: user.id }, "forgot-password: OTP sent");
    } else {
      req.log.info({ email: emailLower }, "forgot-password: email not found (silent)");
    }

    res.json({ sent: true });
  } catch (err) {
    req.log.error({ err }, "forgot-password: error");
    res.status(500).json({ error: "Request failed. Please try again." });
  }
});

// ─── Forgot Password: Reset ───────────────────────────────────────────────────

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: "email, otp, and newPassword are required" });
      return;
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const now = new Date();

    const [user] = await db
      .select({ id: customerUsersTable.id })
      .from(customerUsersTable)
      .where(eq(customerUsersTable.email, emailLower))
      .limit(1);

    if (!user) {
      res.status(400).json({ error: "Invalid or expired code." });
      return;
    }

    const [token] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.customerUserId, user.id),
          isNull(passwordResetTokensTable.usedAt),
          gt(passwordResetTokensTable.expiresAt, now),
        ),
      )
      .orderBy(desc(passwordResetTokensTable.createdAt))
      .limit(1);

    if (!token) {
      res.status(400).json({ error: "Code expired or not found. Please request a new one." });
      return;
    }
    if (token.attemptCount >= 5) {
      res.status(400).json({ error: "Too many wrong attempts. Please request a new code." });
      return;
    }

    await db
      .update(passwordResetTokensTable)
      .set({ attemptCount: token.attemptCount + 1 })
      .where(eq(passwordResetTokensTable.id, token.id));

    if (hashValue(String(otp).trim()) !== token.otpHash) {
      await logAuthEvent("password_reset_otp_failed", user.id, getClientIp(req), { attempt: token.attemptCount + 1 });
      const remaining = 4 - token.attemptCount;
      res.status(400).json({
        error: `Wrong code. ${remaining > 0 ? `${remaining} attempt${remaining === 1 ? "" : "s"} left.` : "Request a new code."}`,
      });
      return;
    }

    await db
      .update(passwordResetTokensTable)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokensTable.id, token.id));

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await db
      .update(customerUsersTable)
      .set({ passwordHash })
      .where(eq(customerUsersTable.id, user.id));

    await db.execute(
      sql`DELETE FROM user_sessions WHERE sess::jsonb->>'customerId' = ${String(user.id)}`,
    );

    await logAuthEvent("password_reset_complete", user.id, getClientIp(req));
    req.log.info({ userId: user.id }, "reset-password: success");
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "reset-password: error");
    res.status(500).json({ error: "Password reset failed. Please try again." });
  }
});

export default router;
