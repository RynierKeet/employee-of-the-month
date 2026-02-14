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

  useEffect(() => {
    fetch("http://localhost:3000/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data))
      .catch(() => setError("Failed to load employees"));
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");

    fetch(`http://localhost:3000/results/final?month=${month}`)
      .then((res) => res.json())
      .then((data: FinalResultRow[]) => setResults(data))
      .catch(() => setError("Failed to load final results"))
      .finally(() => setLoading(false));
  }, [month]);

  const getName = (id: number) =>
    employees.find((e) => e.id === id)?.name || `Employee ${id}`;

  const topVotes = results.length > 0 ? results[0].total_votes : 0;
  const tied = results.filter((r) => r.total_votes === topVotes);
  const isDraw = tied.length > 1;

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
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <p>No results available.</p>
      )}
    </div>
  );
}