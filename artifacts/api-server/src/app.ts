import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "@workspace/db";
import router from "./routes";
import { logger } from "./lib/logger";

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
const useSecureCookies = isProduction || isReplit;

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
if (isProduction && corsOrigins.length === 0) {
  throw new Error("FRONTEND_URL must be set in production for CORS.");
}
const corsOrigin = corsOrigins.length > 0 ? corsOrigins : false;

app.set("trust proxy", 1);

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

export default app;
