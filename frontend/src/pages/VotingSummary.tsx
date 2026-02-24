// src/pages/VotingSummary.tsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

type Nominee = {
  nominee_id: number;
  nominee_name: string;
  answer?: string;
  vote_count?: number;
};

type QuestionResult = {
  question_key: string;
  question_label: string;
  nominees: Nominee[];
};

const STORAGE_KEY = "crg_voting_draft_v1";

export default function VotingSummary({ month }: { month?: string }) {
  const navigate = useNavigate();
  const effectiveMonth = month ?? new Date().toISOString().slice(0, 7);

  const [results, setResults] = useState<QuestionResult[]>([]);
  const [myVotes, setMyVotes] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) Fetch aggregated results
      const r = await fetch(`/voting/results?month=${effectiveMonth}`, {
        credentials: "include",
      });
      const resJson = await r.json().catch(() => null);
      const fetchedResults: QuestionResult[] = resJson?.results ?? resJson ?? [];
      setResults(fetchedResults);

      // 2) Try to fetch authoritative per-question votes
      const mv = await fetch(`/voting/myvotes?month=${effectiveMonth}`, {
        credentials: "include",
      });

      let votes: Record<string, number[]> = {};

      if (mv.ok) {
        const json = await mv.json().catch(() => null);

        // Expected shape: { achievements: [2,3], impact: [1,4], ... }
        if (json && typeof json === "object" && !Array.isArray(json)) {
          votes = json;
        }
      }

      // 3) Fallback to localStorage draft if server returns nothing
      if (Object.keys(votes).length === 0) {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.month === effectiveMonth && parsed?.votes) {
              votes = parsed.votes;
            }
          } catch {}
        }
      }

      setMyVotes(votes);
    } catch (e: any) {
      console.error("VotingSummary load error:", e);
      setError("Failed to load voting summary.");
    } finally {
      setLoading(false);
    }
  }, [effectiveMonth]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <div className="p-6 text-center text-slate-700">Loading summary…</div>;
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded">
          <strong>Error:</strong> {error}
        </div>
        <button
          onClick={() => load()}
          className="mt-4 px-4 py-2 bg-brandnavy text-white rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Review Your Votes</h2>
          <p className="text-sm text-slate-600 mt-1">
            Month: <strong>{effectiveMonth}</strong>
          </p>
        </div>

        <button
          onClick={() => load()}
          className="px-3 py-2 bg-slate-100 rounded text-sm"
        >
          Refresh
        </button>
      </header>

      {results.map((q) => {
        const selectedIds = myVotes[q.question_key] ?? [];

        return (
          <section key={q.question_key} className="p-4 border rounded bg-white">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">{q.question_label}</h3>
              <button
                onClick={() => navigate("/app/vote")}
                className="text-sm text-slate-600"
              >
                Edit
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {q.nominees.map((n) => {
                const id = n.nominee_id;
                const isMine = selectedIds.includes(id);

                return (
                  <div
                    key={id}
                    className={`p-3 rounded border flex justify-between ${
                      isMine
                        ? "bg-green-50 border-green-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="font-semibold">{n.nominee_name}</div>
                      {n.answer && (
                        <div className="text-sm text-slate-600 mt-1">{n.answer}</div>
                      )}
                    </div>

                    <div className="text-right">
                      {isMine && (
                        <div className="text-xs text-green-700 font-medium">
                          Your vote
                        </div>
                      )}
                      <div className="text-xs text-slate-500">
                        {n.vote_count ?? "-"} votes
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex justify-end">
        <button
          onClick={() => navigate("/app/vote/finalize")}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Final Submit
        </button>
      </div>
    </div>
  );
}