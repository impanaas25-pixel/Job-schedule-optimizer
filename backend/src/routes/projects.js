// ═══════════════════════════════════════════════════════════
//  PROJECTS ROUTES (Protected — requires JWT)
//  All queries are gated by WHERE user_id = req.userId
//  enforcing complete database isolation per user.
//
//  GET    /api/projects        — list current user's projects
//  POST   /api/projects        — add a new project
//  DELETE /api/projects/:id    — remove a project (owned only)
// ═══════════════════════════════════════════════════════════
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const pool = require("../db");
const authGuard = require("../middleware/auth");

const router = express.Router();

// Apply JWT guard to all routes in this file
router.use(authGuard);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: "Validation failed", details: errors.array() });
  }
  next();
}

// ── GET /api/projects ─────────────────────────────────────
// Returns all projects for the authenticated user ordered by
// creation time (newest last to match the queue display).
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, deadline_day AS weight, contract_value AS value,
              status, scheduled_day, created_at
       FROM   projects
       WHERE  user_id = $1
       ORDER  BY created_at ASC`,
      [req.userId]
    );
    return res.json({ projects: result.rows });
  } catch (err) {
    console.error("GET /projects error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ── POST /api/projects ────────────────────────────────────
router.post(
  "/",
  [
    body("name").trim().notEmpty().withMessage("Project name is required."),
    body("weight")
      .isInt({ min: 1, max: 20 })
      .withMessage("Deadline must be between Day 1 and 20."),
    body("value")
      .isInt({ min: 0 })
      .withMessage("Contract value must be a non-negative integer."),
    handleValidation,
  ],
  async (req, res) => {
    const { name, weight, value } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO projects (user_id, name, deadline_day, contract_value, status)
         VALUES ($1, $2, $3, $4, 'Pending')
         RETURNING id, name, deadline_day AS weight, contract_value AS value,
                   status, scheduled_day, created_at`,
        [req.userId, name.trim(), weight, value]
      );
      return res.status(201).json({ project: result.rows[0] });
    } catch (err) {
      console.error("POST /projects error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── DELETE /api/projects/:id ──────────────────────────────
// Only deletes if the project belongs to req.userId (isolation).
router.delete(
  "/:id",
  [param("id").isInt().withMessage("Invalid project ID."), handleValidation],
  async (req, res) => {
    try {
      const result = await pool.query(
        "DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id",
        [req.params.id, req.userId]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ error: "Project not found or access denied." });
      }
      return res.json({ deleted: true, id: req.params.id });
    } catch (err) {
      console.error("DELETE /projects/:id error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── POST /api/projects/new ────────────────────────────────
// Commits an incoming client project into the persistent
// client_projects table (separate from the scheduler queue).
router.post(
  "/new",
  [
    body("client_name").trim().notEmpty().withMessage("Client/project name is required."),
    body("contract_value")
      .isInt({ min: 0 })
      .withMessage("Contract value must be a non-negative integer."),
    body("delivery_deadline")
      .isInt({ min: 1, max: 20 })
      .withMessage("Delivery deadline must be between Day 1 and 20."),
    handleValidation,
  ],
  async (req, res) => {
    const { client_name, contract_value, delivery_deadline } = req.body;
    try {
      const result = await pool.query(
        `INSERT INTO client_projects
           (user_id, client_name, contract_value, delivery_deadline, optimization_status)
         VALUES ($1, $2, $3, $4, 'Pending')
         RETURNING id, client_name, contract_value, delivery_deadline,
                   optimization_status, created_at`,
        [req.userId, client_name.trim(), contract_value, delivery_deadline]
      );
      return res.status(201).json({ project: result.rows[0] });
    } catch (err) {
      console.error("POST /projects/new error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── GET /api/projects/client ──────────────────────────────
// Fetches all client_projects for the authenticated user.
router.get("/client", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, client_name, contract_value, delivery_deadline,
              optimization_status, created_at
       FROM   client_projects
       WHERE  user_id = $1
       ORDER  BY created_at DESC`,
      [req.userId]
    );
    return res.json({ projects: result.rows });
  } catch (err) {
    console.error("GET /projects/client error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
