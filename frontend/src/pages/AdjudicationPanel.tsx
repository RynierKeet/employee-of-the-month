import { useEffect, useState } from "react";
import { InfoIcon } from "../components/InfoIcon";
import { Modal } from "../components/Modal";
import { ReflectionGuidelines } from "../components/ReflectionGuidelines";

interface Candidate {
  employee_id: number;
  name: string;
  photo_url?: string;
  votes: number;
  reflections: {
    achievements_text: string;
    impact_text: string;
    values_text: string;
    growth_text: string;
    beyond_text: string;
    nomination_text: string;
  };
}

interface RoundCandidate {
  employee_id: number;
  employee_name: string;
  votes: number;
}

interface RoundVote {
  adjudicator_id: number;
  adjudicator_name: string;
  employee_id: number;
  employee_name: string;
  created_at: string;
}

interface PanelPayload {
  month_key: string;
  candidates: Candidate[];
  suggestedWinner: Candidate | null;
  tiedCandidates: number[];
  currentRound: number | null;
  roundCandidates: RoundCandidate[];
  roundVotes: RoundVote[];
  roundWinner: number | null;
  allAdjudicatorsVotedInRound: boolean;
  finalWinner: { employee_id: number; employee_name: string } | null;
}

interface RoundHistoryCandidate {
  employee_id: number;
  employee_name: string;
  votes: number;
}

interface RoundHistoryVote {
  adjudicator_id: number;
  adjudicator_name: string;
  employee_id: number;
  employee_name: string;
  created_at: string;
}

interface RoundHistoryRound {
  round_number: number;
  candidates: RoundHistoryCandidate[];
  votes: RoundHistoryVote[];
}

interface RoundHistoryPayload {
  month_key: string;
  rounds: RoundHistoryRound[];
}

export default function AdjudicationPanel() {
  const [month, setMonth] = useState("2026-02");
  const [panel, setPanel] = useState<PanelPayload | null>(null);
  const [roundHistory, setRoundHistory] = useState<RoundHistoryPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  /* -----------------------------------------------------
     LOAD PANEL (GET /adjudication/panel?month=YYYY-MM)
  ----------------------------------------------------- */
  async function loadPanel() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(
        `http://localhost:3000/adjudication/panel?month=${month}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to load adjudication panel.");
        setPanel(null);
        return;
      }
      setPanel(data);
    } catch {
      setMessage("Server error while loading panel.");
      setPanel(null);
    } finally {
      setLoading(false);
    }
  }

  /* -----------------------------------------------------
     LOAD ROUND HISTORY (GET /adjudication/round-history?month=YYYY-MM)
  ----------------------------------------------------- */
  async function loadRoundHistory() {
    try {
      const res = await fetch(
        `http://localhost:3000/adjudication/round-history?month=${month}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        setRoundHistory(null);
        return;
      }
      setRoundHistory(data);
    } catch {
      setRoundHistory(null);
    }
  }

  useEffect(() => {
    loadPanel();
    loadRoundHistory();
  }, [month]);

  /* -----------------------------------------------------
     START ROUND (POST)
  ----------------------------------------------------- */
  async function startRound() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:3000/adjudication/start-round", {
       method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ month_key: month }),
});

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to start adjudication round.");
        return;
      }

      setMessage("Adjudication round started.");
      await loadPanel();
      await loadRoundHistory();
    } catch {
      setMessage("Server error while starting round.");
    } finally {
      setLoading(false);
    }
  }

  /* -----------------------------------------------------
     CAST ROUND VOTE (POST)
  ----------------------------------------------------- */
  async function castRoundVote(candidateId: number) {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:3000/adjudication/round-vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
      month_key: month,
      candidate_id: candidateId,
  }),
});

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to cast vote.");
        return;
      }

      setMessage("Your vote has been recorded.");
      await loadPanel();
      await loadRoundHistory();
    } catch {
      setMessage("Server error while casting vote.");
    } finally {
      setLoading(false);
    }
  }

  /* -----------------------------------------------------
     FINALISE WINNER (POST)
  ----------------------------------------------------- */
  async function finaliseWinner() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:3000/adjudication/finalise-winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ month_key: month }),
});

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to finalise winner.");
        return;
      }

      setMessage("Winner finalised successfully.");
      await loadPanel();
      await loadRoundHistory();
    } catch {
      setMessage("Server error while finalising winner.");
    } finally {
      setLoading(false);
    }
  }

  /* -----------------------------------------------------
     EMPTY PANEL STATE
  ----------------------------------------------------- */
  if (!panel) {
    return (
      <div className="p-8 text-slate-700">
        {loading ? "Loading adjudication panel..." : "No data available."}
      </div>
    );
  }

  const {
    candidates,
    tiedCandidates,
    currentRound,
    roundCandidates,
    roundWinner,
    finalWinner,
  } = panel;

  return (
    <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Adjudication Panel
          </h2>
          <p className="text-sm text-slate-700 mt-1">
            Review candidates, reflections, and manage adjudication rounds.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide">
            Month
          </label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-300 rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crgGold"
          />
        </div>
      </div>

      {/* Tie banner */}
      {tiedCandidates.length > 1 && !currentRound && !finalWinner && (
        <div className="p-4 border border-crgGold bg-[#fdf8ea] rounded-card space-y-1">
          <p className="font-medium text-slate-900">Tie detected</p>
          <p className="text-sm text-slate-700">
            The following employees are tied for Employee of the Month:
          </p>
          <p className="text-sm text-slate-900 font-medium">
            {tiedCandidates
              .map((id) => candidates.find((c) => c.employee_id === id)?.name)
              .join(", ")}
          </p>

          <button
            onClick={startRound}
            disabled={loading}
            className="mt-3 px-4 py-2 rounded-card font-medium text-white bg-brandnavy hover:bg-slate-800 hover:text-crgGold transition disabled:opacity-50"
          >
            Start Adjudication Round
          </button>
        </div>
      )}

      {/* Current Round */}
      {currentRound && !finalWinner && (
        <div className="border border-crgGold bg-[#fff9e8] rounded-card p-6 space-y-4">
          <p className="text-sm font-semibold text-slate-900">
            Adjudication Round {currentRound}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {roundCandidates.map((c) => (
              <div
                key={c.employee_id}
                className="border border-slate-300 bg-white rounded-card p-4 space-y-3"
              >
                <p className="text-sm font-semibold text-slate-900">
                  {c.employee_name}
                </p>
                <p className="text-xs text-slate-600">
                  Round votes: {c.votes}
                </p>

                {!roundWinner && (
                  <button
                    onClick={() => castRoundVote(c.employee_id)}
                    disabled={loading}
                    className="w-full px-4 py-2 rounded-card font-medium text-white bg-brandnavy hover:bg-slate-800 hover:text-crgGold transition disabled:opacity-50"
                  >
                    Vote for {c.employee_name}
                  </button>
                )}
              </div>
            ))}
          </div>

          {roundWinner && (
            <div className="p-4 border border-emerald-600 bg-emerald-50 rounded-card">
              <p className="text-sm font-semibold text-emerald-800">
                Round Winner:
              </p>
              <p className="text-sm text-emerald-900">
                {
                  roundCandidates.find((c) => c.employee_id === roundWinner)
                    ?.employee_name
                }
              </p>

              <button
                onClick={finaliseWinner}
                disabled={loading}
                className="mt-3 px-6 py-3 rounded-card font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50"
              >
                Finalise Winner
              </button>
            </div>
          )}
        </div>
      )}

      {/* Final Winner */}
      {finalWinner && (
        <div className="p-5 border border-crgGold bg-[#fdf8ea] rounded-card space-y-3">
          <p className="text-sm font-semibold text-slate-900">Final Winner</p>
          <p className="text-sm text-slate-800">{finalWinner.employee_name}</p>
        </div>
      )}

      {/* Candidate grid */}
      {!currentRound && !finalWinner && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {candidates.map((c) => {
            const isTied = tiedCandidates.includes(c.employee_id);

            return (
              <div
                key={c.employee_id}
                className={`border rounded-card p-5 space-y-4 ${
                  isTied
                    ? "border-crgGold bg-[#fdf8ea]"
                    : "border-slate-200 bg-slate-50"
                }`}
              >
                <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-600">
                  Employee votes: {c.votes}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center">
                    <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                      Reflections
                    </p>
                    <InfoIcon onClick={() => setGuidelinesOpen(true)} />
                  </div>

                  <div className="space-y-2 text-sm">
                    {Object.entries(c.reflections).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-white border border-slate-200 rounded-card p-3"
                      >
                        <p className="font-medium text-slate-900 capitalize">
                          {key.replace("_text", "").replace("_", " ")}
                        </p>
                        <p className="text-slate-700 mt-1">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Round History */}
      {roundHistory && roundHistory.rounds.length > 0 && (
        <div className="border border-slate-200 rounded-card p-6 space-y-4">
          <p className="text-sm font-semibold text-slate-900">Round History</p>

          <div className="space-y-3">
            {roundHistory.rounds.map((round) => (
              <Accordion
                key={round.round_number}
                title={`Round ${round.round_number}`}
                highlight
                defaultOpen={false}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                      Candidates
                    </p>
                    <ul className="mt-1 space-y-1 text-sm">
                      {round.candidates.map((c) => (
                        <li
                          key={c.employee_id}
                          className="flex justify-between"
                        >
                          <span>{c.employee_name}</span>
                          <span className="text-slate-600">
                            Votes: {c.votes}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
                      Adjudicator Votes
                    </p>
                    {round.votes.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">
                        No votes recorded in this round.
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-1 text-xs text-slate-700">
                        {round.votes.map((v, idx) => (
                          <li key={idx}>
                            <span className="font-medium">
                              {v.adjudicator_name}
                            </span>{" "}
                            voted for{" "}
                            <span className="font-medium">
                              {v.employee_name}
                            </span>{" "}
                            <span className="text-slate-500">
                              ({new Date(v.created_at).toLocaleString()})
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </Accordion>
            ))}
          </div>
        </div>
      )}

      {message && (
        <p className="text-sm font-medium text-slate-800">{message}</p>
      )}

      <Modal
        open={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
        title="Reflection Guidelines"
      >
        <ReflectionGuidelines />
      </Modal>
    </div>
  );
}

/* ---------------------------------------------------------
   Gold‑highlighted Tailwind Accordion Component
--------------------------------------------------------- */
function Accordion({
  title,
  children,
  highlight = false,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  highlight?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`border rounded-card ${
        open && highlight ? "border-crgGold bg-[#fff9e8]" : "border-slate-300"
      }`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
          {title}
        </span>
        <span
          className={`transition-transform ${
            open ? "rotate-90 text-crgGold" : "text-slate-500"
          }`}
        >
          ▶
        </span>
      </button>

      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}