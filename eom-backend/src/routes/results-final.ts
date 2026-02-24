import { Router } from "express";
import db from "../db";
import { getCurrentUser, getIdentity } from "../utils/auth";

const router = Router();

const QUESTION_KEYS = [
  "achievements",
  "impact",
  "values",
  "growth",
  "beyond",
  "nomination",
] as const;

type QuestionKey = (typeof QUESTION_KEYS)[number];

const QUESTION_LABELS: Record<QuestionKey, string> = {
  achievements: "Key Achievements",
  impact: "Impact on Team / Organisation",
  values: "Behaviour and Values",
  growth: "Growth and Learning",
  beyond: "Going Above and Beyond",
  nomination: "Nomination Justification",
};

function normalizeMonthKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().slice(0, 7);
}

/* -----------------------------------------------------
   GET /results-final?month=YYYY-MM
   Final locked results + winners
   - Adjudicators always see results
   - Employees see results only after publish
----------------------------------------------------- */
router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const identity = getIdentity(user);

  const rawMonth = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(rawMonth);

  if (!month_key) {
    return res.status(400).json({ error: "Missing or invalid month" });
  }

  try {
    /* -----------------------------------------------------
       1) Check publish status
    ----------------------------------------------------- */
    const publishRow = await db.get(
      "SELECT published FROM results_publish WHERE month_key = ?",
      [month_key]
    );

    const isPublished = publishRow?.published === 1;

    // Employees cannot see results until published
    if (identity === "Employee" && !isPublished) {
      return res.json({ published: false });
    }

    /* -----------------------------------------------------
       2) Build final results per question
    ----------------------------------------------------- */
    const results = [];
    const winners = [];

    for (const qKey of QUESTION_KEYS) {
      // Load nominees
      const nominees = await db.all(
        `
        SELECT e.id AS nominee_id,
               e.name AS nominee_name
        FROM employees e
        JOIN reflections r ON r.employee_id = e.id
        WHERE r.month_key = ?
          AND r.is_final = 1
          AND e.is_adjudicator = 0
        ORDER BY e.name ASC
        `,
        [month_key]
      );

      // Load FINAL vote counts only
      const voteCounts = await db.all(
        `
        SELECT nominee_id, COUNT(*) AS votes
        FROM votes
        WHERE month_key = ?
          AND question_key = ?
          AND is_final = 1
        GROUP BY nominee_id
        `,
        [month_key, qKey]
      );

      const voteMap = new Map<number, number>();
      voteCounts.forEach((v) => voteMap.set(v.nominee_id, v.votes));

      const enriched = nominees.map((n) => ({
        nominee_id: n.nominee_id,
        nominee_name: n.nominee_name,
        vote_count: voteMap.get(n.nominee_id) || 0,
      }));

      // Determine winner(s)
      const maxVotes = Math.max(...enriched.map((n) => n.vote_count));
      const qWinners = enriched.filter((n) => n.vote_count === maxVotes);

      results.push({
        question_key: qKey,
        question_label: QUESTION_LABELS[qKey],
        nominees: enriched,
        winners: qWinners,
      });

      winners.push({
        question_key: qKey,
        question_label: QUESTION_LABELS[qKey],
        winners: qWinners,
      });
    }

    /* -----------------------------------------------------
       3) Return final results
    ----------------------------------------------------- */
    return res.json({
      published: isPublished,
      month_key,
      results,
      winners,
      visibleScope: identity === "Adjudicator" ? "adjudicator" : "public",
    });
  } catch (err) {
    console.error("Error fetching final results:", err);
    return res.status(500).json({ error: "Failed to fetch final results" });
  }
});

export default router;