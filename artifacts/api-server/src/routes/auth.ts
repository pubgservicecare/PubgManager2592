import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { useSecureCookies, cookieSameSite } from "../app";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
    username: string;
  }
}

/**
 * Return admin credentials to compare against.
 * Priority: settings table row → ADMIN_USERNAME/ADMIN_PASSWORD env vars.
 * If neither is available, throws so the error is explicit.
 */
async function resolveAdminCredentials(): Promise<{ adminUsername: string; adminPassword: string }> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (settings) return { adminUsername: settings.adminUsername, adminPassword: settings.adminPassword };

  // Settings row not yet seeded — fall back to env vars so admin login works
  // immediately on a fresh production deployment before anyone visits the site.
  const envUser = process.env.ADMIN_USERNAME;
  const envPass = process.env.ADMIN_PASSWORD;
  if (!envUser || !envPass) {
    throw new Error("Settings not initialised and ADMIN_USERNAME/ADMIN_PASSWORD env vars are not set.");
  }

  // Also seed the settings row now so subsequent logins are fast.
  try {
    const hashed = await bcrypt.hash(envPass, 12);
    await db.insert(settingsTable).values({ adminUsername: envUser, adminPassword: hashed }).onConflictDoNothing();
  } catch {
    // Non-fatal — we can still authenticate from env vars this request.
  }

  return { adminUsername: envUser, adminPassword: envPass };
}

router.post("/auth/admin/login", async (req, res): Promise<void> => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }

    let adminUsername: string;
    let adminPassword: string;
    try {
      ({ adminUsername, adminPassword } = await resolveAdminCredentials());
    } catch (err) {
      req.log.error({ err }, "admin login: could not resolve admin credentials");
      res.status(500).json({ error: "Admin credentials not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables." });
      return;
    }

    const usernameMatch = username === adminUsername;
    const passwordMatch = adminPassword.startsWith("$2")
      ? await bcrypt.compare(password, adminPassword)
      : password === adminPassword;

    if (!usernameMatch || !passwordMatch) {
      req.log.info({ username }, "admin login: invalid credentials");
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Regenerate session to prevent session fixation attacks
    req.session.regenerate((err) => {
      if (err) {
        res.status(500).json({ error: "Session error, please try again" });
        return;
      }
      req.session.isAdmin = true;
      req.session.username = adminUsername;
      req.session.save((saveErr) => {
        if (saveErr) {
          res.status(500).json({ error: "Session save error, please try again" });
          return;
        }
        res.json({ success: true, username: adminUsername });
      });
    });
  } catch (err) {
    req.log.error({ err }, "admin login failed");
    res.status(500).json({ error: "Login failed, please try again" });
  }
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    // sameSite and secure MUST match the session cookie settings exactly,
    // otherwise the browser won't clear the cookie on cross-origin requests.
    res.clearCookie("connect.sid", {
      path: "/",
      httpOnly: true,
      secure: useSecureCookies,
      sameSite: cookieSameSite,
    });
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

// NOTE: /auth/login (unified customer+seller login) is registered in customerAuth.ts
// which has the full implementation with try/catch, session save, and better phone handling.

export default router;
