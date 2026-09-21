// Main Express application setup. Configures middleware (CORS, Helmet, Morgan,
// cookie-parser), reuses cached PostgreSQL pool for serverless, and mounts all API
// routes under /api. Exports the configured Express app for Vercel/serverless.
import 'dotenv/config';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/index.routes.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import dns from "dns";
import { pool } from "./config/database.ts"; // Serverless-cached pool

// Re-export pool for backward compatibility (services importing from app.ts still work)
export { pool };

dns.setDefaultResultOrder("ipv4first");

// Force Asia/Kolkata everywhere: JS Date formatting + Postgres session timezone
process.env.TZ = "Asia/Kolkata";

// Trust proxy for Vercel (X-Forwarded-For, secure cookies)
import type { Express } from "express";

const app: Express = express();

// --- CORS: Serverless-optimized, supports wildcard for testing ---
const rawFrontendUrl = process.env.FRONTEND_URL || "";
// Allow comma-separated origins for multiple frontends (e.g., "https://a.vercel.app,https://b.vercel.app")
const envOrigins = rawFrontendUrl
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const allowedOrigins = [
  ...envOrigins,
  "https://quizbackend-dun.vercel.app",
  "https://quizbackend-dun.vercel.app/api/v1",
  "https://code-judge-seven.vercel.app",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
].filter(Boolean);

const isWildcard = allowedOrigins.includes("*");

app.set("trust proxy", 1);

app.use(
  cors({
    origin: function (origin, callback) {
      // Server-to-server (Postman, curl, Vercel health checks) have no origin
      if (!origin) return callback(null, true);

      // Wildcard for testing: allow all origins (credentials must be handled carefully)
      if (isWildcard) return callback(null, true);

      // Dynamic origin check against allowlist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // In development, allow any localhost
      if (process.env.NODE_ENV !== "production" && origin.includes("localhost")) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true, // Allow cookies/auth headers
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
    exposedHeaders: ["Set-Cookie"],
  })
);

// Preflight
// Note: cors() already handles OPTIONS, but explicit is fine for Vercel
// app.options("*", cors()) — handled by cors middleware

app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Health check before auth — useful for Vercel
app.get("/health", async (req, res) => {
  const health: any = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "unknown",
    internet: "disabled",
  };

  try {
    await pool.query("SELECT 1");
    health.database = "connected";
  } catch (e) {
    health.database = "disconnected";
    health.status = "degraded";
  }

  if (process.env.NODE_ENV !== "production") {
    try {
      const response = await fetch("https://1.1.1.1", {
        signal: AbortSignal.timeout(3000),
      });
      health.internet = response.ok ? "reachable" : "unreachable";
    } catch {
      health.internet = "unreachable";
    }
  }

  res.status(health.status === "ok" ? 200 : 503).json(health);
});

app.use("/api", apiRoutes);

// Global error handler — must be after routes
app.use(errorHandler);

// Graceful shutdown only for local dev (not Vercel serverless)
// In serverless, process.exit would kill the lambda
if (process.env.NODE_ENV !== "production" && process.env.VERCEL !== "1") {
  async function shutdown(signal: string) {
    console.log(`Received ${signal}. Closing database connections...`);
    try {
      await pool.end();
      console.log("Database pool closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error closing database pool:", err);
      process.exit(1);
    }
  }
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

export default app;
