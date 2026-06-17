// ═══════════════════════════════════════════════════════════
//  FEEDBACK ROUTES (Protected — requires JWT)
//
//  POST /api/feedback/submit   — Submit a 1–5 star rating
//                                for a completed project.
//  GET  /api/feedback/:projectId — Retrieve existing rating.
// ═══════════════════════════════════════════════════════════
const express = require("express");
const { body, param, validationResult } = require("express-validator");
const pool = require("../db");
const authGuard = require("../middleware/auth");

const router = express.Router();
router.use(authGuard);

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: "Validation failed", details: errors.array() });
  }
  next();
}

// ── POST /api/feedback/submit ─────────────────────────────
// Upserts a rating — if the user already rated this project,
// the rating is updated in-place rather than duplicated.
router.post(
  "/submit",
  [
    body("project_id")
      .notEmpty()
      .withMessage("project_id is required."),
    body("star_rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("star_rating must be an integer between 1 and 5."),
    body("note")
      .optional()
      .isString()
      .isLength({ max: 500 })
      .trim(),
    handleValidation,
  ],
  async (req, res) => {
    const { project_id, star_rating, note } = req.body;
    try {
      // Upsert: update if same user + project already exists
      const existing = await pool.query(
        "SELECT id FROM client_feedback WHERE user_id = $1 AND project_id = $2",
        [req.userId, project_id]
      );

      let row;
      if (existing.rows.length > 0) {
        const result = await pool.query(
          `UPDATE client_feedback
           SET star_rating = $1, note = $2, submitted_at = NOW()
           WHERE user_id = $3 AND project_id = $4
           RETURNING id, project_id, star_rating, note, submitted_at`,
          [star_rating, note || null, req.userId, project_id]
        );
        row = result.rows[0];
      } else {
        const result = await pool.query(
          `INSERT INTO client_feedback (user_id, project_id, star_rating, note)
           VALUES ($1, $2, $3, $4)
           RETURNING id, project_id, star_rating, note, submitted_at`,
          [req.userId, project_id, star_rating, note || null]
        );
        row = result.rows[0];
      }

      return res.status(201).json({
        message: "Feedback submitted successfully.",
        feedback: row,
      });
    } catch (err) {
      console.error("POST /feedback/submit error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── GET /api/feedback/:projectId ──────────────────────────
// Returns the existing rating for a project (for pre-filling
// the star UI on page reload).
router.get(
  "/:projectId",
  [param("projectId").notEmpty(), handleValidation],
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, project_id, star_rating, note, submitted_at
         FROM   client_feedback
         WHERE  user_id = $1 AND project_id = $2
         LIMIT  1`,
        [req.userId, req.params.projectId]
      );
      if (result.rows.length === 0) {
        return res.json({ feedback: null });
      }
      return res.json({ feedback: result.rows[0] });
    } catch (err) {
      console.error("GET /feedback/:projectId error:", err.message);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

module.exports = router;
