import { Router } from "express";
import { getCurrentUser, getIdentity } from "../utils/auth";
import db from "../db";

const router = Router();

function normalizeMonthKey(raw: string): string {
  if (!raw) return "";
  return raw.trim().slice(0, 7);
}

/* -----------------------------------------------------
   GET /adjudication/panel?month=YYYY-MM
   Unified adjudication payload
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

    /* -----------------------------------------------------
       1. Candidates (non-adjudicators with final reflections)
    ----------------------------------------------------- */
    const candidates = await db.all(
      `
      SELECT e.id AS employee_id,
             e.name,
             e.photo_url,
             r.achievements_text,
             r.impact_text,
             r.values_text,
             r.growth_text,
             r.beyond_text,
             r.nomination_text
      FROM employees e
      JOIN reflections r ON r.employee_id = e.id
      WHERE r.month_key = ?
        AND r.is_final = 1
        AND e.is_adjudicator = 0
      ORDER BY e.name ASC
      `,
      [month_key]
    );

    /* -----------------------------------------------------
       2. Employee vote totals (sum across all questions)
    ----------------------------------------------------- */
    const voteTotals = await db.all(
      `
      SELECT nominee_id AS employee_id,
             COUNT(*) AS votes
      FROM votes
      WHERE month_key = ?
        AND is_final = 1
        AND question_key != 'adjudication'
      GROUP BY nominee_id
      `,
      [month_key]
    );

    const voteMap = new Map<number, number>();
    voteTotals.forEach((v: any) => voteMap.set(v.employee_id, v.votes));

    const candidatesFull = candidates.map((c: any) => ({
      employee_id: c.employee_id,
      name: c.name,
      photo_url: c.photo_url,
      votes: voteMap.get(c.employee_id) || 0,
      reflections: {
        achievements_text: c.achievements_text,
        impact_text: c.impact_text,
        values_text: c.values_text,
        growth_text: c.growth_text,
        beyond_text: c.beyond_text,
        nomination_text: c.nomination_text,
      },
    }));

    /* -----------------------------------------------------
       3. Suggested winner (before adjudication rounds)
    ----------------------------------------------------- */
    let suggestedWinner = null;
    if (candidatesFull.length > 0) {
      const maxVotes = Math.max(...candidatesFull.map((c) => c.votes));
      suggestedWinner =
        candidatesFull.find((c) => c.votes === maxVotes) || null;
    }

    /* -----------------------------------------------------
       4. Tied candidates (before adjudication rounds)
    ----------------------------------------------------- */
    let tiedCandidates: number[] = [];
    if (candidatesFull.length > 0) {
      const maxVotes = Math.max(...candidatesFull.map((c) => c.votes));
      tiedCandidates = candidatesFull
        .filter((c) => c.votes === maxVotes)
        .map((c) => c.employee_id);
    }

    /* -----------------------------------------------------
       5. Current adjudication round
    ----------------------------------------------------- */
    const roundRow = await db.get(
      `
      SELECT MAX(round_number) AS round_number
      FROM adjudication_rounds
      WHERE month_key = ?
      `,
      [month_key]
    );

    const currentRound = roundRow?.round_number || null;

    let roundCandidates: any[] = [];
    let roundVotes: any[] = [];
    let roundWinner: number | null = null;
    let allAdjudicatorsVotedInRound = false;

    if (currentRound) {
      roundCandidates = await db.all(
        `
        SELECT ar.candidate_id AS employee_id,
               e.name AS employee_name,
               ar.votes
        FROM adjudication_rounds ar
        JOIN employees e ON e.id = ar.candidate_id
        WHERE ar.month_key = ?
          AND ar.round_number = ?
        ORDER BY e.name ASC
        `,
        [month_key, currentRound]
      );

      roundVotes = await db.all(
        `
        SELECT arv.adjudicator_id,
               ae.name AS adjudicator_name,
               arv.candidate_id AS employee_id,
               ce.name AS employee_name,
               arv.created_at
        FROM adjudication_round_votes arv
        JOIN employees ae ON ae.id = arv.adjudicator_id
        JOIN employees ce ON ce.id = arv.candidate_id
        WHERE arv.month_key = ?
          AND arv.round_number = ?
        ORDER BY arv.created_at ASC
        `,
        [month_key, currentRound]
      );

      const adjudicators = await db.all(
        `SELECT id FROM employees WHERE is_adjudicator = 1`
      );

      allAdjudicatorsVotedInRound =
        roundVotes.length === adjudicators.length;

      if (roundCandidates.length > 0) {
        const maxVotes = Math.max(...roundCandidates.map((c: any) => c.votes));
        const top = roundCandidates.filter((c: any) => c.votes === maxVotes);
        if (allAdjudicatorsVotedInRound && top.length === 1) {
          roundWinner = top[0].employee_id;
        }
      }
    }

    /* -----------------------------------------------------
       6. Final winner (if already stored)
    ----------------------------------------------------- */
    const finalWinner = await db.get(
      `
      SELECT rf.employee_id, e.name AS employee_name
      FROM results_final rf
      JOIN employees e ON e.id = rf.employee_id
      WHERE rf.month_key = ?
      LIMIT 1
      `,
      [month_key]
    );

    return res.json({
      month_key,
      candidates: candidatesFull,
      suggestedWinner,
      tiedCandidates,
      currentRound,
      roundCandidates,
      roundVotes,
      roundWinner,
      allAdjudicatorsVotedInRound,
      finalWinner,
    });
  } catch (err) {
    console.error("Error in adjudication panel:", err);
    return res
      .status(500)
      .json({ error: "Failed to load adjudication panel data" });
  }
});

/* -----------------------------------------------------
   POST /adjudication/start-round
----------------------------------------------------- */
router.post("/start-round", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    if (getIdentity(user) !== "Adjudicator") {
      return res.status(403).json({ error: "Only adjudicators may start rounds" });
    }

    const month_key = normalizeMonthKey(req.body?.month_key);
    if (!month_key) return res.status(400).json({ error: "Missing month_key" });

    const existingFinal = await db.get(
      `SELECT 1 FROM results_final WHERE month_key = ?`,
      [month_key]
    );
    if (existingFinal) {
      return res.status(409).json({ error: "Winner already finalised" });
    }

    const voteTotals = await db.all(
      `
      SELECT nominee_id AS employee_id,
             COUNT(*) AS votes
      FROM votes
      WHERE month_key = ?
        AND is_final = 1
        AND question_key != 'adjudication'
      GROUP BY nominee_id
      `,
      [month_key]
    );

    if (!voteTotals.length) {
      return res.status(400).json({ error: "No employee votes found" });
    }

    const maxVotes = Math.max(...voteTotals.map((v: any) => v.votes));
    const tied = voteTotals.filter((v: any) => v.votes === maxVotes);

    if (tied.length < 2) {
      return res.status(400).json({ error: "No tie detected" });
    }

    // Safety: remove adjudicators from tied list
    const filteredTied: any[] = [];
    for (const t of tied) {
      const emp = await db.get(
        `SELECT is_adjudicator FROM employees WHERE id = ?`,
        [t.employee_id]
      );
      if (emp?.is_adjudicator === 0) {
        filteredTied.push(t);
      }
    }

    if (filteredTied.length < 2) {
      return res.status(400).json({ error: "No valid tie among employees" });
    }

    const row = await db.get(
      `
      SELECT MAX(round_number) AS round_number
      FROM adjudication_rounds
      WHERE month_key = ?
      `,
      [month_key]
    );
    const nextRound = (row?.round_number || 0) + 1;

    for (const t of filteredTied) {
      await db.run(
        `
        INSERT INTO adjudication_rounds (month_key, round_number, candidate_id, votes)
        VALUES (?, ?, ?, 0)
        `,
        [month_key, nextRound, t.employee_id]
      );
    }

    return res.json({
      success: true,
      month_key,
      round_number: nextRound,
      candidates: filteredTied,
    });
  } catch (err) {
    console.error("Error starting adjudication round:", err);
    return res.status(500).json({ error: "Failed to start adjudication round" });
  }
});

/* -----------------------------------------------------
   POST /adjudication/round-vote
----------------------------------------------------- */
router.post("/round-vote", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    if (getIdentity(user) !== "Adjudicator") {
      return res.status(403).json({ error: "Only adjudicators may vote" });
    }

    const adjudicatorId = user.id;
    const month_key = normalizeMonthKey(req.body?.month_key);
    const candidateId = Number(req.body?.candidate_id);

    if (!month_key || !candidateId) {
      return res.status(400).json({ error: "Missing month_key or candidate_id" });
    }

    const row = await db.get(
      `
      SELECT MAX(round_number) AS round_number
      FROM adjudication_rounds
      WHERE month_key = ?
      `,
      [month_key]
    );
    const currentRound = row?.round_number;
    if (!currentRound) {
      return res.status(400).json({ error: "No active adjudication round" });
    }

    const candidateRow = await db.get(
      `
      SELECT 1
      FROM adjudication_rounds
      WHERE month_key = ?
        AND round_number = ?
        AND candidate_id = ?
      `,
      [month_key, currentRound, candidateId]
    );
    if (!candidateRow) {
      return res.status(400).json({ error: "Candidate not in this round" });
    }

    const existing = await db.get(
      `
      SELECT 1
      FROM adjudication_round_votes
      WHERE month_key = ?
        AND round_number = ?
        AND adjudicator_id = ?
      `,
      [month_key, currentRound, adjudicatorId]
    );
    if (existing) {
      return res.status(409).json({ error: "You already voted in this round" });
    }

    await db.run(
      `
      INSERT INTO adjudication_round_votes (month_key, round_number, adjudicator_id, candidate_id)
      VALUES (?, ?, ?, ?)
      `,
      [month_key, currentRound, adjudicatorId, candidateId]
    );

    await db.run(
      `
      UPDATE adjudication_rounds
      SET votes = votes + 1
      WHERE month_key = ?
        AND round_number = ?
        AND candidate_id = ?
      `,
      [month_key, currentRound, candidateId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Error casting round vote:", err);
    return res.status(500).json({ error: "Failed to cast round vote" });
  }
});

/* -----------------------------------------------------
   GET /adjudication/round-status
----------------------------------------------------- */
router.get("/round-status", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    if (getIdentity(user) !== "Adjudicator") {
      return res.status(403).json({ error: "Access denied" });
    }

    const month_key = normalizeMonthKey(String(req.query.month || ""));
    if (!month_key) {
      return res.status(400).json({ error: "Missing month parameter" });
    }

    const row = await db.get(
      `
      SELECT MAX(round_number) AS round_number
      FROM adjudication_rounds
      WHERE month_key = ?
      `,
      [month_key]
    );
    const currentRound = row?.round_number || null;

    if (!currentRound) {
      return res.json({
        month_key,
        currentRound: null,
        candidates: [],
        votes: [],
        allAdjudicatorsVoted: false,
        winner: null,
      });
    }

    const candidates = await db.all(
      `
      SELECT ar.candidate_id AS employee_id,
             e.name AS employee_name,
             ar.votes
      FROM adjudication_rounds ar
      JOIN employees e ON e.id = ar.candidate_id
      WHERE ar.month_key = ?
        AND ar.round_number = ?
      ORDER BY e.name ASC
      `,
      [month_key, currentRound]
    );

    const votes = await db.all(
      `
      SELECT arv.adjudicator_id,
             ae.name AS adjudicator_name,
             arv.candidate_id AS employee_id,
             ce.name AS employee_name,
             arv.created_at
      FROM adjudication_round_votes arv
      JOIN employees ae ON ae.id = arv.adjudicator_id
      JOIN employees ce ON ce.id = arv.candidate_id
      WHERE arv.month_key = ?
        AND arv.round_number = ?
      ORDER BY arv.created_at ASC
      `,
      [month_key, currentRound]
    );

    const adjudicators = await db.all(
      `SELECT id FROM employees WHERE is_adjudicator = 1`
    );

    const allAdjudicatorsVoted = votes.length === adjudicators.length;

    let winner: number | null = null;
    if (candidates.length > 0) {
      const maxVotes = Math.max(...candidates.map((c: any) => c.votes));
      const top = candidates.filter((c: any) => c.votes === maxVotes);
      if (allAdjudicatorsVoted && top.length === 1) {
        winner = top[0].employee_id;
      }
    }

    return res.json({
      month_key,
      currentRound,
      candidates,
      votes,
      allAdjudicatorsVoted,
      winner,
    });
  } catch (err) {
    console.error("Error fetching round status:", err);
    return res.status(500).json({ error: "Failed to fetch round status" });
  }
});

/* -----------------------------------------------------
   GET /adjudication/round-history
----------------------------------------------------- */
router.get("/round-history", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    if (getIdentity(user) !== "Adjudicator") {
      return res.status(403).json({ error: "Access denied" });
    }

    const month_key = normalizeMonthKey(String(req.query.month || ""));
    if (!month_key) {
      return res.status(400).json({ error: "Missing month parameter" });
    }

    const roundRows = await db.all(
      `
      SELECT ar.round_number,
             ar.candidate_id AS employee_id,
             e.name AS employee_name,
             ar.votes
      FROM adjudication_rounds ar
      JOIN employees e ON e.id = ar.candidate_id
      WHERE ar.month_key = ?
      ORDER BY ar.round_number ASC, ar.votes DESC, e.name ASC
      `,
      [month_key]
    );

    const voteRows = await db.all(
      `
      SELECT arv.round_number,
             arv.adjudicator_id,
             ae.name AS adjudicator_name,
             arv.candidate_id AS employee_id,
             ce.name AS employee_name,
             arv.created_at
      FROM adjudication_round_votes arv
      JOIN employees ae ON ae.id = arv.adjudicator_id
      JOIN employees ce ON ce.id = arv.candidate_id
      WHERE arv.month_key = ?
      ORDER BY arv.round_number ASC, arv.created_at ASC
      `,
      [month_key]
    );

    const roundsMap = new Map<number, any>();

    for (const r of roundRows) {
      if (!roundsMap.has(r.round_number)) {
        roundsMap.set(r.round_number, {
          round_number: r.round_number,
          candidates: [],
          votes: [],
        });
      }
      roundsMap.get(r.round_number).candidates.push({
        employee_id: r.employee_id,
        employee_name: r.employee_name,
        votes: r.votes,
      });
    }

    for (const v of voteRows) {
      if (!roundsMap.has(v.round_number)) {
        roundsMap.set(v.round_number, {
          round_number: v.round_number,
          candidates: [],
          votes: [],
        });
      }
      roundsMap.get(v.round_number).votes.push({
        adjudicator_id: v.adjudicator_id,
        adjudicator_name: v.adjudicator_name,
        employee_id: v.employee_id,
        employee_name: v.employee_name,
        created_at: v.created_at,
      });
    }

    const rounds = Array.from(roundsMap.values()).sort(
      (a, b) => a.round_number - b.round_number
    );

    return res.json({ month_key, rounds });
  } catch (err) {
    console.error("Error fetching round history:", err);
    return res.status(500).json({ error: "Failed to fetch round history" });
  }
});

/* -----------------------------------------------------
   POST /adjudication/finalise-winner
----------------------------------------------------- */
router.post("/finalise-winner", async (req, res) => {
  try {
    const user = await getCurrentUser(req);
    if (!user) return res.status(401).json({ error: "Not logged in" });

    if (getIdentity(user) !== "Adjudicator") {
      return res.status(403).json({ error: "Only adjudicators may finalise" });
    }

    const month_key = normalizeMonthKey(req.body?.month_key);
    if (!month_key) {
      return res.status(400).json({ error: "Missing month_key" });
    }

    const existing = await db.get(
      `SELECT 1 FROM results_final WHERE month_key = ?`,
      [month_key]
    );
    if (existing) {
      return res.status(409).json({ error: "Winner already finalised" });
    }

    const row = await db.get(
      `
      SELECT MAX(round_number) AS round_number
      FROM adjudication_rounds
      WHERE month_key = ?
      `,
      [month_key]
    );
    const currentRound = row?.round_number;
    if (!currentRound) {
      return res
        .status(400)
        .json({ error: "No adjudication round found for this month" });
    }

    const candidates = await db.all(
      `
      SELECT candidate_id AS employee_id, votes
      FROM adjudication_rounds
      WHERE month_key = ?
        AND round_number = ?
      `,
      [month_key, currentRound]
    );

    if (!candidates || candidates.length === 0) {
      return res
        .status(400)
        .json({ error: "No candidates in current adjudication round" });
    }

    const maxVotes = Math.max(...candidates.map((c: any) => c.votes));
    const top = candidates.filter((c: any) => c.votes === maxVotes);

    if (top.length !== 1) {
      return res
        .status(400)
        .json({ error: "No single winner in current round (tie persists)" });
    }

    const winnerId = top[0].employee_id;

    await db.run(
      `
      INSERT INTO results_final (employee_id, month_key)
      VALUES (?, ?)
      `,
      [winnerId, month_key]
    );

    return res.json({ success: true, winner: winnerId });
  } catch (err) {
    console.error("Error finalising winner:", err);
    return res.status(500).json({ error: "Failed to finalise winner" });
  }
});

/* -----------------------------------------------------
   EXPORT ROUTER
----------------------------------------------------- */
export default router;