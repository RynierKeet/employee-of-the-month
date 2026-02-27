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

// Map each question key to the correct DB column
const REFLECTION_COLUMN: Record<QuestionKey, string> = {
  achievements: "achievements_text",
  impact: "impact_text",
  values: "values_text",
  growth: "growth_text",
  beyond: "beyond_text",
  nomination: "nomination_text",
};

function normalizeMonthKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().slice(0, 7);
}

/* -----------------------------------------------------
   GET /results-final?month=YYYY-MM
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

    if (identity === "Employee" && !isPublished) {
      return res.json({ published: false });
    }

    /* -----------------------------------------------------
       2) Build final results per question
    ----------------------------------------------------- */
    const results = [];
    const winners = [];
    const totalVoteMap = new Map<number, number>();

    for (const qKey of QUESTION_KEYS) {
      // Load nominees (final reflections only)
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

      /* -----------------------------------------------------
         2a) Load reflection text + photo for each nominee
      ----------------------------------------------------- */
      const enriched = [];
      const col = REFLECTION_COLUMN[qKey];

      for (const n of nominees) {
        const reflectionRow = await db.get(
          `
          SELECT ${col} AS reflection_text
          FROM reflections
          WHERE employee_id = ?
            AND month_key = ?
            AND is_final = 1
          `,
          [n.nominee_id, month_key]
        );

        const vote_count = voteMap.get(n.nominee_id) || 0;

        totalVoteMap.set(
          n.nominee_id,
          (totalVoteMap.get(n.nominee_id) || 0) + vote_count
        );

        enriched.push({
          nominee_id: n.nominee_id,
          nominee_name: n.nominee_name,
          vote_count,
          reflection_text: reflectionRow?.reflection_text || "",
          photo_url: `/photos/${n.nominee_id}.jpg`,
        });
      }

      /* -----------------------------------------------------
         2b) Determine winner(s)
      ----------------------------------------------------- */
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
       3) Determine overall Employee of the Month
    ----------------------------------------------------- */
    let overallWinner = null;

    if (totalVoteMap.size > 0) {
      const sorted = [...totalVoteMap.entries()].sort((a, b) => b[1] - a[1]);
      const [topNomineeId, topVotes] = sorted[0];

      const winnerRow = await db.get(
        "SELECT id, name FROM employees WHERE id = ?",
        [topNomineeId]
      );

      overallWinner = {
        nominee_id: winnerRow.id,
        nominee_name: winnerRow.name,
        total_votes: topVotes,
        photo_url: `/photos/${winnerRow.id}.jpg`,
      };
    }

    /* -----------------------------------------------------
       4) Return final results
    ----------------------------------------------------- */
    return res.json({
      published: isPublished,
      month_key,
      results,
      winners,
      overall_winner: overallWinner,
      visibleScope: identity === "Adjudicator" ? "adjudicator" : "public",
    });
  } catch (err) {
    console.error("Error fetching final results:", err);
    return res.status(500).json({ error: "Failed to fetch final results" });
  }
});

export default router;