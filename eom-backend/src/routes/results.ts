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
   GET /results?month=YYYY-MM
   Adjudicators only — aggregated (draft + final) results
----------------------------------------------------- */
router.get("/", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const identity = getIdentity(user);
  if (identity !== "Adjudicator") {
    return res.status(403).json({
      error: "Results are only visible to adjudicators",
    });
  }

  const rawMonth = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(rawMonth);

  if (!month_key) {
    return res.status(400).json({ error: "Missing or invalid month" });
  }

  try {
    const results = [];

    for (const qKey of QUESTION_KEYS) {
      // Load nominees for this question
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

      // Load vote counts (draft + final)
      const voteCounts = await db.all(
        `
        SELECT nominee_id, COUNT(*) AS votes
        FROM votes
        WHERE month_key = ?
          AND question_key = ?
        GROUP BY nominee_id
        `,
        [month_key, qKey]
      );

      const voteMap = new Map<number, number>();
      voteCounts.forEach((v) => voteMap.set(v.nominee_id, v.votes));

      results.push({
        question_key: qKey,
        question_label: QUESTION_LABELS[qKey],
        nominees: nominees.map((n) => ({
          nominee_id: n.nominee_id,
          nominee_name: n.nominee_name,
          vote_count: voteMap.get(n.nominee_id) || 0,
        })),
      });
    }

    return res.json({
      month_key,
      results,
    });
  } catch (err) {
    console.error("Error fetching results:", err);
    return res.status(500).json({ error: "Failed to fetch results" });
  }
});

export default router;