import 'dotenv/config';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import apiRoutes from "./routes/index.routes.ts";
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
app.use("/api", apiRoutes);


export default app;