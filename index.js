// ═══════════════════════════════════════════════════════════
//  EXPRESS SERVER BOOTSTRAP — StudioYield API Engine
//  Port: process.env.PORT (default 4000)
// ═══════════════════════════════════════════════════════════
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const projectRoutes = require("./routes/projects");
const scheduleRoutes = require("./routes/schedule");
const feedbackRoutes = require("./routes/feedback");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────
import cors from "cors";

app.use(cors({
  origin: (origin, callback) => {
    console.log("ORIGIN HIT:", origin);

    const allowed = [
      "https://job-schedule-optimization.vercel.app",
      "https://job-schedule-optimization-44f75gy8h-impanaas25-3139s-projects.vercel.app"
    ];

    if (!origin || allowed.includes(origin.replace(/\/$/, ""))) {
      return callback(null, true);
    }

    return callback(new Error("CORS blocked: " + origin));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── Health check ──────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "StudioYield API",
    timestamp: new Date().toISOString(),
  });
});

// ── Route mounts ──────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/feedback", feedbackRoutes);

// ── 404 catch-all ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found", message: "This endpoint does not exist." });
});

// ── Global error handler ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  StudioYield API running on http://localhost:${PORT}`);
  console.log(`    Health: http://localhost:${PORT}/api/health\n`);
});

module.exports = app;
