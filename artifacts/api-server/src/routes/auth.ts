import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { useSecureCookies } from "../app";

const router: IRouter = Router();

declare module "express-session" {
  interface SessionData {
    isAdmin: boolean;
    username: string;
  }
}

router.post("/auth/admin/login", async (req, res): Promise<void> => {
  try {
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

    if (!usernameMatch || !passwordMatch) {
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
      req.session.username = settings.adminUsername;
      req.session.save((saveErr) => {
        if (saveErr) {
          res.status(500).json({ error: "Session save error, please try again" });
          return;
        }
        res.json({ success: true, username: settings.adminUsername });
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
      sameSite: useSecureCookies ? "none" : "lax",
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
