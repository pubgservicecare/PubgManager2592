import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";

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

  if (username === settings.adminUsername && password === settings.adminPassword) {
    req.session.isAdmin = true;
    req.session.username = settings.adminUsername;
    res.json({ success: true, username: settings.adminUsername });
    return;
  }

  res.status(401).json({ error: "Invalid credentials" });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
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
