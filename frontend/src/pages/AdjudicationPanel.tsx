import { useEffect, useMemo, useState } from "react";
import { InfoIcon } from "../components/InfoIcon";
import { Modal } from "../components/Modal";
import { ReflectionGuidelines } from "../components/ReflectionGuidelines";
import { VotingGuidelines } from "../components/VotingGuidelines";

interface Employee {
  id: number;
  name: string;
}

interface ResultRow {
  employee_id: number;
  votes: number;
}

interface Reflection {
  id: number;
  employee_id: number;
  month_key: string;
  reflection_text: string;
}

interface Vote {
  id: number;
  voter_id: number;
  vote_for_id: number;
  month_key: string;
  motivation: string;
  created_at: string;
}

interface AdjudicationVote {
  id: number;
  voter_id: number; // adjudicator id
  vote_for_id: number;
  month_key: string;
  motivation: string;
  created_at: string;
}

const ADJUDICATOR_IDS = [7, 10];

function isJsonResponse(res: Response) {
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json");
}

export default function AdjudicationPanel() {
  const [month, setMonth] = useState("2026-02");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [adjudicationVotes, setAdjudicationVotes] = useState<AdjudicationVote[]>([]);

  const [selectedAdjudicatorId, setSelectedAdjudicatorId] = useState<number | "">("");
  const [adjudicationChoiceId, setAdjudicationChoiceId] = useState<number | "">("");
  const [adjudicationMotivation, setAdjudicationMotivation] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [finalised, setFinalised] = useState(false);

  const [guidelinesOpen, setGuidelinesOpen] = useState(false);
  const [votingGuidelinesOpen, setVotingGuidelinesOpen] = useState(false);

  const safeArray = (data: unknown) => (Array.isArray(data) ? data : []);

  // Generic safe fetch helper that validates JSON and returns parsed JSON or null
  async function safeFetchJson(url: string) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // server returned non-2xx — try to parse JSON error if possible
        if (isJsonResponse(res)) {
          return await res.json();
        }
        // non-JSON (HTML) response — return null so caller can handle
        return null;
      }
      if (!isJsonResponse(res)) {
        // Received HTML (likely a 404 page or index.html) — return null
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  }

  useEffect(() => {
    // employees
    safeFetchJson("http://localhost:3000/employees").then((data) => {
      setEmployees(safeArray(data) as Employee[]);
    });

    // results, reflections, votes, adjudication votes
  }, []);

  useEffect(() => {
    setMessage("");

    safeFetchJson(`http://localhost:3000/results?month=${month}`).then((data) => {
      setResults(safeArray(data) as ResultRow[]);
    });

    safeFetchJson(`http://localhost:3000/reflections?month=${month}`).then((data) => {
      setReflections(safeArray(data) as Reflection[]);
    });

    safeFetchJson(`http://localhost:3000/votes?month=${month}`).then((data) => {
      setVotes(safeArray(data) as Vote[]);
    });

    // adjudication endpoint may return { votes: [...] } or an array directly.
    safeFetchJson(`http://localhost:3000/adjudication/votes?month=${month}`).then((data) => {
      if (!data) {
        setAdjudicationVotes([]);
        return;
      }

      // If backend returns { votes: [...] }
      if (typeof data === "object" && Array.isArray((data as any).votes)) {
        setAdjudicationVotes((data as any).votes as AdjudicationVote[]);
        return;
      }

      // If backend returns an array directly
      if (Array.isArray(data)) {
        setAdjudicationVotes(data as AdjudicationVote[]);
        return;
      }

      // Unexpected shape
      setAdjudicationVotes([]);
    });
  }, [month]);

  const getEmployeeName = (id: number | undefined) =>
    id ? employees.find((e) => e.id === id)?.name || `Employee ${id}` : "Unknown";

  const adjudicators = useMemo(
    () => employees.filter((e) => ADJUDICATOR_IDS.includes(e.id)),
    [employees]
  );

  const maxVotes =
    results.length > 0 ? results.reduce((max, r) => (r.votes > max ? r.votes : max), 0) : 0;

  const tiedRows = results.filter((r) => r.votes === maxVotes && maxVotes > 0);
  const baseTiedEmployeeIds = tiedRows.map((t) => t.employee_id);

  // Ensure we always operate on arrays (protect against malformed state)
  const adjudicationVotesArr = Array.isArray(adjudicationVotes) ? adjudicationVotes : [];

  // -----------------------------
  // MULTI-ROUND ADJUDICATION LOGIC
  // -----------------------------
  const { currentPoolIds, adjudicationWinner } = useMemo(() => {
    let poolIds = [...baseTiedEmployeeIds];
    let winner: { employeeId: number; votes: number } | null = null;

    if (poolIds.length === 0) {
      return { currentPoolIds: poolIds, adjudicationWinner: null };
    }

    if (adjudicationVotesArr.length === 0) {
      return { currentPoolIds: poolIds, adjudicationWinner: null };
    }

    // Do not declare a winner until ALL adjudicators have voted
    if (adjudicationVotesArr.length < ADJUDICATOR_IDS.length) {
      return { currentPoolIds: poolIds, adjudicationWinner: null };
    }

    // Count votes only for employees in the pool
    const counts: Record<number, number> = {};
    adjudicationVotesArr.forEach((v) => {
      if (!poolIds.includes(v.vote_for_id)) return;
      counts[v.vote_for_id] = (counts[v.vote_for_id] || 0) + 1;
    });

    const entries = Object.entries(counts);
    if (entries.length === 0) {
      return { currentPoolIds: poolIds, adjudicationWinner: null };
    }

    const maxCount = Math.max(...entries.map(([, c]) => c));
    const topIds = entries.filter(([, c]) => c === maxCount).map(([id]) => Number(id));

    if (topIds.length === 1) {
      winner = { employeeId: topIds[0], votes: maxCount };
      poolIds = topIds;
    } else {
      poolIds = topIds;
    }

    return { currentPoolIds: poolIds, adjudicationWinner: winner };
  }, [baseTiedEmployeeIds, adjudicationVotesArr]);

  const tiedEmployees = useMemo(
    () => employees.filter((e) => currentPoolIds.includes(e.id)),
    [employees, currentPoolIds]
  );

  const reflectionsByEmployee = useMemo(() => {
    const map: Record<number, Reflection[]> = {};
    reflections.forEach((r) => {
      if (!map[r.employee_id]) map[r.employee_id] = [];
      map[r.employee_id].push(r);
    });
    return map;
  }, [reflections]);

  const votesByEmployee = useMemo(() => {
    const map: Record<number, Vote[]> = {};
    votes.forEach((v) => {
      if (!map[v.vote_for_id]) map[v.vote_for_id] = [];
      map[v.vote_for_id].push(v);
    });
    return map;
  }, [votes]);

  const adjudicationVotesByEmployee = useMemo(() => {
    const map: Record<number, AdjudicationVote[]> = {};
    adjudicationVotesArr.forEach((v) => {
      if (!map[v.vote_for_id]) map[v.vote_for_id] = [];
      map[v.vote_for_id].push(v);
    });
    return map;
  }, [adjudicationVotesArr]);

  const handleSubmitAdjudicationVote = async () => {
    setMessage("");

    if (!selectedAdjudicatorId || !ADJUDICATOR_IDS.includes(Number(selectedAdjudicatorId))) {
      setMessage("Select your name (adjudicators only).");
      return;
    }
    if (!adjudicationChoiceId) {
      setMessage("Select which tied employee you are voting for.");
      return;
    }
    if (!currentPoolIds.includes(Number(adjudicationChoiceId))) {
      setMessage("You can only vote for employees in the current adjudication pool.");
      return;
    }
    if (!adjudicationMotivation.trim()) {
      setMessage("Provide a motivation for your adjudication decision.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/adjudication/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjudicator_id: selectedAdjudicatorId,
          vote_for_id: adjudicationChoiceId,
          month_key: month,
          motivation: adjudicationMotivation.trim(),
        }),
      });

      if (!res.ok) {
        // try to parse JSON error
        if (isJsonResponse(res)) {
          const err = await res.json();
          setMessage(err?.error || "Server error while submitting adjudication vote.");
        } else {
          setMessage("Server error while submitting adjudication vote.");
        }
        return;
      }

      // refresh adjudication votes safely
      const data = await safeFetchJson(`http://localhost:3000/adjudication/votes?month=${month}`);
      if (data && Array.isArray((data as any).votes)) {
        setAdjudicationVotes((data as any).votes as AdjudicationVote[]);
      } else if (Array.isArray(data)) {
        setAdjudicationVotes(data as AdjudicationVote[]);
      } else {
        setAdjudicationVotes([]);
      }

      setMessage("Adjudication vote submitted.");
      setAdjudicationMotivation("");
      setAdjudicationChoiceId("");
    } catch {
      setMessage("Server error while submitting adjudication vote.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinaliseWinner = async () => {
    setMessage("");

    if (!adjudicationWinner) {
      setMessage("No adjudication winner to finalise.");
      return;
    }

    if (adjudicationVotesArr.length < ADJUDICATOR_IDS.length) {
      setMessage("Cannot finalise until all adjudicators have voted.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/admin/finalise-winner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month_key: month,
          winner_id: adjudicationWinner.employeeId,
          votes: adjudicationWinner.votes,
        }),
      });

      if (!res.ok) {
        if (isJsonResponse(res)) {
          const err = await res.json();
          setMessage(err?.error || "Server error while finalising winner.");
        } else {
          setMessage("Server error while finalising winner.");
        }
        return;
      }

      setFinalised(true);
      setMessage("Winner finalised successfully.");
    } catch {
      setMessage("Server error while finalising winner.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Adjudication Panel</h2>
          <p className="text-sm text-slate-700 mt-1">
            Review tied candidates, their reflections, and voter motivations, then cast adjudication votes.
          </p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide">Month</label>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-300 rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crgGold"
          />
        </div>
      </div>

      {baseTiedEmployeeIds.length === 0 ? (
        <div className="p-4 border border-slate-200 rounded-card bg-slate-50 text-sm text-slate-700">
          No ties detected for this month. Adjudication is not required.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-4 border border-crgGold bg-[#fdf8ea] rounded-card space-y-1">
            <p className="font-medium text-slate-900">Tie detected</p>
            <p className="text-sm text-slate-700">The following employees are tied for Employee of the Month.</p>

            {adjudicationVotesArr.length > 0 && adjudicationVotesArr.length < ADJUDICATOR_IDS.length && (
              <p className="text-sm text-slate-800">
                Waiting for all adjudicators to vote ({adjudicationVotesArr.length}/{ADJUDICATOR_IDS.length} received).
              </p>
            )}

            {adjudicationVotesArr.length === ADJUDICATOR_IDS.length && !adjudicationWinner && currentPoolIds.length > 1 && (
              <p className="text-sm text-slate-800">
                Adjudication votes have narrowed the pool. Adjudicators must now vote again between:{" "}
                {currentPoolIds.map((id) => getEmployeeName(id)).join(", ")}.
              </p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {tiedEmployees.map((emp) => {
              const empResults = results.find((r) => r.employee_id === emp.id);
              const empReflections = reflectionsByEmployee[emp.id] || [];
              const empVotes = votesByEmployee[emp.id] || [];
              const empAdjVotes = adjudicationVotesByEmployee[emp.id] || [];

              return (
                <div key={emp.id} className="border border-slate-200 rounded-card p-5 space-y-4 bg-slate-50">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{emp.name}</p>
                    <p className="text-xs text-slate-600">Normal votes: {empResults?.votes ?? 0}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Reflection</p>
                      <InfoIcon onClick={() => setGuidelinesOpen(true)} />
                    </div>

                    {empReflections.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">No reflection submitted.</p>
                    ) : (
                      empReflections.map((ref) => (
                        <p key={ref.id} className="text-sm text-slate-800 bg-white border border-slate-200 rounded-card p-3">
                          {ref.reflection_text}
                        </p>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Voter Motivations</p>

                    {empVotes.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">No motivations submitted.</p>
                    ) : (
                      empVotes.map((v) => (
                        <div key={v.id} className="bg-white border border-slate-200 rounded-card p-3 text-sm">
                          <p className="font-medium text-slate-900">{getEmployeeName(v.voter_id)}</p>
                          <p className="text-slate-700 mt-1">{v.motivation}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">Adjudication Votes</p>

                    {empAdjVotes.length === 0 ? (
                      <p className="text-xs text-slate-600 italic">No adjudication votes yet.</p>
                    ) : (
                      empAdjVotes.map((v) => (
                        <div key={v.id} className="bg-white border border-slate-200 rounded-card p-3 text-sm">
                          <p className="font-medium text-slate-900">{getEmployeeName(v.voter_id)}</p>
                          <p className="text-slate-700 mt-1">{v.motivation}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border border-slate-200 rounded-card p-6 space-y-4">
            <p className="text-sm font-semibold text-slate-900">Cast Adjudication Vote</p>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide">Your Name (Adjudicators Only)</label>
              <select
                value={selectedAdjudicatorId}
                onChange={(e) => setSelectedAdjudicatorId(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crgGold"
              >
                <option value="">Select your name</option>
                {adjudicators.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide">Vote For</label>
              <select
                value={adjudicationChoiceId}
                onChange={(e) => setAdjudicationChoiceId(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crgGold"
              >
                <option value="">Select employee in current pool</option>
                {tiedEmployees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center">
                <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide">Motivation</label>
                <InfoIcon onClick={() => setVotingGuidelinesOpen(true)} />
              </div>

              <textarea
                value={adjudicationMotivation}
                onChange={(e) => setAdjudicationMotivation(e.target.value)}
                rows={4}
                className="w-full border border-slate-300 rounded-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-crgGold"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmitAdjudicationVote}
                disabled={loading}
                className="px-6 py-3 rounded-card font-medium text-white bg-brandnavy hover:bg-slate-800 hover:text-crgGold transition disabled:opacity-50"
              >
                Submit Adjudication Vote
              </button>

              {adjudicationWinner && (
                <button
                  onClick={handleFinaliseWinner}
                  disabled={loading || finalised}
                  className="px-4 py-2 rounded-card font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {finalised ? "Winner Finalised" : "Finalise Winner"}
                </button>
              )}
            </div>

            {message && <p className="text-sm font-medium text-slate-800 mt-3">{message}</p>}
          </div>

          {adjudicationWinner && (
            <div className="p-5 border border-crgGold bg-[#fdf8ea] rounded-card space-y-3">
              <p className="text-sm font-semibold text-slate-900">Adjudication Result</p>
              <p className="text-sm text-slate-800">
                Winner: <span className="font-semibold">{getEmployeeName(adjudicationWinner.employeeId)}</span> ({adjudicationWinner.votes} adjudication votes)
              </p>
            </div>
          )}
        </div>
      )}

      <Modal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} title="Reflection Guidelines">
        <ReflectionGuidelines />
      </Modal>

      <Modal open={votingGuidelinesOpen} onClose={() => setVotingGuidelinesOpen(false)} title="Voting Guidelines">
        <VotingGuidelines />
      </Modal>
    </div>
  );
}