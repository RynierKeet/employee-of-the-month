import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface ResultRow {
  employee_id: number;
  votes: number;
}

interface Employee {
  id: number;
  name: string;
}

interface ResultsResponse {
  published: boolean;
  month_key: string;
  results: ResultRow[];
  visibleScope: string;
}

export default function Results() {
  const navigate = useNavigate();

  const [month, setMonth] = useState("2026-02");
  const [results, setResults] = useState<ResultRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Load employees
  useEffect(() => {
    fetch("http://localhost:3000/employees")
      .then((res) => res.json())
      .then((data: Employee[]) => setEmployees(data))
      .catch(() => setError("Failed to load employees"));
  }, []);

  // Load results
  const loadResults = () => {
    setLoading(true);
    setError("");

    fetch(`http://localhost:3000/results?month=${month}`)
      .then((res) => res.json())
      .then((data: ResultsResponse | ResultRow[]) => {
        // Handle both old and new backend shapes safely
        const arr = Array.isArray(data)
          ? data
          : Array.isArray((data as ResultsResponse).results)
          ? (data as ResultsResponse).results
          : [];

        setResults(arr);
      })
      .catch(() => setError("Failed to load results"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadResults();
  }, [month]);

  const getName = (id: number) =>
    employees.find((e) => e.id === id)?.name || `Employee ${id}`;

  // Tie detection
  const maxVotes =
    results.length > 0
      ? results.reduce((max, r) => (r.votes > max ? r.votes : max), 0)
      : 0;

  const tied = results.filter((r) => r.votes === maxVotes);
  const isDraw = tied.length > 1;

  // Start adjudication
  const startAdjudication = () => {
    fetch("http://localhost:3000/admin/adjudication/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month_key: month }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          alert(data.error);
        } else {
          navigate("/adjudication-panel");
        }
      })
      .catch(() => alert("Server error while starting adjudication."));
  };

  return (
    <div className="space-y-8">
      {/* Top Card */}
      <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">Results</h2>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium text-slate-800">
              Month
            </label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border border-slate-300 rounded-card px-3 py-2 
                         focus:outline-none focus:ring-2 focus:ring-crgGold"
            />
          </div>

          <button
            onClick={loadResults}
            className="px-6 py-3 rounded-card font-medium text-white 
                       bg-brandnavy hover:bg-slate-800 hover:text-crgGold transition"
          >
            Load
          </button>
        </div>

        {loading && <p className="text-sm text-slate-700">Loading results…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Draw Handling */}
      {isDraw && results.length > 0 && (
        <div className="bg-[#fff7e6] border-2 border-amber-500 rounded-card p-8 space-y-4">
          <h3 className="text-lg font-medium text-slate-900">
            Tie Detected — Adjudication Required
          </h3>

          <p className="text-slate-700">The following employees are tied:</p>

          <ul className="list-disc list-inside space-y-1 text-slate-800">
            {tied.map((t) => (
              <li key={t.employee_id}>{getName(t.employee_id)}</li>
            ))}
          </ul>

          <button
            onClick={startAdjudication}
            className="px-6 py-3 rounded-card font-medium text-white bg-brandnavy
                       hover:bg-slate-800 hover:text-crgGold transition"
          >
            Start Adjudication
          </button>
        </div>
      )}

      {/* Winner */}
      {!isDraw && results.length > 0 && (
        <div className="bg-[#f0fff4] border-2 border-green-500 rounded-card p-8 space-y-3">
          <h3 className="text-lg font-medium text-slate-900">Winner</h3>

          <p className="text-slate-800 font-semibold">
            {getName(results[0].employee_id)}
          </p>

          <p className="text-slate-700">
            Total Votes: {results[0].votes}
          </p>
        </div>
      )}

      {/* Full Results */}
      <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-4">
        <h3 className="text-lg font-medium text-slate-900">Full Results</h3>

        {results.map((r) => (
          <div
            key={r.employee_id}
            className="flex justify-between items-center px-4 py-2 rounded-card 
                       border border-slate-200 bg-slate-50"
          >
            <span className="font-medium text-slate-800">
              {getName(r.employee_id)}
            </span>
            <span className="text-sm text-slate-700">{r.votes} votes</span>
          </div>
        ))}

        {!loading && !error && results.length === 0 && (
          <p className="text-sm text-slate-700">No results for this month.</p>
        )}
      </div>
    </div>
  );
}