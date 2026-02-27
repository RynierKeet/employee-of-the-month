import { useEffect, useState } from "react";

interface FinalResultRow {
  employee_id: number;
  normal_votes: number;
  adjudication_votes: number;
  total_votes: number;
}

interface Employee {
  id: number;
  name: string;
}

export default function Winner() {
  const [month, setMonth] = useState("2026-02");
  const [results, setResults] = useState<FinalResultRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [committed, setCommitted] = useState(false);

  // Permanent success banner
  const [commitMessage, setCommitMessage] = useState("");

  // Load employees once
  useEffect(() => {
    fetch("http://localhost:3000/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data))
      .catch(() => setError("Failed to load employees"));
  }, []);

  // Load results + committed status
  useEffect(() => {
    setLoading(true);
    setError("");
    setCommitMessage(""); // reset banner when month changes

    // Load final results
    fetch(`http://localhost:3000/results/final?month=${month}`)
      .then((res) => res.json())
      .then((data: FinalResultRow[]) => setResults(data))
      .catch(() => setError("Failed to load final results"))
      .finally(() => setLoading(false));

    // Load commit status
    fetch(`http://localhost:3000/adjudication/winner-status?month_key=${month}`)
      .then((res) => res.json())
      .then((data) => setCommitted(data.committed))
      .catch(() => {});
  }, [month]);

  const getName = (id: number) =>
    employees.find((e) => e.id === id)?.name || `Employee ${id}`;

  const topVotes = results.length > 0 ? results[0].total_votes : 0;
  const tied = results.filter((r) => r.total_votes === topVotes);
  const isDraw = tied.length > 1;

  // Commit winner
  async function commitWinner() {
    if (results.length === 0 || isDraw) return;

    const winnerId = results[0].employee_id;

    const res = await fetch("http://localhost:3000/adjudication/commit-winner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month_key: month,
        winner_id: winnerId,
      }),
    });

    if (res.ok) {
      setCommitted(true);
      setCommitMessage("Winner committed successfully!");
    } else {
      setCommitMessage("Failed to commit winner.");
    }
  }

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", textAlign: "center" }}>
      <h2>Employee of the Month</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>Month</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ padding: "0.5rem" }}
        />
      </div>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Permanent success or failure message */}
      {commitMessage && (
        <div
          style={{
            background: committed ? "#d4edda" : "#f8d7da",
            color: committed ? "#155724" : "#721c24",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            border: committed ? "1px solid #c3e6cb" : "1px solid #f5c6cb",
          }}
        >
          {commitMessage}
        </div>
      )}

      {/* Dashboard warning if not committed */}
      {!committed && results.length > 0 && !isDraw && (
        <div
          style={{
            background: "#fff3cd",
            color: "#856404",
            padding: "1rem",
            borderRadius: "8px",
            marginBottom: "1rem",
            border: "1px solid #ffeeba",
          }}
        >
          Winner not committed. Please commit the winner.
        </div>
      )}

      {/* DRAW */}
      {isDraw && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1.5rem",
            borderRadius: "10px",
            border: "2px solid orange",
            background: "#fff7e6",
          }}
        >
          <h3>Draw — Submitted for Adjudication</h3>
          <p>The following employees are tied:</p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {tied.map((t) => (
              <li key={t.employee_id}>{getName(t.employee_id)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* WINNER */}
      {!isDraw && results.length > 0 && (
        <div
          style={{
            marginTop: "2rem",
            padding: "2rem",
            borderRadius: "10px",
            border: "2px solid green",
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            {getName(results[0].employee_id)}
          </h1>
          <p>
            Normal: {results[0].normal_votes} | Adjudication:{" "}
            {results[0].adjudication_votes} | Total: {results[0].total_votes}
          </p>

          {/* Commit button */}
          <button
            onClick={commitWinner}
            disabled={committed}
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              borderRadius: "6px",
              border: "none",
              cursor: committed ? "default" : "pointer",
              background: committed ? "#28a745" : "#007bff",
              color: "white",
            }}
          >
            {committed ? "Committed" : "Commit Winner to Dashboard"}
          </button>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p>No results available.</p>
      )}
    </div>
  );
}