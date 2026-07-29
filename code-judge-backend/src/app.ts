import 'dotenv/config';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import apiRoutes from "./routes/index.routes.ts";
import { errorHandler } from "./middleware/errorHandler.ts";
import pg from 'pg';
const { Pool } = pg;


export const pool = new Pool();


pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL database successfully!'))
  .catch((err) => console.error('❌ Database connection error', err.stack));

const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/api", apiRoutes);

// Global error handler — must be registered after routes
app.use(errorHandler);

export default app;
