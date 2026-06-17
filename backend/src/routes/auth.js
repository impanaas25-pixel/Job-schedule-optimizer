// ═══════════════════════════════════════════════════════════
//  AUTH ROUTES
//  POST /api/auth/register  — create user with bcrypt hash
//  POST /api/auth/login     — verify credentials, return JWT
// ═══════════════════════════════════════════════════════════
require("dotenv").config();
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../db");

const router = express.Router();
const SALT_ROUNDS = 12;

// ── Validation rules ──────────────────────────────────────
const emailRule = body("email")
  .isEmail()
  .normalizeEmail()
  .withMessage("A valid email address is required.");

const passwordRule = body("password")
  .isLength({ min: 6 })
  .withMessage("Password must be at least 6 characters.");

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: "Validation failed", details: errors.array() });
  }
  next();
}

// ── POST /api/auth/register ───────────────────────────────
router.post(
  "/register",
  [emailRule, passwordRule, handleValidationErrors],
  async (req, res) => {
    const { email, password } = req.body;

    try {
      // Check for duplicate email
      const existing = await pool.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({
          error: "Conflict",
          message: "An account with this email already exists.",
        });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert user
      const result = await pool.query(
        "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at",
        [email, password_hash]
      );
      const user = result.rows[0];

      // Sign JWT
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );

      return res.status(201).json({
        message: "Account created successfully.",
        token,
        user: { id: user.id, email: user.email },
      });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

// ── POST /api/auth/login ──────────────────────────────────
router.post(
  "/login",
  [emailRule, passwordRule, handleValidationErrors],
  async (req, res) => {
    const { email, password, rememberMe } = req.body;

    try {
      // Find user by email
      const result = await pool.query(
        "SELECT id, email, password_hash FROM users WHERE email = $1",
        [email]
      );
      if (result.rows.length === 0) {
        // Use generic message to prevent user enumeration
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password.",
        });
      }

      const user = result.rows[0];

      // Compare bcrypt hash
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({
          error: "Unauthorized",
          message: "Invalid email or password.",
        });
      }

      // Sign JWT — extended expiry if rememberMe
      const expiresIn = rememberMe
        ? process.env.JWT_REMEMBER_EXPIRES_IN || "7d"
        : process.env.JWT_EXPIRES_IN || "24h";

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn }
      );

      return res.status(200).json({
        message: "Login successful.",
        token,
        user: { id: user.id, email: user.email },
      });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ error: "Internal server error." });
    }
  }
);

module.exports = router;
