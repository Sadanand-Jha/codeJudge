import 'dotenv/config';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/index.routes.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import dns from "dns";



// console.log(process.env.PGHOST, process.env.PGDATABASE, process.env.PGUSER, process.env.PGPASSWORD, process.env.PGSSLMODE, process.env.PGCHANNELBINDING); // Ye line sabse upar honi chahiye

// console.log("nhi mila")


// console.log({
//   host: process.env.PGHOST,
//   user: process.env.PGUSER,
//   passwordType: typeof process.env.PGPASSWORD,
//   passwordLength: process.env.PGPASSWORD?.length,
// });


// console.log(process.env.DATABASE_URL); // Ye line sabse upar honi chahiye


import pg from 'pg';
const { Pool } = pg;


dns.setDefaultResultOrder("ipv4first");


export const pool = new Pool();

// export const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   max: 5,
//   idleTimeoutMillis: 30000,
//   connectionTimeoutMillis: 10000,
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

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

pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL database successfully!'))
  .catch((err) => console.error('❌ Database connection error', err));

const app = express();

// --- UPDATED CORS CONFIGURATION ---
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001"
].filter(Boolean); // यह खाली या undefined वैल्यू को अपने आप हटा देगा

app.use(cors({
  origin: function (origin, callback) {
    // अगर कोई सर्वर-टू-सर्वर रिक्वेस्ट है (जैसे Postman) तो origin undefined होता है, उसे अनुमति दें
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", apiRoutes);

// Global error handler — must be registered after routes
app.use(errorHandler);

app.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    database: "unknown",
    internet: "disabled",
  };

  // Database check
  try {
    await pool.query("SELECT 1");
    health.database = "connected";
  } catch (e) {
    health.database = "disconnected";
    health.status = "degraded";
  }

  // Ping check (not production)
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

export default app;
