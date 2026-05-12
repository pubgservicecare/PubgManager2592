import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, sellersTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { useSecureCookies, cookieSameSite } from "../app";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    sellerId?: number;
    sellerName?: string;
    sellerEmail?: string;
    sellerStatus?: string;
  }
}

const clearSessionCookie = (res: any) => {
  // Must exactly match the session cookie attributes or the browser won't clear it.
  res.clearCookie("connect.sid", {
    path: "/",
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: cookieSameSite,
  });
};

router.post("/seller/signup", async (req, res): Promise<void> => {
  try {
    // POLICY: Every account starts as a customer. To apply for seller verification,
    // the user must already be logged in as a customer. This endpoint is the
    // backend half of the "Become a Seller" flow and cannot be called by guests.
    const session = (req as any).session;
    if (!session?.customerId) {
      res.status(401).json({ error: "Please sign in as a customer first, then apply to become a seller." });
      return;
    }

    const {
      name,
      username,
      email,
      whatsapp,
      password,
      cnicNumber,
      cnicFrontUrl,
      cnicBackUrl,
      selfieUrl,
    } = req.body;

    // Phone is taken from the customer session, NOT the request body, so the
    // resulting seller row stays linked to the same person on the platform.
    const phone: string | undefined = session.customerPhone;
    if (!phone) {
      res.status(401).json({ error: "Customer session is missing phone number. Please log in again." });
      return;
    }

    if (!name || !username || !email || !password || !cnicNumber || !cnicFrontUrl || !cnicBackUrl || !selfieUrl) {
      res.status(400).json({ error: "All fields are required including username, CNIC photos and selfie" });
      return;
    }

    const normalizedUsername = String(username).trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(normalizedUsername)) {
      res.status(400).json({ error: "Username must be 3-20 characters: letters, numbers, or underscore only" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    if (!/^\d{5}-?\d{7}-?\d$/.test(cnicNumber.replace(/\s/g, ""))) {
      res.status(400).json({ error: "Invalid CNIC number format (must be 13 digits)" });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingByEmail = await db
      .select()
      .from(sellersTable)
      .where(sql`LOWER(${sellersTable.email}) = ${normalizedEmail}`);
    if (existingByEmail.length > 0) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const existingByUsername = await db
      .select({ id: sellersTable.id })
      .from(sellersTable)
      .where(sql`LOWER(${sellersTable.username}) = ${normalizedUsername.toLowerCase()}`);
    if (existingByUsername.length > 0) {
      res.status(409).json({ error: "This username is already taken. Please choose another." });
      return;
    }

    // Reject duplicate applications from the same phone (= same customer).
    const phoneDigits = phone.replace(/\D/g, "");
    const existingByPhone = await db
      .select({ id: sellersTable.id, status: sellersTable.status })
      .from(sellersTable)
      .where(sql`regexp_replace(${sellersTable.phone}, '[^0-9]', '', 'g') = ${phoneDigits}`);
    if (existingByPhone.length > 0) {
      const status = existingByPhone[0].status;
      const messages: Record<string, string> = {
        pending: "You already have a pending seller application. Please wait for admin review.",
        approved: "You're already an approved seller. Use 'Become a Seller' to access your dashboard.",
        rejected: "Your previous application was rejected. Re-apply support is coming soon.",
        suspended: "Your seller account has been suspended. Contact support.",
      };
      res.status(409).json({ error: messages[status] || "A seller account already exists for your phone number." });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [seller] = await db.insert(sellersTable).values({
      name: String(name).trim(),
      username: normalizedUsername,
      email: normalizedEmail,
      phone,
      whatsapp: whatsapp || null,
      passwordHash,
      cnicNumber,
      cnicFrontUrl,
      cnicBackUrl,
      selfieUrl,
      status: "pending",
    }).returning();

    res.status(201).json({
      id: seller.id,
      name: seller.name,
      email: seller.email,
      status: seller.status,
      message: "Application submitted. Please wait for admin verification.",
    });
  } catch (err) {
    req.log.error({ err }, "seller signup failed");
    res.status(500).json({ error: "Signup failed, please try again" });
  }
});

router.post("/seller/login", async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
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
      if (err) {
        res.status(500).json({ error: "Session error, please try again" });
        return;
      }
      req.session.sellerId = seller.id;
      req.session.sellerName = seller.name;
      req.session.sellerEmail = seller.email;
      req.session.sellerStatus = seller.status;
      req.session.save((saveErr) => {
        if (saveErr) {
          res.status(500).json({ error: "Session save error, please try again" });
          return;
        }
        res.json({
          id: seller.id,
          name: seller.name,
          email: seller.email,
          status: seller.status,
        });
      });
    });
  } catch (err) {
    req.log.error({ err }, "seller login failed");
    res.status(500).json({ error: "Login failed, please try again" });
  }
});

router.post("/seller/logout", (req, res): void => {
  req.session.destroy(() => {
    clearSessionCookie(res);
    res.json({ success: true });
  });
});

router.get("/seller/me", async (req, res): Promise<void> => {
  try {
    if (!req.session.sellerId) {
      res.status(401).json({ error: "Not logged in" });
      return;
    }
    const [seller] = await db.select().from(sellersTable).where(eq(sellersTable.id, req.session.sellerId));
    if (!seller) {
      res.status(401).json({ error: "Not found" });
      return;
    }
    res.json({
      id: seller.id,
      name: seller.name,
      username: seller.username,
      email: seller.email,
      phone: seller.phone,
      whatsapp: seller.whatsapp,
      status: seller.status,
      totalListings: seller.totalListings,
      totalSold: seller.totalSold,
      totalEarnings: parseFloat(seller.totalEarnings || "0"),
    });
  } catch (err) {
    req.log.error({ err }, "seller/me failed");
    res.status(500).json({ error: "Failed to fetch seller info" });
  }
});

// Allow a logged-in seller to set/change their public username
router.patch("/seller/username", async (req, res): Promise<void> => {
  try {
    if (!req.session.sellerId) {
      res.status(401).json({ error: "Not logged in" });
      return;
    }
    const raw = String(req.body?.username ?? "").trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(raw)) {
      res.status(400).json({ error: "Username must be 3-20 characters: letters, numbers, or underscore only" });
      return;
    }
    const taken = await db
      .select({ id: sellersTable.id })
      .from(sellersTable)
      .where(sql`LOWER(${sellersTable.username}) = ${raw.toLowerCase()} AND ${sellersTable.id} <> ${req.session.sellerId}`);
    if (taken.length > 0) {
      res.status(409).json({ error: "This username is already taken. Please choose another." });
      return;
    }
    await db.update(sellersTable).set({ username: raw }).where(eq(sellersTable.id, req.session.sellerId));
    res.json({ success: true, username: raw });
  } catch (err) {
    req.log.error({ err }, "seller/username failed");
    res.status(500).json({ error: "Failed to update username" });
  }
});

export default router;
