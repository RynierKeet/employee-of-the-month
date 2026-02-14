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

export default function FinalResults() {
  const [month, setMonth] = useState("2026-02");
  const [results, setResults] = useState<FinalResultRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("http://localhost:3000/employees")
      .then((res) => res.json())
      .then((data: Employee[]) => setEmployees(data))
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

  const getEmployeeName = (id: number) =>
    employees.find((e) => e.id === id)?.name || `Employee ${id}`;

  // --- DRAW LOGIC ---
  const topVotes = results.length > 0 ? results[0].total_votes : 0;
  const tiedEmployees = results.filter((r) => r.total_votes === topVotes);

  const isDraw = tiedEmployees.length > 1;

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto" }}>
      <h2>Final Results</h2>

      <div style={{ marginBottom: "1rem" }}>
        <label>Month</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{ display: "block", padding: "0.5rem", width: "100%" }}
        />
      </div>

      {loading && <p>Loading final results…</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* DRAW HANDLING */}
      {isDraw && (
        <div
          style={{
            margin: "1rem 0",
            padding: "1rem",
            border: "2px solid orange",
            borderRadius: "6px",
            background: "#fff7e6",
          }}
        >
          <h3>Draw — Submitted for Adjudication</h3>
          <p>The following employees are tied:</p>
          <ul>
            {tiedEmployees.map((t) => (
              <li key={t.employee_id}>{getEmployeeName(t.employee_id)}</li>
            ))}
          </ul>
        </div>
      )}

      {/* WINNER (only if NOT a draw) */}
      {!isDraw && results.length > 0 && (
        <div
          style={{
            margin: "1rem 0",
            padding: "1rem",
            border: "2px solid green",
            borderRadius: "6px",
          }}
        >
          <h3>Winner</h3>
          <p>
            <strong>{getEmployeeName(results[0].employee_id)}</strong>
          </p>
          <p>
            Normal votes: {results[0].normal_votes} | Adjudication votes:{" "}
            {results[0].adjudication_votes} | Total: {results[0].total_votes}
          </p>
        </div>
      )}

      <h3>Full Ranking</h3>
      {results.map((r) => (
        <p key={r.employee_id}>
          {getEmployeeName(r.employee_id)} — Normal: {r.normal_votes}, 
          Adjudication: {r.adjudication_votes}, Total: {r.total_votes}
        </p>
      ))}

      {!loading && !error && results.length === 0 && (
        <p>No final results for this month.</p>
      )}
    </div>
  );
}