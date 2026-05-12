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

const isProduction = process.env.NODE_ENV === "production";
const isReplit = !!process.env.REPL_ID;
export const useSecureCookies = isProduction || isReplit;

// SameSite policy:
//   "none" — required when the frontend and backend are on different domains
//             (e.g. frontend on Cloudflare Pages / Vercel, backend on Render).
//             This is the common production setup and requires HTTPS + Secure.
//   "lax"  — correct ONLY for same-origin deployments where Express serves
//             the built frontend directly (render-build.sh single-service setup).
//             Set SAME_ORIGIN_DEPLOYMENT=true to opt into this.
//
// Default is "none" for HTTPS (useSecureCookies=true) so that the standard
// cross-origin production deployment works out of the box.
// In development (HTTP) it is always "lax" because "none" requires Secure.
const isSameOrigin = process.env.SAME_ORIGIN_DEPLOYMENT === "true";
export const cookieSameSite: "lax" | "none" =
  useSecureCookies && !isSameOrigin ? "none" : "lax";

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

// Trust all proxy hops — required for Cloudflare + Render (multi-hop).
// This ensures req.protocol is "https" and cookies get Secure flag correctly.
app.set("trust proxy", true);

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Keep-alive health endpoint — intentionally placed BEFORE session middleware
// so uptime pings (UptimeRobot, cron-job.org, Better Stack, etc.) never touch
// the database or session store. Response is always < 1 ms.
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

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
    }),
    // proxy: true tells express-session to trust X-Forwarded-Proto from
    // Render's (and Cloudflare's) reverse proxy when deciding whether the
    // connection is secure. Required so the Secure cookie flag is set
    // correctly behind multi-hop proxies.
    proxy: true,
    secret: (() => {
      const s = process.env.SESSION_SECRET;
      if (!s) throw new Error("SESSION_SECRET environment variable is required but was not provided.");
      return s;
    })(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: useSecureCookies,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: cookieSameSite,
    },
  })
);

app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});
app.use("/api", router);

// In production, serve the built frontend from the same Express server.
// This makes everything same-origin — no CORS, no cross-origin cookie issues.
if (isProduction) {
  const frontendDist = path.resolve(__dirname, "../../pubg-manager/dist/public");
  app.use(express.static(frontendDist, { index: false }));
  // SPA fallback — all non-API routes serve index.html.
  // app.use() with no path is the correct Express 5 / path-to-regexp v8 catch-all.
  // Neither "*" nor "/{*path}" are valid in path-to-regexp v8.
  // This runs after express.static() and after all /api routes, so it only
  // fires for unmatched frontend routes (e.g. /account/123, /admin, /my).
  app.use((_req, res) => {
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

// Global error handler — must be last, after all routes.
// Catches any error passed to next(err) or unhandled async rejections in routes.
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status: number = err.status || err.statusCode || 500;
  logger.error({ err }, "Unhandled error");
  if (res.headersSent) return;
  res.status(status).json({ error: err.message || "Internal server error" });
});

export default app;
