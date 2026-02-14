import { useEffect, useState } from "react";

interface Employee {
  id: number;
  name: string;
  email?: string;
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

export default function ViewReflections() {
  const [month, setMonth] = useState("2026-02");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Robust fetch helper that tolerates empty responses and non-JSON
  async function fetchJsonOrEmpty<T = any>(url: string): Promise<T | T[] | null> {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-cache" });

      if (res.status === 204) return [];
      const text = await res.text();
      if (!text) return [];

      try {
        return JSON.parse(text) as T | T[];
      } catch (err) {
        console.warn("Response not valid JSON for", url, "body:", text);
        return [];
      }
    } catch (err) {
      console.error("Network/fetch error for", url, err);
      return null;
    }
  }

  // Normalize API payloads into arrays
  function normalizeArray<T = any>(payload: any): T[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload as T[];
    if (Array.isArray(payload?.rows)) return payload.rows as T[];
    if (Array.isArray(payload?.data)) return payload.data as T[];
    if (typeof payload === "object") return [payload as T];
    return [];
  }

  // Load employees once
  useEffect(() => {
    let mounted = true;

    (async () => {
      const data = await fetchJsonOrEmpty<Employee[]>(`${API_BASE}/employees`);
      if (!mounted) return;

      if (data === null) {
        setError("Failed to load employees (network error)");
        setEmployees([]);
        return;
      }

      const list = normalizeArray<Employee>(data);
      setEmployees(list);
      // Do not treat empty employees as a fatal error; just log
      if (list.length === 0) {
        console.info("Employees list empty");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loadReflections = async () => {
    setLoading(true);
    setError("");

    const data = await fetchJsonOrEmpty<Reflection[]>(
      `${API_BASE}/reflections?month=${encodeURIComponent(month)}`
    );

    if (data === null) {
      setError("Failed to load reflections (network error)");
      setReflections([]);
      setLoading(false);
      return;
    }

    const list = normalizeArray<Reflection>(data);
    setReflections(list);

    // Only show a user-facing message when there truly are no reflections
    if (list.length === 0) {
      setError("No reflections found for this month.");
    }

    setLoading(false);
  };

  useEffect(() => {
    loadReflections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  return (
    <div className="space-y-8">
      {/* Top Card */}
      <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">Monthly Reflections</h2>

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

          <button
            onClick={loadReflections}
            className="px-6 py-3 rounded-card font-medium text-white bg-brandnavy hover:bg-slate-800 hover:text-crgGold transition"
            disabled={loading}
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>

        {loading && <p className="text-sm text-slate-700">Loading reflections…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Reflection Cards */}
      <div className="space-y-6">
        {Array.isArray(reflections) && reflections.length > 0 ? (
          reflections.map((r) => {
            const emp = employees.find((e) => e.id === r.employee_id);

            return (
              <div
                key={r.id}
                className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-4"
              >
                <p className="text-lg font-semibold text-crgGold">
                  {emp?.name || "Unknown Employee"}
                </p>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-800">Reflection</p>
                  <p className="text-slate-700">{r.reflection_text}</p>
                </div>

                <p className="text-xs text-slate-500">
                  {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                </p>
              </div>
            );
          })
        ) : (
          !loading &&
          !error && <p className="text-sm text-slate-700">No reflections found.</p>
        )}
      </div>
    </div>
  );
}