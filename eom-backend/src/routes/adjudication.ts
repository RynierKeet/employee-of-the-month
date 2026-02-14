import { Router } from "express";
import { getCurrentUser, getIdentity } from "../utils/auth";
import db from "../db";

const router = Router();

// Normalize YYYY-MM or YYYY-MM-DD → YYYY-MM
function normalizeMonthKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().slice(0, 7);
}

/* -----------------------------------------------------
   GET /adjudication/panel?month=YYYY-MM
   Returns unified adjudication payload:
   - All candidates
   - Employee vote totals
   - Reflections
   - Employee motivations
   - Adjudicator votes
   - Suggested winner
   - Tie highlighting
   - Finalisation status
----------------------------------------------------- */
router.get("/panel", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    const identity = getIdentity(user);
    if (identity !== "Adjudicator") {
      return res.status(403).json({ error: "Access denied" });
    }

    const month_key = normalizeMonthKey(String(req.query.month || ""));
    if (!month_key) {
      return res.status(400).json({ error: "Missing month parameter" });
    }

    // ---------------------------------------------------------
    // 1. Fetch all candidates with employee vote totals
    // ---------------------------------------------------------
    const candidates = await db.all(
      `SELECT e.id AS employee_id, e.name, e.photo_url,
              COUNT(v.vote_for_id) AS votes
       FROM employees e
       LEFT JOIN votes v
         ON v.vote_for_id = e.id
        AND v.month_key = ?
        AND v.is_adjudication = 0
       GROUP BY e.id
       ORDER BY votes DESC`,
      [month_key]
    );

    // ---------------------------------------------------------
    // 2. Fetch reflections
    // ---------------------------------------------------------
    const reflections = await db.all(
      `SELECT employee_id, reflection_text
       FROM reflections
       WHERE month_key = ?`,
      [month_key]
    );

    // ---------------------------------------------------------
    // 3. Fetch employee motivations (normal votes)
    // ---------------------------------------------------------
    const motivations = await db.all(
      `SELECT v.vote_for_id AS employee_id,
              v.voter_id,
              e.name AS voter_name,
              v.motivation,
              v.created_at
       FROM votes v
       JOIN employees e ON e.id = v.voter_id
       WHERE v.month_key = ?
         AND v.is_adjudication = 0
         AND v.motivation IS NOT NULL
       ORDER BY v.created_at ASC`,
      [month_key]
    );

    // ---------------------------------------------------------
    // 4. Fetch adjudicator votes
    // ---------------------------------------------------------
    const adjudicatorVotes = await db.all(
      `SELECT v.vote_for_id AS employee_id,
              v.voter_id AS adjudicator_id,
              e.name AS adjudicator_name,
              v.created_at
       FROM votes v
       JOIN employees e ON e.id = v.voter_id
       WHERE v.month_key = ?
         AND v.is_adjudication = 1
       ORDER BY v.created_at ASC`,
      [month_key]
    );

    // ---------------------------------------------------------
    // 5. Attach reflections + motivations + adjudicator votes
    // ---------------------------------------------------------
    const candidatesFull = candidates.map(c => ({
      ...c,
      reflection_text:
        reflections.find(r => r.employee_id === c.employee_id)?.reflection_text || "",
      motivations: motivations.filter(m => m.employee_id === c.employee_id),
      adjudicatorVotes: adjudicatorVotes.filter(a => a.employee_id === c.employee_id)
    }));

    // ---------------------------------------------------------
    // 6. Suggested winner (highest employee votes)
    // ---------------------------------------------------------
    const maxVotes = Math.max(...candidates.map(c => c.votes));
    const suggestedWinner = candidates.find(c => c.votes === maxVotes);

    // ---------------------------------------------------------
    // 7. Tied candidates (highlighting only)
    // ---------------------------------------------------------
    const tiedCandidates = candidates
      .filter(c => c.votes === maxVotes)
      .map(c => c.employee_id);

    // ---------------------------------------------------------
    // 8. Check if final winner already exists
    // ---------------------------------------------------------
    const finalWinner = await db.get(
      `SELECT employee_id
       FROM results_final
       WHERE month_key = ?
       LIMIT 1`,
      [month_key]
    );

    // ---------------------------------------------------------
    // 9. Determine if all adjudicators have voted
    // ---------------------------------------------------------
    const adjudicators = await db.all(
      `SELECT id FROM employees WHERE is_adjudicator = 1`
    );

    const allAdjudicatorsVoted =
      adjudicatorVotes.length === adjudicators.length;

    // ---------------------------------------------------------
    // 10. Return unified adjudication payload
    // ---------------------------------------------------------
    return res.json({
      month_key,
      candidates: candidatesFull,
      suggestedWinner,
      tiedCandidates,
      adjudicatorVotes,
      allAdjudicatorsVoted,
      finalWinner
    });

  } catch (err) {
    console.error("Error in adjudication panel:", err);
    return res.status(500).json({ error: "Failed to load adjudication panel data" });
  }
});

/* -----------------------------------------------------
   POST /adjudication/vote
   Body: { vote_for_id, month_key }
   One adjudication vote per adjudicator
----------------------------------------------------- */
router.post("/vote", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    const identity = getIdentity(user);
    if (identity !== "Adjudicator") {
      return res.status(403).json({ error: "Only adjudicators may vote" });
    }

    const voterId = user.id;
    const { vote_for_id, month_key: rawMonth } = req.body ?? {};

    const voteForId = Number(vote_for_id);
    const month_key = normalizeMonthKey(rawMonth);

    if (!voteForId || !month_key) {
      return res.status(400).json({ error: "Missing vote_for_id or month_key" });
    }

    // Prevent double adjudication vote
    const existing = await db.get(
      `SELECT id FROM votes
       WHERE voter_id = ? AND month_key = ? AND is_adjudication = 1`,
      [voterId, month_key]
    );

    if (existing) {
      return res.status(409).json({
        error: "You have already cast your adjudication vote"
      });
    }

    // Insert adjudication vote
    const result = await db.run(
      `INSERT INTO votes (voter_id, vote_for_id, month_key, is_adjudication)
       VALUES (?, ?, ?, 1)`,
      [voterId, voteForId, month_key]
    );

    return res.status(201).json({
      success: true,
      id: result.insertId,
      voter_id: voterId,
      vote_for_id: voteForId,
      month_key,
      is_adjudication: 1
    });

  } catch (err) {
    console.error("Error casting adjudication vote:", err);
    return res.status(500).json({ error: "Failed to cast adjudication vote" });
  }
});

/* -----------------------------------------------------
   POST /adjudication/confirm
   Finalises the winner:
   - Combines employee votes + adjudicator votes
   - Stores final winner in results_final
----------------------------------------------------- */
router.post("/confirm", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    const identity = getIdentity(user);
    if (identity !== "Adjudicator") {
      return res.status(403).json({ error: "Only adjudicators may confirm" });
    }

    const { month_key: rawMonth } = req.body ?? {};
    const month_key = normalizeMonthKey(rawMonth);

    if (!month_key) {
      return res.status(400).json({ error: "Missing month_key" });
    }

    // Prevent double finalisation
    const existing = await db.get(
      `SELECT 1 FROM results_final WHERE month_key = ?`,
      [month_key]
    );

    if (existing) {
      return res.status(409).json({ error: "Winner already finalised" });
    }

    // Combine employee votes + adjudicator votes
    const final = await db.get(
      `SELECT employee_id, SUM(votes) AS total
       FROM (
         SELECT vote_for_id AS employee_id, COUNT(*) AS votes
         FROM votes
         WHERE month_key = ? AND is_adjudication = 0
         GROUP BY vote_for_id

         UNION ALL

         SELECT vote_for_id AS employee_id, COUNT(*) AS votes
         FROM votes
         WHERE month_key = ? AND is_adjudication = 1
         GROUP BY vote_for_id
       )
       GROUP BY employee_id
       ORDER BY total DESC
       LIMIT 1`,
      [month_key, month_key]
    );

    await db.run(
      `INSERT INTO results_final (employee_id, month_key)
       VALUES (?, ?)`,
      [final.employee_id, month_key]
    );

    return res.json({ success: true, winner: final.employee_id });

  } catch (err) {
    console.error("Error finalising adjudication:", err);
    return res.status(500).json({ error: "Failed to finalise winner" });
  }
});

export default router;