// ═══════════════════════════════════════════════════════════
//  JWT AUTH MIDDLEWARE
//  Reads Authorization: Bearer <token>, verifies the JWT,
//  and attaches req.userId to the request pipeline.
//  Returns 401 if the token is missing, malformed, or expired.
// ═══════════════════════════════════════════════════════════
require("dotenv").config();
const jwt = require("jsonwebtoken");

function authGuard(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Missing or malformed Authorization header.",
    });
  }

  const token = authHeader.slice(7); // strip "Bearer "
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch (err) {
    const isExpired = err.name === "TokenExpiredError";
    return res.status(401).json({
      error: "Unauthorized",
      message: isExpired
        ? "Session expired. Please log in again."
        : "Invalid session token.",
    });
  }
}

module.exports = authGuard;
