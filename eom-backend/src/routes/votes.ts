import { Router } from "express";
import db from "../db";
import { getCurrentUser } from "../utils/auth";

const router = Router();

/**
 * Normalize YYYY-MM or YYYY-MM-DD → YYYY-MM
 */
function normalizeMonthKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().slice(0, 7);
}

/* -----------------------------------------------------
   GET /votes?month=YYYY-MM
   Returns aggregated FINAL votes for the month.
   - Requires login
   - Excludes adjudicators as nominees
   - Returns sorted list: highest votes first
----------------------------------------------------- */
router.get("/", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const rawMonth = typeof req.query.month === "string" ? req.query.month : "";
    const month_key = normalizeMonthKey(rawMonth);

    if (!month_key) {
      return res.status(400).json({ error: "Missing or invalid month" });
    }

    // Aggregate FINAL votes only
    const rows = await db.all(
      `
      SELECT
        v.nominee_id AS employee_id,
        e.name AS employee_name,
        COUNT(*) AS total_votes
      FROM votes v
      JOIN employees e ON e.id = v.nominee_id
      WHERE v.month_key = ?
        AND v.is_final = 1
        AND e.is_adjudicator = 0   -- adjudicators cannot be nominees
      GROUP BY v.nominee_id, e.name
      ORDER BY total_votes DESC, employee_name ASC
      `,
      [month_key]
    );

    return res.json(rows || []);
  } catch (err) {
    console.error("Error fetching vote results:", err);
    return res.status(500).json({ error: "Failed to fetch vote results" });
  }
});

/* -----------------------------------------------------
   POST /votes/save
   Saves a single vote (draft or final).
   BACKEND SAFETY ADDED:
   - Prevents voting for adjudicators
----------------------------------------------------- */
router.post("/save", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return res.status(401).json({ error: "Not logged in" });
    }

    const { month_key: rawMonth, question_key, nominee_id, is_final } = req.body;

    const month_key = normalizeMonthKey(rawMonth);
    if (!month_key || !question_key || !nominee_id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 🔒 SAFETY: Prevent voting for adjudicators
    const nominee = await db.get(
      `SELECT is_adjudicator FROM employees WHERE id = ?`,
      [nominee_id]
    );

    if (nominee?.is_adjudicator === 1) {
      return res.status(400).json({ error: "Cannot vote for adjudicators" });
    }

    // Delete existing vote for this question (draft or final)
    await db.run(
      `
      DELETE FROM votes
      WHERE employee_id = ?
        AND month_key = ?
        AND question_key = ?
      `,
      [user.id, month_key, question_key]
    );

    // Insert new vote
    await db.run(
      `
      INSERT INTO votes (employee_id, month_key, question_key, nominee_id, is_final)
      VALUES (?, ?, ?, ?, ?)
      `,
      [user.id, month_key, question_key, nominee_id, is_final ? 1 : 0]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Error saving vote:", err);
    return res.status(500).json({ error: "Failed to save vote" });
  }
});

export default router;