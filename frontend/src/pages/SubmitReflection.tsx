// src/pages/SubmitReflections.tsx
import React, { useEffect, useRef, useState } from "react";
import { InfoIcon } from "../components/InfoIcon";
import { Modal } from "../components/Modal";
import { ReflectionGuidelines } from "../components/ReflectionGuidelines";

interface Employee {
  id: number;
  name: string;
}

interface Reflection {
  id: number;
  employee_id: number;
  month_key: string;
  reflection_text: string;
  created_at?: string;
}

export default function SubmitReflections() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeId, setEmployeeId] = useState<number | "">("");
  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [reflectionText, setReflectionText] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "warning" | "info">("info");

  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  const EXCLUDED_IDS = [7, 10];

  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [existingReflection, setExistingReflection] = useState<Reflection | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  const checkTimer = useRef<number | null>(null);
  const mountedRef = useRef(true);

  // Safe JSON fetch helper
  async function safeFetchJson(url: string, opts: RequestInit = {}) {
    try {
      const res = await fetch(url, { credentials: "include", ...opts });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const text = await res.text().catch(() => "");

      if (!ct.includes("application/json")) {
        console.warn("safeFetchJson: expected JSON but got", ct, "for", url);
        if (import.meta.env.DEV) {
          console.debug("safeFetchJson response preview:", text.slice(0, 1000));
        }
        return null;
      }

      try {
        return JSON.parse(text);
      } catch (err) {
        console.error("safeFetchJson: JSON parse error for", url, err);
        return null;
      }
    } catch (err) {
      console.error("safeFetchJson network error for", url, err);
      return null;
    }
  }

  // Load employees
  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      const data = await safeFetchJson(`/employees`);
      if (!mountedRef.current) return;

      const list = Array.isArray(data)
        ? data
        : data && Array.isArray((data as any).employees)
        ? (data as any).employees
        : [];

      if (list.length === 0) {
        setMessage("No employees returned from server.");
        setMessageType("error");
      } else {
        setMessage("");
      }

      setEmployees(list);
    })();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Check existing reflection (debounced)
  useEffect(() => {
    setAlreadySubmitted(false);
    setExistingReflection(null);
    setMessage("");
    setMessageType("info");

    if (!employeeId || !month) return;

    if (checkTimer.current) {
      window.clearTimeout(checkTimer.current);
      checkTimer.current = null;
    }

    checkTimer.current = window.setTimeout(async () => {
      setCheckingExisting(true);
      const url = `/reflections?employee_id=${employeeId}&month=${encodeURIComponent(month)}`;
      const data = await safeFetchJson(url);
      setCheckingExisting(false);

      if (!data) {
        console.warn("Unexpected response when checking existing reflection:", data);
        setAlreadySubmitted(false);
        setExistingReflection(null);
        return;
      }

      if (Array.isArray(data) && data.length > 0) {
        setAlreadySubmitted(true);
        setExistingReflection(data[0] as Reflection);
        setMessage("You have already submitted a reflection for this month.");
        setMessageType("warning");
        return;
      }

      if (data && Array.isArray((data as any).reflections) && (data as any).reflections.length > 0) {
        setAlreadySubmitted(true);
        setExistingReflection((data as any).reflections[0] as Reflection);
        setMessage("You have already submitted a reflection for this month.");
        setMessageType("warning");
        return;
      }

      if (data && (data as any).submitted && (data as any).existing) {
        setAlreadySubmitted(Boolean((data as any).submitted));
        setExistingReflection((data as any).existing as Reflection);
        if ((data as any).submitted) {
          setMessage("You have already submitted a reflection for this month.");
          setMessageType("warning");
        }
        return;
      }

      setAlreadySubmitted(false);
      setExistingReflection(null);
    }, 300);

    return () => {
      if (checkTimer.current) {
        window.clearTimeout(checkTimer.current);
        checkTimer.current = null;
      }
    };
  }, [employeeId, month]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setMessageType("info");

    if (!employeeId) {
      setMessage("Please select your name.");
      setMessageType("warning");
      return;
    }

    if (!month) {
      setMessage("Please select a month.");
      setMessageType("warning");
      return;
    }

    if (!reflectionText.trim()) {
      setMessage("Reflection cannot be empty.");
      setMessageType("warning");
      return;
    }

    if (EXCLUDED_IDS.includes(Number(employeeId))) {
      setMessage("Adjudicators are not allowed to submit reflections.");
      setMessageType("error");
      return;
    }

    if (alreadySubmitted) {
      setMessage("You have already submitted a reflection for this month.");
      setMessageType("warning");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/reflections`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          employee_id: employeeId,
          month_key: month,
          reflection_text: reflectionText.trim(),
        }),
      });

      if (res.status === 409) {
        const err = await res.json().catch(() => null);
        setMessage(err?.error || "You have already submitted a reflection for this month.");
        setMessageType("warning");
        if (err?.existing) {
          setExistingReflection(err.existing as Reflection);
          setAlreadySubmitted(true);
        }
        return;
      }

      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const data = ct.includes("application/json") ? await res.json().catch(() => null) : null;

      if (res.ok && data) {
        const created = data.id ? data : (data as any).reflection ?? data;
        setMessage("Reflection submitted successfully.");
        setMessageType("success");
        setReflectionText("");
        setAlreadySubmitted(true);
        if (created && created.id) {
          setExistingReflection(created as Reflection);
        }
      } else {
        setMessage((data && (data.error || data.message)) || "Failed to submit reflection.");
        setMessageType("error");
      }
    } catch (err) {
      console.error("submitReflection error:", err);
      setMessage("Server error while submitting reflection.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const allowedReflectionSubmitters = employees.filter(
    (emp) => !EXCLUDED_IDS.includes(emp.id)
  );

  const messageColor =
    messageType === "error"
      ? "text-red-500"
      : messageType === "success"
      ? "text-green-600"
      : messageType === "warning"
      ? "text-amber-600"
      : "text-slate-700";

  return (
    <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-900">Submit Reflection</h2>

      {loading && <p className="text-sm text-slate-700">Loading…</p>}

      {message && <p className={`text-sm font-medium ${messageColor}`}>{message}</p>}

      <form onSubmit={handleSubmit} className="space-y-6" aria-live="polite">
        {/* Name */}
        <div className="space-y-2">
          <label htmlFor="employee" className="block text-sm font-medium text-slate-800">
            Your Name
          </label>
          <select
            id="employee"
            value={employeeId}
            onChange={(e) => setEmployeeId(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crgGold"
            required
            aria-required
          >
            <option value="">Select your name</option>
            {allowedReflectionSubmitters.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>

        {/* Month */}
        <div className="space-y-2">
          <label htmlFor="month" className="block text-sm font-medium text-slate-800">
            Month
          </label>
          <input
            id="month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-full border border-slate-300 rounded-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crgGold"
            required
          />
        </div>

        {/* Existing submission preview */}
        {checkingExisting ? (
          <div className="text-sm text-slate-600">Checking existing submission…</div>
        ) : alreadySubmitted && existingReflection ? (
          <div className="p-4 border border-amber-300 rounded-card bg-[#fff8e6]">
            <p className="text-sm font-semibold text-slate-900">Existing submission</p>
            <p className="text-sm text-slate-700 mt-2">{existingReflection.reflection_text}</p>
            {existingReflection.created_at && (
              <p className="text-xs text-slate-500 mt-1">
                Submitted: {existingReflection.created_at}
              </p>
            )}
          </div>
        ) : null}

        {/* Reflection */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label htmlFor="reflection" className="block text-sm font-medium text-slate-800">
              Reflection
            </label>
            <InfoIcon onClick={() => setGuidelinesOpen(true)} title="Reflection Guidelines" />
          </div>

          <textarea
            id="reflection"
            value={reflectionText}
            onChange={(e) => setReflectionText(e.target.value)}
            rows={6}
            className="w-full border border-slate-300 rounded-card px-3 py-2 focus:outline-none focus:ring-2 focus:ring-crgGold"
            required
            disabled={alreadySubmitted}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || alreadySubmitted}
          className="px-6 py-3 rounded-card font-medium text-white bg-brandnavy hover:bg-slate-800 hover:text-crgGold transition disabled:opacity-50"
        >
          {alreadySubmitted ? "Already Submitted" : "Submit Reflection"}
        </button>
      </form>

      {/* Guidelines Modal */}
      <Modal open={guidelinesOpen} onClose={() => setGuidelinesOpen(false)} title="Reflection Guidelines">
        <ReflectionGuidelines />
      </Modal>
    </div>
  );
}