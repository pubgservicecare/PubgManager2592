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
import { db } from "@workspace/db";
import { accountsTable, settingsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { prerenderMiddleware } from "./middleware/prerender";

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

// ─── Health endpoints (before session middleware — no DB, max speed) ──────────
//
// /api/healthz  — canonical endpoint for UptimeRobot / Better Stack / cron-job.org
// /health        — legacy alias kept for backward compatibility
//
// Both respond identically. Keep them fast: no DB, no session, no auth.

function healthResponse(req: express.Request, res: express.Response) {
  const mem = process.memoryUsage();
  const isMonitor =
    (req.headers["user-agent"] ?? "").toLowerCase().includes("uptimerobot") ||
    (req.headers["user-agent"] ?? "").toLowerCase().includes("betterstack") ||
    (req.headers["user-agent"] ?? "").toLowerCase().includes("cron-job");

  if (isMonitor) {
    req.log.info({ monitor: true }, "health-monitor ping");
  }

  res.status(200).json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    memory: {
      rssMB: Math.round(mem.rss / 1024 / 1024),
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024),
    },
    deployment: {
      sameOrigin: isSameOrigin,
      env: process.env.NODE_ENV ?? "development",
    },
  });
}

app.get("/api/healthz", healthResponse);
app.get("/health", healthResponse);

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

// ─── Dynamic sitemap (before static files so it takes precedence) ────────────
//
// Serves /sitemap.xml with real account pages from the DB.
// SITE_URL env var sets the domain (e.g. https://www.codexstocks.org).

app.get("/sitemap.xml", async (req, res) => {
  try {
    const origin =
      process.env.SITE_URL?.replace(/\/$/, "") ||
      `${req.protocol}://${req.headers.host}`;

    // Fetch all active, publicly visible, non-deleted accounts that have slugs
    const activeAccounts = await db
      .select({
        id: accountsTable.id,
        slug: accountsTable.slug,
        updatedAt: accountsTable.updatedAt,
        imageUrls: accountsTable.imageUrls,
      })
      .from(accountsTable)
      .where(
        and(
          eq(accountsTable.status, "active"),
          eq(accountsTable.visibility, "public"),
        ),
      );

    // ── Static public pages ──────────────────────────────────────────────────
    // /signup and /login are intentionally excluded — form pages, no SEO value,
    // and blocked in robots.txt (Disallow: /signup, Disallow: /login).
    const staticUrls: Array<{ loc: string; changefreq: string; priority: string; lastmod?: string }> = [
      { loc: `${origin}/`,         changefreq: "daily",  priority: "1.0" },
      { loc: `${origin}/accounts`, changefreq: "daily",  priority: "0.9" },
      { loc: `${origin}/faq`,      changefreq: "weekly", priority: "0.7" },
    ];

    // ── Dynamic account pages ────────────────────────────────────────────────
    // Include image data so Google Image Search can discover account screenshots.
    // Only include accounts with slugs — numeric URLs canonicalise to slugs.
    const accountUrlEntries = activeAccounts
      .filter((a) => !!a.slug)
      .map((a) => {
        const lastmod = a.updatedAt
          ? new Date(a.updatedAt).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        const imageLines = (a.imageUrls ?? [])
          .slice(0, 3) // max 3 images per URL entry
          .map((imgPath) =>
            `    <image:image><image:loc>${origin}/api/storage${imgPath}</image:loc></image:image>`,
          )
          .join("\n");

        return [
          "  <url>",
          `    <loc>${origin}/account/${a.slug}</loc>`,
          `    <lastmod>${lastmod}</lastmod>`,
          `    <changefreq>weekly</changefreq>`,
          `    <priority>0.9</priority>`,
          imageLines || null,
          "  </url>",
        ]
          .filter(Boolean)
          .join("\n");
      });

    const staticUrlEntries = staticUrls.map((u) =>
      [
        "  <url>",
        `    <loc>${u.loc}</loc>`,
        u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>` : null,
        `    <changefreq>${u.changefreq}</changefreq>`,
        `    <priority>${u.priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    );

    // Account pages first (highest SEO value), then static pages
    const allEntries = [...accountUrlEntries, ...staticUrlEntries];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
    http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${allEntries.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    // 15-minute cache — fresh enough to pick up new listings quickly
    res.setHeader("Cache-Control", "public, max-age=900, stale-while-revalidate=3600");
    res.send(xml);
  } catch (err) {
    req.log.error({ err }, "sitemap generation failed");
    res
      .status(500)
      .send(`<?xml version="1.0"?><error>Sitemap temporarily unavailable</error>`);
  }
});

// ─── Dynamic rendering for search-engine crawlers ────────────────────────────
//
// Must come BEFORE static file serving so bots get server-rendered HTML
// instead of the empty React shell (index.html).
// Normal browser requests are not affected — this only fires for known crawler
// User-Agents (Googlebot, Bingbot, etc.).

app.use(prerenderMiddleware);

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
