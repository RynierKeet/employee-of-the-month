import { Router } from "express";
import db from "../db";
import { getCurrentUser, getIdentity } from "../utils/auth";

const router = Router();

// Normalize YYYY-MM or YYYY-MM-DD → YYYY-MM
function normalizeMonthKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().slice(0, 7);
}

// -----------------------------------------------------
// GET /results?month=YYYY-MM
// Adjudicators only — internal results
// -----------------------------------------------------
router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const identity = getIdentity(user);
  if (identity !== "Adjudicator") {
    return res.status(403).json({ error: "Results are only visible to adjudicators" });
  }

  const month = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(month);

  if (!month_key) {
    return res.status(400).json({ error: "Missing or invalid month" });
  }

  try {
    const rows = await db.all(
      `
      SELECT
        v.vote_for_id AS employee_id,
        e.name AS employee_name,

        CAST(SUM(CASE WHEN v.is_adjudication = 0 THEN 1 ELSE 0 END) AS UNSIGNED)
          AS normal_votes,

        CAST(SUM(CASE WHEN v.is_adjudication = 1 THEN 1 ELSE 0 END) AS UNSIGNED)
          AS adjudication_votes,

        CAST(COUNT(*) AS UNSIGNED) AS total_votes

      FROM votes v
      JOIN employees e ON e.id = v.vote_for_id

      WHERE v.month_key = ?
        AND e.is_adjudicator = 0   -- FIXED: exclude adjudicators correctly

      GROUP BY v.vote_for_id, e.name

      ORDER BY
        total_votes DESC,
        normal_votes DESC,
        employee_name ASC
      `,
      [month_key]
    );

    return res.json(rows);
  } catch (err) {
    console.error("Error fetching results:", err);
    return res.status(500).json({ error: "Failed to fetch results" });
  }
});

export default router;