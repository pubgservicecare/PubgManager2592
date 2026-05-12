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

const PgSession = connectPgSimple(session);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
    }),
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
      sameSite: useSecureCookies ? "none" : "lax",
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
  // Express 5 compatible: use "*" (not "/{*path}").
  app.get("*", (_req, res) => {
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
