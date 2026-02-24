import { Router } from "express";
import db from "../db";
import { getCurrentUser } from "../utils/auth";

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

const QUESTION_TO_COLUMN: Record<QuestionKey, string> = {
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

function isValidQuestionKey(key: string): key is QuestionKey {
  return QUESTION_KEYS.includes(key as QuestionKey);
}

/* -----------------------------------------------------
   GET /voting/status?month=YYYY-MM
   Returns full voting state for all 6 questions
----------------------------------------------------- */
router.get("/status", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const rawMonth = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(rawMonth);

  if (!month_key) {
    return res.status(400).json({ error: "Missing or invalid month" });
  }

  try {
    // Check if user has finalized voting
    const finalRows = await db.all(
      `
      SELECT 1
      FROM votes
      WHERE voter_id = ?
        AND month_key = ?
        AND is_final = 1
      LIMIT 1
      `,
      [user.id, month_key]
    );

    const is_final = finalRows.length > 0;

    const questions = [];

    for (const qKey of QUESTION_KEYS) {
      const column = QUESTION_TO_COLUMN[qKey];

      // Load nominees for this question
      const nominees = await db.all(
        `
        SELECT e.id AS nominee_id,
               e.name AS nominee_name,
               r.${column} AS answer
        FROM employees e
        JOIN reflections r ON r.employee_id = e.id
        WHERE r.month_key = ?
          AND r.is_final = 1
          AND e.id != ?
        ORDER BY e.name ASC
        `,
        [month_key, user.id]
      );

      // Load user's votes for this question
      const votes = await db.all(
        `
        SELECT v.nominee_id, e.name AS nominee_name
        FROM votes v
        JOIN employees e ON e.id = v.nominee_id
        WHERE v.voter_id = ?
          AND v.month_key = ?
          AND v.question_key = ?
        ORDER BY v.id ASC
        `,
        [user.id, month_key, qKey]
      );

      questions.push({
        question_key: qKey,
        hasVotes: votes.length === 2,
        votes: votes.map((v) => ({
          employee_id: v.nominee_id,
          employee_name: v.nominee_name,
        })),
        nominees: nominees.map((n) => ({
          nominee_id: n.nominee_id,
          nominee_name: n.nominee_name,
          answer: n.answer,
        })),
      });
    }

    return res.json({
      month_key,
      is_final,
      questions,
    });
  } catch (err) {
    console.error("Error fetching voting status:", err);
    return res.status(500).json({ error: "Failed to fetch voting status" });
  }
});

/* -----------------------------------------------------
   GET /voting/question/:key?month=YYYY-MM
   Returns nominees + their answer for that question
----------------------------------------------------- */
router.get("/question/:key", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const key = req.params.key;
  if (!isValidQuestionKey(key)) {
    return res.status(400).json({ error: "Invalid question key" });
  }

  const rawMonth = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(rawMonth);

  if (!month_key) {
    return res.status(400).json({ error: "Missing or invalid month" });
  }

  const column = QUESTION_TO_COLUMN[key];

  try {
    const rows = await db.all(
      `
      SELECT e.id AS nominee_id,
             e.name AS nominee_name,
             r.${column} AS answer
      FROM employees e
      JOIN reflections r ON r.employee_id = e.id
      WHERE r.month_key = ?
        AND r.is_final = 1
        AND e.id != ?
      ORDER BY e.name ASC
      `,
      [month_key, user.id]
    );

    return res.json({
      month_key,
      question_key: key,
      nominees: rows || [],
    });
  } catch (err) {
    console.error("Error fetching question nominees:", err);
    return res.status(500).json({ error: "Failed to fetch question data" });
  }
});

/* -----------------------------------------------------
   GET /voting/draft?month=YYYY-MM&question=achievements
   Returns draft nominee_ids for this user/question
----------------------------------------------------- */
router.get("/draft", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const rawMonth = typeof req.query.month === "string" ? req.query.month : "";
  const month_key = normalizeMonthKey(rawMonth);

  const question_key =
    typeof req.query.question === "string" ? req.query.question : "";

  if (!month_key || !isValidQuestionKey(question_key)) {
    return res.status(400).json({ error: "Invalid month or question key" });
  }

  try {
    const rows = await db.all(
      `
      SELECT nominee_id
      FROM votes
      WHERE voter_id = ?
        AND month_key = ?
        AND question_key = ?
        AND is_final = 0
      ORDER BY id ASC
      `,
      [user.id, month_key, question_key]
    );

    return res.json({
      month_key,
      question_key,
      nominee_ids: rows.map((r) => r.nominee_id),
    });
  } catch (err) {
    console.error("Error fetching draft votes:", err);
    return res.status(500).json({ error: "Failed to fetch draft votes" });
  }
});

/* -----------------------------------------------------
   POST /voting/save
   Saves draft votes for a question
----------------------------------------------------- */
router.post("/save", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const body = req.body || {};
  const rawMonth = typeof body.month_key === "string" ? body.month_key : "";
  const month_key = normalizeMonthKey(rawMonth);

  const question_key = String(body.question_key || "");
  const nominee_ids: number[] = Array.isArray(body.nominee_ids)
    ? body.nominee_ids.map((n: any) => Number(n))
    : [];

  if (!month_key || !isValidQuestionKey(question_key)) {
    return res.status(400).json({ error: "Invalid month_key or question_key" });
  }

  if (nominee_ids.length !== 2) {
    return res.status(400).json({ error: "You must select exactly two nominees" });
  }

  if (nominee_ids[0] === nominee_ids[1]) {
    return res.status(400).json({ error: "You cannot vote twice for the same person" });
  }

  if (nominee_ids.includes(user.id)) {
    return res.status(400).json({ error: "You cannot vote for yourself" });
  }

  try {
    // Validate nominees have final reflections
    const placeholders = nominee_ids.map(() => "?").join(",");
    const nominees = await db.all(
      `
      SELECT e.id
      FROM employees e
      JOIN reflections r ON r.employee_id = e.id
      WHERE e.id IN (${placeholders})
        AND r.month_key = ?
        AND r.is_final = 1
      `,
      [...nominee_ids, month_key]
    );

    if (!nominees || nominees.length !== 2) {
      return res.status(400).json({
        error: "One or more nominees do not have a final reflection for this month",
      });
    }

    // Remove existing draft votes
    await db.run(
      `
      DELETE FROM votes
      WHERE voter_id = ?
        AND month_key = ?
        AND question_key = ?
        AND is_final = 0
      `,
      [user.id, month_key, question_key]
    );

    // Insert new draft votes
    for (const nominee_id of nominee_ids) {
      await db.run(
        `
        INSERT INTO votes (voter_id, nominee_id, month_key, question_key, is_final)
        VALUES (?, ?, ?, ?, 0)
        `,
        [user.id, nominee_id, month_key, question_key]
      );
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Error saving votes:", err);
    return res.status(500).json({ error: "Failed to save votes" });
  }
});

/* -----------------------------------------------------
   POST /voting/finalize
   Locks all votes for this user/month
----------------------------------------------------- */
router.post("/finalize", async (req, res) => {
  const user = await getCurrentUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  const body = req.body || {};
  const rawMonth = typeof body.month_key === "string" ? body.month_key : "";
  const month_key = normalizeMonthKey(rawMonth);

  if (!month_key) {
    return res.status(400).json({ error: "Missing or invalid month_key" });
  }

  try {
    // Count votes per question
    const rows = await db.all(
      `
      SELECT question_key, COUNT(*) AS cnt
      FROM votes
      WHERE voter_id = ?
        AND month_key = ?
      GROUP BY question_key
      `,
      [user.id, month_key]
    );

    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.question_key] = row.cnt;
    }

    // Ensure 2 votes for each question
    for (const q of QUESTION_KEYS) {
      if (counts[q] !== 2) {
        return res.status(400).json({
          error: `You must cast exactly two votes for each question before finalizing. Missing: ${q}`,
        });
      }
    }

    // Mark all votes as final
    await db.run(
      `
      UPDATE votes
      SET is_final = 1
      WHERE voter_id = ?
        AND month_key = ?
      `,
      [user.id, month_key]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Error finalizing votes:", err);
    return res.status(500).json({ error: "Failed to finalize votes" });
  }
});

export default router;