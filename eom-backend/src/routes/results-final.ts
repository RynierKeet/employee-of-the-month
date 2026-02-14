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
// GET /results-final?month=YYYY-MM
// Final results for a month
// - Adjudicators always see full results
// - Employees see results only after publish
// -----------------------------------------------------
router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const identity = getIdentity(user);

  const month = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(month);

  if (!month_key) {
    return res.status(400).json({ error: "Missing or invalid month" });
  }

  try {
    // Check publish status for this month
    const publishRow = await db.get(
      "SELECT published FROM results_publish WHERE month_key = ?",
      [month_key]
    );

    const isPublished = publishRow?.published === 1;

    // Employees cannot see results until published
    if (identity === "Employee" && !isPublished) {
      return res.json({ published: false });
    }

    // Fetch final aggregated results
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

    return res.json({
      published: isPublished,
      month_key,
      results: rows,
      visibleScope: identity === "Adjudicator" ? "adjudicator" : "public",
    });
  } catch (err) {
    console.error("Error fetching final results:", err);
    return res.status(500).json({ error: "Failed to fetch final results" });
  }
});

export default router;