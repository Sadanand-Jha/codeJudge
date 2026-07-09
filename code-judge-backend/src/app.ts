import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import runRoutes from "./routes/run.routes.js";


const app = express();

app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/run", runRoutes);


export default app;