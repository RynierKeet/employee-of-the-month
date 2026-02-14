import { useEffect, useState } from "react";

interface Employee {
  id: number;
  name: string;
  role?: string;
}

interface Reflection {
  id: number;
  employee_id: number;
  month_key: string;
  reflection_text: string;
  created_at: string;
}

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || "http://localhost:3000";

export default function ReflectionsVote() {
  const [month, setMonth] = useState("2026-02");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [motivations, setMotivations] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load employees
  useEffect(() => {
    fetch(`${API_BASE}/employees`)
      .then((res) => res.json())
      .then((data) => setEmployees(Array.isArray(data) ? data : []));
  }, []);

  // Load reflections when month changes
  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/reflections?month=${encodeURIComponent(month)}`)
      .then((res) => res.json())
      .then((data) => {
        setReflections(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [month]);

  // Handle selection
  const toggleSelect = (id: number) => {
    setError("");

    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id));
      return;
    }

    if (selected.length === 2) {
      setError("You may only select two reflections.");
      return;
    }

    setSelected([...selected, id]);
  };

  // Submit votes (two separate POSTs)
  const submitVotes = async () => {
    if (selected.length !== 2) {
      setError("Please select exactly two reflections.");
      return;
    }

    if (!motivations[selected[0]] || !motivations[selected[1]]) {
      setError("Please provide motivations for both selections.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      for (const id of selected) {
        await fetch(`${API_BASE}/votes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reflection_id: id,
            motivation: motivations[id],
          }),
        });
      }

      alert("Your votes have been submitted successfully.");
      setSelected([]);
      setMotivations({});
    } catch (err) {
      setError("Failed to submit votes. Please try again.");
    }

    setSubmitting(false);
  };

  return (
    <div className="space-y-8">
      {/* Month Selector */}
      <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">Reflections & Voting</h2>

        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium text-slate-800">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border border-slate-300 rounded-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crgGold"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Reflections List */}
      <div className="space-y-6">
        {loading ? (
          <p className="text-sm text-slate-700">Loading reflections…</p>
        ) : reflections.length === 0 ? (
          <p className="text-sm text-slate-700">No reflections found.</p>
        ) : (
          reflections.map((r) => {
            const emp = employees.find((e) => e.id === r.employee_id);
            const isSelected = selected.includes(r.id);

            return (
              <div
                key={r.id}
                className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-4 transition-all"
              >
                <div className="flex justify-between items-start">
                  <p className="text-lg font-semibold text-crgGold">
                    {emp?.name || "Unknown Employee"}
                  </p>

                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(r.id)}
                    className="h-5 w-5 text-crgGold"
                  />
                </div>

                <p className="text-slate-700">{r.reflection_text}</p>

                <p className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleString()}
                </p>

                {/* Motivation box */}
                {isSelected && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-800 mb-1">
                      Motivation
                    </label>
                    <textarea
                      value={motivations[r.id] || ""}
                      onChange={(e) =>
                        setMotivations({ ...motivations, [r.id]: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-card px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-crgGold"
                    />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Submit Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 shadow-lg py-4 px-6 flex justify-between items-center z-50">
        <div className="text-sm text-slate-700">
          2 selections required • {selected.length} selected
        </div>

        <button
          onClick={submitVotes}
          disabled={
            submitting ||
            selected.length !== 2 ||
            !motivations[selected[0]] ||
            !motivations[selected[1]]
          }
          className={`px-6 py-3 rounded-card font-medium text-white transition
            ${
              selected.length === 2 &&
              motivations[selected[0]] &&
              motivations[selected[1]]
                ? "bg-crgGold hover:bg-crgBlue"
                : "bg-slate-400 cursor-not-allowed"
            }
          `}
        >
          {submitting ? "Submitting…" : "Submit Vote"}
        </button>
      </div>
    </div>
  );
}