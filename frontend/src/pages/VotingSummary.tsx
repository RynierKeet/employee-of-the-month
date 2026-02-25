// src/pages/VotingSummary.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type AggregatedResult = {
  employee_id: number;
  employee_name: string;
  total_votes: number;
};

type MyVotesMap = Record<string, number[]>;

const STORAGE_KEY = "crg_voting_draft_v1";

export default function VotingSummary({ month }: { month?: string }) {
  const navigate = useNavigate();
  const effectiveMonth = month ?? new Date().toISOString().slice(0, 7);

  const [results, setResults] = useState<AggregatedResult[]>([]);
  const [myVotes, setMyVotes] = useState<MyVotesMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) Fetch aggregated final results
      const r = await fetch(`/votes?month=${effectiveMonth}`, {
        credentials: "include",
      });
      const resJson = await r.json().catch(() => null);
      const fetchedResults: AggregatedResult[] = Array.isArray(resJson)
        ? resJson
        : [];
      setResults(fetchedResults);

      // 2) Fetch my saved votes from backend
      const mv = await fetch(`/votes/my?month=${effectiveMonth}`, {
        credentials: "include",
      });
      const mvJson = await mv.json().catch(() => null);

      let backendVotes: MyVotesMap = {};
      if (mvJson?.votes && typeof mvJson.votes === "object") {
        backendVotes = mvJson.votes as MyVotesMap;
      }

      // 3) Load draft votes from localStorage and merge
      const draftRaw = localStorage.getItem(STORAGE_KEY);
      if (draftRaw) {
        const parsed = JSON.parse(draftRaw);
        if (parsed?.month === effectiveMonth && parsed?.votes) {
          const draftVotes = parsed.votes as MyVotesMap;
          setMyVotes({
            ...backendVotes,
            ...draftVotes,
          });
        } else {
          setMyVotes(backendVotes);
        }
      } else {
        setMyVotes(backendVotes);
      }
    } catch (err) {
      console.error("Error loading voting summary:", err);
      setError("Failed to load voting summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [effectiveMonth]);

  const hasVotedFor = (employeeId: number): boolean => {
    for (const key of Object.keys(myVotes)) {
      if (myVotes[key]?.includes(employeeId)) return true;
    }
    return false;
  };

  if (loading) {
    return <div className="p-4">Loading voting summary…</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Voting Summary</h1>

      <p className="mb-4">
        Month: <strong>{effectiveMonth}</strong>
      </p>

      {results.length === 0 && (
        <p className="text-gray-600">No votes recorded for this month yet.</p>
      )}

      {results.length > 0 && (
        <table className="min-w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left border-b">Nominee</th>
              <th className="px-3 py-2 text-left border-b">Total votes</th>
              <th className="px-3 py-2 text-left border-b">My vote</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => {
              const mine = hasVotedFor(row.employee_id);
              return (
                <tr
                  key={row.employee_id}
                  className={mine ? "bg-green-50" : "bg-white"}
                >
                  <td className="px-3 py-2 border-b">
                    {row.employee_name}
                  </td>
                  <td className="px-3 py-2 border-b">
                    {row.total_votes}
                  </td>
                  <td className="px-3 py-2 border-b">
                    {mine ? (
                      <span className="text-green-700 font-semibold">
                        Yes
                      </span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <button
        onClick={() => navigate("/voting")}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Back to Voting
      </button>
    </div>
  );
}