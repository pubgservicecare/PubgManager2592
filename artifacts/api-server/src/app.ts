import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// ─── Logging ────────────────────────────────────────────────────────────────

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// ─── Environment detection ───────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === "production";
const isReplit = !!process.env.REPL_ID;

/**
 * SAME_ORIGIN_DEPLOYMENT=true means Express serves both the built frontend
 * and the API from a single Render URL — no cross-origin at all.
 * This is the ONLY setup that works reliably on iOS Safari (ITP blocks
 * SameSite=None third-party cookies regardless of server configuration).
 * Set this to "true" on Render and do NOT separately deploy the frontend
 * on Cloudflare Pages / Vercel.
 */
const isSameOrigin = process.env.SAME_ORIGIN_DEPLOYMENT === "true";

/**
 * Secure cookies: required in production and in the Replit dev environment
 * (which runs HTTPS behind a proxy).
 */
export const useSecureCookies = isProduction || isReplit;

/**
 * SameSite=Lax  → same-origin deployment (recommended, works on ALL browsers
 *                 including iOS Safari). Requires SAME_ORIGIN_DEPLOYMENT=true.
 * SameSite=None → cross-origin deployment (frontend on a different domain).
 *                 Requires HTTPS + Secure. Blocked by iOS Safari ITP — mobile
 *                 login WILL fail on iPhone regardless of this setting.
 *                 In plain HTTP dev mode this falls back to Lax automatically.
 */
export const cookieSameSite: "lax" | "none" =
  useSecureCookies && !isSameOrigin ? "none" : "lax";

// ─── Trust proxy ─────────────────────────────────────────────────────────────
//
// "1" = trust exactly one proxy hop (Render's load balancer).
// If you run Cloudflare in front of Render, use 2 (or keep `true` to trust all).
// This makes req.protocol = "https" and req.ip correct, which in turn ensures
// the Secure cookie flag is set (connect-pg-simple reads req.secure).
//
app.set("trust proxy", 1);

// ─── CORS ────────────────────────────────────────────────────────────────────
//
// In same-origin deployment CORS is irrelevant (browser never sends an
// Origin header for same-origin requests). We still configure it for local dev
// and as a fallback if someone tests the API directly.

const corsOrigins: string[] = [];
if (process.env.FRONTEND_URL) {
  corsOrigins.push(...process.env.FRONTEND_URL.split(",").map((o) => o.trim()));
}
if (!isProduction) {
  corsOrigins.push(
    "http://localhost:5000",
    "http://localhost:8080",
    "http://localhost:21604",
  );
}
if (isReplit && process.env.REPLIT_DEV_DOMAIN) {
  corsOrigins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
}

// When no explicit origins are configured, disable CORS (same-origin mode).
const corsOrigin = corsOrigins.length > 0 ? corsOrigins : false;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health / keep-alive (before session middleware for speed) ───────────────

app.get("/health", (_req, res) => {
  const mem = process.memoryUsage();
  res.status(200).json({
    success: true,
    message: "Server is alive",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memoryMB: Math.round(mem.rss / 1024 / 1024),
    heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
    heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
  });
});

// ─── Session ──────────────────────────────────────────────────────────────────

const PgSession = connectPgSimple(session);

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required but was not provided.");
}

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      // Prune expired sessions every hour.
      pruneSessionInterval: 60 * 60,
    }),
    // proxy: true makes express-session trust X-Forwarded-Proto when deciding
    // whether the connection is secure — required behind Render's (and
    // Cloudflare's) reverse proxies so the Secure cookie flag is emitted.
    proxy: true,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: useSecureCookies,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: cookieSameSite,
      // Do NOT set `domain` — let it default to the serving host so the cookie
      // is always same-origin relative to wherever Express is running.
    },
  }),
);

// ─── API routes ───────────────────────────────────────────────────────────────

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", router);

// ─── Debug session endpoint (production diagnostics) ─────────────────────────
//
// Visit /api/debug-session in your browser to verify cookie/session state.
// Remove or restrict this endpoint once the issue is resolved.

app.get("/api/debug-session", (req, res) => {
  const sess = req.session as any;
  res.json({
    cookieConfig: {
      sameSite: cookieSameSite,
      secure: useSecureCookies,
      httpOnly: true,
    },
    deployment: {
      isSameOrigin,
      isProduction,
      trustProxy: app.get("trust proxy"),
      protocol: req.protocol,
      secure: req.secure,
    },
    session: {
      id: req.sessionID ?? null,
      hasSession: !!req.session,
      isAdmin: sess?.isAdmin ?? false,
      sellerId: sess?.sellerId ?? null,
      customerId: sess?.customerId ?? null,
    },
    headers: {
      host: req.headers["host"],
      origin: req.headers["origin"],
      xForwardedProto: req.headers["x-forwarded-proto"],
      xForwardedFor: req.headers["x-forwarded-for"],
      cookie: req.headers["cookie"] ? "[present]" : "[missing]",
    },
  });
});

// ─── Serve built frontend in production (same-origin mode) ───────────────────
//
// The built React app lives at artifacts/pubg-manager/dist/public relative to
// the api-server dist directory. Express serves it as static files and falls
// back to index.html for all unmatched paths (SPA client-side routing).

if (isProduction) {
  const frontendDist = path.resolve(__dirname, "../../pubg-manager/dist/public");
  app.use(express.static(frontendDist, { index: false }));
  app.use((_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// ─── Global error handler ─────────────────────────────────────────────────────

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status: number = err.status || err.statusCode || 500;
  logger.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  res.status(status).json({ error: err.message || "Internal server error" });
});

export default app;
