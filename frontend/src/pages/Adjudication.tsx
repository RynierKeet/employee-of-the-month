import { useEffect, useMemo, useState } from "react";

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
  created_at: string;
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
  adjudicator_id: number;
  vote_for_id: number;
  month_key: string;
  motivation: string;
  created_at: string;
}

export default function Adjudication() {
  const [month, setMonth] = useState("2026-02");

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [adjudicationVotes, setAdjudicationVotes] = useState<AdjudicationVote[]>([]);

  useEffect(() => {
    fetch("http://localhost:3000/employees")
      .then((res) => res.json())
      .then((data: Employee[]) => setEmployees(data));

    fetch(`http://localhost:3000/results?month=${month}`)
      .then((res) => res.json())
      .then((data: ResultRow[]) => setResults(data));

    fetch(`http://localhost:3000/reflections?month=${month}`)
      .then((res) => res.json())
      .then((data: Reflection[]) => setReflections(data));

    fetch(`http://localhost:3000/votes?month=${month}`)
      .then((res) => res.json())
      .then((data: Vote[]) => setVotes(data));

    fetch(`http://localhost:3000/adjudication/votes?month=${month}`)
      .then((res) => res.json())
      .then((data: AdjudicationVote[]) => setAdjudicationVotes(data));
  }, [month]);

  const getEmployeeName = (id: number) =>
    employees.find((e) => e.id === id)?.name || `Employee ${id}`;

  const maxVotes =
    results.length > 0
      ? results.reduce((max, r) => (r.votes > max ? r.votes : max), 0)
      : 0;

  const tiedRows = results.filter((r) => r.votes === maxVotes && maxVotes > 0);
  const tiedEmployeeIds = tiedRows.map((t) => t.employee_id);
  const tiedEmployees = employees.filter((e) => tiedEmployeeIds.includes(e.id));

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
    adjudicationVotes.forEach((v) => {
      if (!map[v.vote_for_id]) map[v.vote_for_id] = [];
      map[v.vote_for_id].push(v);
    });
    return map;
  }, [adjudicationVotes]);

  const adjudicationWinner = useMemo(() => {
    if (adjudicationVotes.length === 0) return null;
    const counts: Record<number, number> = {};
    adjudicationVotes.forEach((v) => {
      counts[v.vote_for_id] = (counts[v.vote_for_id] || 0) + 1;
    });
    let bestId: number | null = null;
    let bestCount = 0;
    Object.entries(counts).forEach(([idStr, count]) => {
      const id = Number(idStr);
      if (count > bestCount) {
        bestCount = count;
        bestId = id;
      }
    });
    if (!bestId) return null;
    return {
      employeeId: bestId,
      votes: bestCount,
    };
  }, [adjudicationVotes]);

  return (
    <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-900">Adjudication Summary</h2>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700 uppercase tracking-wide">
          Month
        </label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-slate-300 rounded-card px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-crgGold"
        />
      </div>

      <div className="p-4 border border-slate-200 rounded-card bg-slate-50 space-y-2">
        <p className="text-sm font-semibold text-slate-900">Tied Employees</p>
        {tiedEmployees.length === 0 ? (
          <p className="text-sm text-slate-700">No tie detected for this month.</p>
        ) : (
          tiedEmployees.map((e) => (
            <p key={e.id} className="text-sm text-slate-800">
              {e.name}
            </p>
          ))
        )}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-900">Reflections</h3>

        {reflections.length === 0 && (
          <p className="text-sm text-slate-700">No reflections submitted.</p>
        )}

        {reflections.map((r) => (
          <div
            key={r.id}
            className="border border-slate-200 rounded-card p-4 bg-white space-y-2"
          >
            <p className="font-semibold text-slate-900">
              {getEmployeeName(r.employee_id)}
            </p>
            <p className="text-sm text-slate-700">{r.reflection_text}</p>
            <p className="text-xs text-slate-500">
              {new Date(r.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-900">Voter Motivations</h3>

        {tiedEmployees.map((emp) => {
          const empVotes = votesByEmployee[emp.id] || [];
          return (
            <div key={emp.id} className="space-y-2">
              <p className="font-semibold text-slate-900">{emp.name}</p>

              {empVotes.length === 0 ? (
                <p className="text-sm text-slate-700 italic">
                  No motivations submitted.
                </p>
              ) : (
                empVotes.map((v) => (
                  <div
                    key={v.id}
                    className="border border-slate-200 rounded-card p-3 bg-white"
                  >
                    <p className="font-medium text-slate-900">
                      {getEmployeeName(v.voter_id)}
                    </p>
                    <p className="text-sm text-slate-700 mt-1">{v.motivation}</p>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-slate-900">Adjudication Votes</h3>

        {tiedEmployees.map((emp) => {
          const empAdjVotes = adjudicationVotesByEmployee[emp.id] || [];
          return (
            <div key={emp.id} className="space-y-2">
              <p className="font-semibold text-slate-900">{emp.name}</p>

              {empAdjVotes.length === 0 ? (
                <p className="text-sm text-slate-700 italic">
                  No adjudication votes submitted.
                </p>
              ) : (
                empAdjVotes.map((v) => (
                  <div
                    key={v.id}
                    className="border border-slate-200 rounded-card p-3 bg-white"
                  >
                    <p className="font-medium text-slate-900">
                      {getEmployeeName(v.adjudicator_id)}
                    </p>
                    <p className="text-sm text-slate-700 mt-1">{v.motivation}</p>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {adjudicationWinner && (
        <div className="p-5 border border-crgGold bg-[#fdf8ea] rounded-card space-y-2">
          <p className="text-sm font-semibold text-slate-900">
            Final Adjudication Result
          </p>
          <p className="text-sm text-slate-800">
            Winner:{" "}
            <span className="font-semibold">
              {getEmployeeName(adjudicationWinner.employeeId)}
            </span>{" "}
            ({adjudicationWinner.votes} adjudication votes)
          </p>
        </div>
      )}
    </div>
  );
}