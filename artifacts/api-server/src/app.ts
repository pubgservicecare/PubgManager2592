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

// ─── Logging ──────────────────────────────────────────────────────────────────

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
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── Environment ──────────────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === "production";
const isReplit = !!process.env.REPL_ID;

/**
 * SAME_ORIGIN_DEPLOYMENT=true → Express serves the built React frontend
 * directly, making frontend + API same-origin. This is the ONLY setup that
 * works reliably on ALL mobile browsers (iOS Safari, Samsung Internet, etc.)
 * because SameSite=Lax cookies are used instead of SameSite=None.
 *
 * Without this flag, SameSite=None cookies are used for cross-origin
 * compatibility, but iOS Safari's ITP blocks them regardless of server config.
 */
const isSameOrigin = process.env.SAME_ORIGIN_DEPLOYMENT === "true";

/** Secure cookies: required in production and in the Replit HTTPS environment. */
export const useSecureCookies = isProduction || isReplit;

/**
 * SameSite=Lax  — same-origin deployment (recommended). Works on every browser.
 * SameSite=None — cross-origin deployment. Blocked by iOS Safari ITP; mobile
 *                 login will fail on iPhone regardless of server-side config.
 */
export const cookieSameSite: "lax" | "none" =
  useSecureCookies && !isSameOrigin ? "none" : "lax";

// Log startup configuration so it's visible in Render logs.
logger.info(
  {
    isProduction,
    isSameOrigin,
    useSecureCookies,
    cookieSameSite,
    nodeEnv: process.env.NODE_ENV,
  },
  isSameOrigin
    ? "Starting in SAME-ORIGIN mode — mobile login will work on all browsers"
    : "Starting in CROSS-ORIGIN mode — mobile login may fail on iOS Safari (set SAME_ORIGIN_DEPLOYMENT=true to fix)",
);

// ─── Trust proxy ──────────────────────────────────────────────────────────────
//
// "1" = trust exactly one proxy hop (Render's load balancer).
// This makes req.protocol = "https" and req.ip correct behind Render's proxy,
// which in turn lets connect-pg-simple emit the Secure cookie flag.
// If you put Cloudflare in DNS-only mode in front of Render, keep "1".
// If Cloudflare is in proxied (orange cloud) mode, use 2.
//
app.set("trust proxy", 1);

// ─── CORS ────────────────────────────────────────────────────────────────────
//
// In same-origin mode CORS headers are never sent (browser doesn't include
// Origin for same-origin requests). Listed here for local dev + fallback.

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
const corsOrigin = corsOrigins.length > 0 ? corsOrigins : false;

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health (before session middleware — fast, no DB) ────────────────────────

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

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET environment variable is required but was not provided.");
}

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      pruneSessionInterval: 60 * 60, // prune expired sessions every hour
    }),
    // proxy: true makes express-session trust X-Forwarded-Proto so the Secure
    // cookie flag is emitted correctly behind Render's reverse proxy.
    proxy: true,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: useSecureCookies,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: cookieSameSite,
      // Do NOT set `domain` — inherit from the serving host so the cookie is
      // always same-origin relative to wherever Express is running.
    },
  }),
);

// ─── Auth request logging middleware ─────────────────────────────────────────
//
// Logs every auth-related request with enough detail to diagnose mobile issues
// in production. Visible in Render's log stream.

app.use(["/api/auth", "/api/customer", "/api/seller"], (req, _res, next) => {
  const sess = req.session as any;
  req.log.info(
    {
      url: req.url,
      method: req.method,
      origin: req.headers["origin"] ?? null,
      xForwardedProto: req.headers["x-forwarded-proto"] ?? null,
      protocol: req.protocol,
      secure: req.secure,
      hasCookie: !!req.headers["cookie"],
      sessionId: req.sessionID ?? null,
      sessionIsAdmin: sess?.isAdmin ?? false,
      sessionSellerId: sess?.sellerId ?? null,
      sessionCustomerId: sess?.customerId ?? null,
      userAgent: req.headers["user-agent"]?.slice(0, 120) ?? null,
    },
    "auth request",
  );
  next();
});

// ─── API routes ───────────────────────────────────────────────────────────────

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", router);

// ─── Debug endpoint (production diagnostics) ─────────────────────────────────
//
// Visit /api/debug-session from any browser/device to verify session state.
// Share the output when reporting mobile login issues.

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
      nodeEnv: process.env.NODE_ENV,
    },
    session: {
      id: req.sessionID ?? null,
      hasSession: !!req.session,
      isAdmin: sess?.isAdmin ?? false,
      sellerId: sess?.sellerId ?? null,
      customerId: sess?.customerId ?? null,
    },
    request: {
      host: req.headers["host"] ?? null,
      origin: req.headers["origin"] ?? null,
      xForwardedProto: req.headers["x-forwarded-proto"] ?? null,
      xForwardedFor: req.headers["x-forwarded-for"] ?? null,
      cookiePresent: !!req.headers["cookie"],
      userAgent: req.headers["user-agent"]?.slice(0, 150) ?? null,
    },
    fix: isSameOrigin
      ? "✓ Same-origin mode active — mobile login should work on all browsers"
      : "✗ Cross-origin mode — set SAME_ORIGIN_DEPLOYMENT=true on Render and remove VITE_API_URL to fix mobile login",
  });
});

// ─── Serve built frontend in production (same-origin mode) ───────────────────

if (isProduction) {
  const frontendDist = path.resolve(__dirname, "../../pubg-manager/dist/public");
  app.use(express.static(frontendDist, { index: false }));
  // SPA fallback: all non-/api routes serve index.html for client-side routing.
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
