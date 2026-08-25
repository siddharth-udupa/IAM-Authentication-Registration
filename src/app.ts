import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import authRouter from "./routes/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static file serving
const publicPath = path.join(__dirname, "../public");
app.use(express.static(publicPath));

// API Routes
app.use("/api", authRouter);

// Fallback routes for HTML pages
app.get(["/", "/login"], (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

app.get("/signup", (_req, res) => {
  res.sendFile(path.join(publicPath, "signup.html"));
});

app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(publicPath, "dashboard.html"));
});

export default app;