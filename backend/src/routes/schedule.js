// ═══════════════════════════════════════════════════════════
//  SCHEDULE ROUTES (Protected — requires JWT)
//
//  POST /api/schedule/optimize  — Run Greedy Latest-Slot
//                                 algorithm on the server.
//                                 Handles sick-leave chaos,
//                                 persists waitlisted jobs,
//                                 fires NodeMailer hooks.
//
//  POST /api/schedule/commit    — Lock the current result
//                                 into schedule_history for
//                                 long-term analytics.
//
//  GET  /api/schedule/history   — Fetch committed run history.
// ═══════════════════════════════════════════════════════════
const express = require("express");
const { body, validationResult } = require("express-validator");
const pool = require("../db");
const authGuard = require("../middleware/auth");
const { sendConfirmation, sendWaitlistAlert } = require("../mailer");

const router = express.Router();
router.use(authGuard);

// ═══════════════════════════════════════════════════════════
//  GREEDY LATEST-SLOT ALGORITHM (ported from frontend TS)
//  Input : items[]  — { id, name, weight (deadline), value }
//          capacity — total work-week days
//          blockedDay — optional int (sick-leave simulation)
// ═══════════════════════════════════════════════════════════
function runGreedyLatestSlot(items, capacity, blockedDay = null) {
  // Sort by contract value descending (greedy selection)
  const sorted = [...items].sort((a, b) => b.value - a.value);

  // Build slot array [1 .. capacity], null = open
  // If a blockedDay is provided, pre-fill that slot so it can
  // never be overwritten by any project (sick-leave simulation)
  const slots = new Array(capacity + 1).fill(null);
  if (blockedDay && blockedDay >= 1 && blockedDay <= capacity) {
    slots[blockedDay] = "__BLOCKED__";
  }

  const accepted = [];
  const rejected = [];
  const decisionLog = [];

  for (const item of sorted) {
    let scheduledDay = -1;

    // Latest Slot Strategy: search from min(capacity, deadline) → 1
    const startSlot = Math.min(capacity, item.weight);
    for (let day = startSlot; day >= 1; day--) {
      if (slots[day] === null) {
        slots[day] = item;
        scheduledDay = day;
        break;
      }
    }

    if (scheduledDay !== -1) {
      accepted.push({
        ...item,
        fraction: 1.0,
        takenWeight: 1,
        takenValue: item.value,
        scheduledDay,
      });
      decisionLog.push({
        item,
        remainingCapacityBefore: slots.filter((s) => s === null).length + 1,
        decision: "pack",
        takenWeight: 1,
        takenValue: item.value,
        remainingCapacityAfter: slots.filter((s) => s === null).length,
      });
    } else {
      rejected.push(item);
      decisionLog.push({
        item,
        remainingCapacityBefore: slots.filter((s) => s === null).length,
        decision: "skip",
        takenWeight: 0,
        takenValue: 0,
        remainingCapacityAfter: slots.filter((s) => s === null).length,
      });
    }
  }

  const totalValue = accepted.reduce((s, i) => s + i.value, 0);
  const totalWeight = accepted.length;

  return { accepted, rejected, totalValue, totalWeight, decisionLog };
}

// ── POST /api/schedule/optimize ───────────────────────────
router.post(
  "/optimize",
  [
    body("capacity")
      .isInt({ min: 1, max: 20 })
      .withMessage("Capacity must be between 1 and 20 days."),
    body("blockedDay")
      .optional({ nullable: true })
      .isInt({ min: 1, max: 20 })
      .withMessage("blockedDay must be between 1 and 20."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: "Validation failed", details: errors.array() });
    }

    const { capacity, blockedDay = null } = req.body;
    const client = await pool.connect();

    try {
      // 1. Fetch all Pending projects for this user
      const projectsResult = await client.query(
        `SELECT id, name, deadline_day AS weight, contract_value AS value
         FROM   projects
         WHERE  user_id = $1 AND status = 'Pending'`,
        [req.userId]
      );
      const items = projectsResult.rows.map((r) => ({
        id: String(r.id),
        name: r.name,
        weight: r.weight,
        value: r.value,
      }));

      if (items.length === 0) {
        return res.json({
          accepted: [],
          rejected: [],
          totalValue: 0,
          totalWeight: 0,
          decisionLog: [],
          blockedDay,
          capacity,
        });
      }

      // 2. Run greedy algorithm (with sick-leave block if provided)
      const effectiveCapacity = blockedDay
        ? capacity - 1  // one slot is non-overwritable
        : capacity;

      const result = runGreedyLatestSlot(items, capacity, blockedDay);

      // 3. Persist statuses back to DB inside a transaction
      await client.query("BEGIN");

      // Reset all Pending/Waitlisted to Pending first
      await client.query(
        `UPDATE projects SET status = 'Pending', scheduled_day = NULL
         WHERE  user_id = $1 AND status IN ('Pending', 'Waitlisted')`,
        [req.userId]
      );

      // Mark accepted as Scheduled
      for (const acc of result.accepted) {
        await client.query(
          `UPDATE projects
           SET    status = 'Scheduled', scheduled_day = $1
           WHERE  id = $2 AND user_id = $3`,
          [acc.scheduledDay, parseInt(acc.id), req.userId]
        );
      }

      // Mark rejected as Waitlisted (Smart Backlog — never dropped)
      for (const rej of result.rejected) {
        await client.query(
          `UPDATE projects
           SET    status = 'Waitlisted', scheduled_day = NULL
           WHERE  id = $1 AND user_id = $2`,
          [parseInt(rej.id), req.userId]
        );
      }

      await client.query("COMMIT");

      // 4. Fire NodeMailer hooks asynchronously (non-blocking)
      const userEmail = req.userEmail;
      setImmediate(async () => {
        for (const acc of result.accepted) {
          await sendConfirmation(userEmail, acc.name, acc.scheduledDay, acc.value);
        }
        for (const rej of result.rejected) {
          await sendWaitlistAlert(userEmail, rej.name, rej.value);
        }
      });

      // 5. Return result to frontend
      return res.json({
        ...result,
        blockedDay,
        capacity,
        effectiveCapacity,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("POST /schedule/optimize error:", err.message);
      return res.status(500).json({ error: "Optimization failed. Please try again." });
    } finally {
      client.release();
    }
  }
);

// ── POST /api/schedule/commit ─────────────────────────────
// Locks the current scheduled result into the analytics history
// table as a permanent, immutable record of this week's run.
router.post(
  "/commit",
  [
    body("capacity").isInt({ min: 1, max: 20 }),
    body("totalValue").isInt({ min: 0 }),
    body("totalWeight").isInt({ min: 0 }),
    body("accepted").isArray(),
    body("rejected").isArray(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ error: "Validation failed", details: errors.array() });
    }

    const { capacity, totalValue, totalWeight, accepted, rejected, blockedDay } = req.body;
    const scheduleDensity =
      capacity > 0 ? ((totalWeight / capacity) * 100).toFixed(2) : "0.00";

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const result = await client.query(
        `INSERT INTO schedule_history
           (user_id, week_capacity, total_value, total_weight,
            schedule_density, accepted_json, rejected_json, blocked_day)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, committed_at`,
        [
          req.userId,
          capacity,
          totalValue,
          totalWeight,
          scheduleDensity,
          JSON.stringify(accepted),
          JSON.stringify(rejected),
          blockedDay || null,
        ]
      );

      await client.query("COMMIT");
      const row = result.rows[0];

      return res.status(201).json({
        message: "Schedule committed to history.",
        historyId: row.id,
        committedAt: row.committed_at,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("POST /schedule/commit error:", err.message);
      return res.status(500).json({ error: "Commit failed. Please try again." });
    } finally {
      client.release();
    }
  }
);

// ── GET /api/schedule/history ─────────────────────────────
// Returns the last 20 committed runs for the authenticated user.
router.get("/history", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, week_capacity, total_value, total_weight,
              schedule_density, accepted_json, rejected_json,
              blocked_day, committed_at
       FROM   schedule_history
       WHERE  user_id = $1
       ORDER  BY committed_at DESC
       LIMIT  20`,
      [req.userId]
    );
    return res.json({ history: result.rows });
  } catch (err) {
    console.error("GET /schedule/history error:", err.message);
    return res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
