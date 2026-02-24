import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../auth";
import { InfoIcon } from "../components/InfoIcon";
import { Modal } from "../components/Modal";
import { useStep } from "../context/StepContext";
import { useNavigate, Link } from "react-router-dom";

interface Reflection {
  id: number;
  employee_id: number;
  month_key: string;
  achievements_text: string;
  impact_text: string;
  values_text: string;
  growth_text: string;
  beyond_text: string;
  nomination_text: string;
  is_final: number;
  created_at?: string;
}

export default function SubmitReflections() {
  const { me } = useAuth();
  const employeeId = me?.id;

  // ⭐ Activate Step 1
  const { setCurrentStep } = useStep();
  useEffect(() => {
    setCurrentStep(1);
  }, [setCurrentStep]);

  // ⭐ Navigation for redirect
  const navigate = useNavigate();

  const [month, setMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const [reflection, setReflection] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  // ⭐ New UI state for save feedback
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"success" | "error" | "warning" | "info">("info");

  const autoSaveTimer = useRef<number | null>(null);
  const lastSavedContent = useRef<string>("");

  const [guidelineFor, setGuidelineFor] = useState<string | null>(null);

  const fieldGuidance: Record<string, string> = {
    achievements_text:
      "What you accomplished, goals completed, and challenges you overcame.",
    impact_text:
      "How your work helped others, improved processes, or created visible value.",
    values_text:
      "How you demonstrated professionalism, teamwork, leadership, initiative, and CRGSA values.",
    growth_text:
      "Skills you developed, responsibilities you took on, and what you learned.",
    beyond_text:
      "Contributions outside your normal duties and moments of exceptional dedication or care.",
    nomination_text:
      "Summarise your case clearly, focusing on impact rather than self-promotion.",
  };

  const ranges = {
    achievements_text: [80, 150],
    impact_text: [60, 120],
    values_text: [50, 100],
    growth_text: [50, 100],
    beyond_text: [40, 80],
    nomination_text: [60, 120],
  };

  function countWords(text: string) {
    return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
  }

  function rangeStatus(field: keyof typeof ranges, text: string) {
    const [min, max] = ranges[field];
    const words = countWords(text);

    if (words === 0) return "text-slate-500";
    if (words >= min && words <= max) return "text-green-600";
    if (words < min) return "text-amber-600";
    return "text-red-600";
  }

  const loadReflection = useCallback(async () => {
    if (!employeeId || !month) return;

    setLoading(true);
    setMessage("");
    setMessageType("info");

    try {
      const res = await fetch(`/reflections?employee_id=${employeeId}&month=${month}`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch reflection");
      }
      const data = await res.json().catch(() => null);
      setReflection(data);
      lastSavedContent.current = JSON.stringify(data);
    } catch {
      setMessage("Failed to load reflection.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => {
    loadReflection();
  }, [loadReflection]);

  // ⭐ Auto‑redirect to Step 2 if reflection is final
  useEffect(() => {
    if (reflection && reflection.is_final === 1) {
      navigate("/app/vote", { replace: true });
    }
  }, [reflection, navigate]);

  // Auto-save interval (only when editable)
  useEffect(() => {
    if (!reflection || reflection.is_final === 1) return;

    // Clear any existing timer first
    if (autoSaveTimer.current) {
      clearInterval(autoSaveTimer.current);
      autoSaveTimer.current = null;
    }

    autoSaveTimer.current = window.setInterval(() => {
      const current = JSON.stringify(reflection);
      if (current !== lastSavedContent.current) {
        saveDraft();
      }
    }, 8000);

    return () => {
      if (autoSaveTimer.current) {
        clearInterval(autoSaveTimer.current);
        autoSaveTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reflection]);

  // Auto-clear saved state and toast
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 3000);
    return () => clearTimeout(t);
  }, [saved]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function saveDraft() {
    if (!reflection || reflection.is_final === 1) return;

    setSaving(true);
    setMessage("");
    setMessageType("info");

    try {
      const res = await fetch(`/reflections/${reflection.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reflection),
      });

      // parse response if present
      const text = await res.text().catch(() => "");
      let body: any = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }

      if (res.ok) {
        lastSavedContent.current = JSON.stringify(reflection);
        setMessage("Draft saved.");
        setMessageType("success");
        setSaved(true);
        setToast("Draft saved.");
      } else {
        const errMsg = (body && body.error) || "Failed to save draft.";
        setMessage(errMsg);
        setMessageType("error");
        setToast(errMsg);
      }
    } catch {
      setMessage("Network error while saving draft.");
      setMessageType("error");
      setToast("Network error while saving draft.");
    } finally {
      setSaving(false);
    }
  }

  async function finalize() {
    if (!reflection) return;

    setFinalizing(true);
    setMessage("");
    setMessageType("info");

    try {
      const res = await fetch(`/reflections/${reflection.id}/finalize`, {
        method: "POST",
        credentials: "include",
      });

      if (res.ok) {
        setReflection({ ...reflection, is_final: 1 });
        setMessage("Reflection submitted successfully.");
        setMessageType("success");
        // redirect to voting after a short delay so user sees confirmation
        setTimeout(() => navigate("/app/vote", { replace: true }), 700);
      } else {
        const err = await res.json().catch(() => null);
        setMessage(err?.error || "Failed to finalize reflection.");
        setMessageType("error");
      }
    } catch {
      setMessage("Network error while finalizing.");
      setMessageType("error");
    } finally {
      setFinalizing(false);
    }
  }

  function updateField(field: keyof Reflection, value: string) {
    if (!reflection || reflection.is_final === 1) return;
    setReflection({ ...reflection, [field]: value });
  }

  const messageColor =
    messageType === "error"
      ? "text-red-500"
      : messageType === "success"
      ? "text-green-600"
      : messageType === "warning"
      ? "text-amber-600"
      : "text-slate-700";

  if (loading || !reflection) {
    return <div className="p-8 text-center text-slate-700">Loading reflection…</div>;
  }

  const isFinal = reflection.is_final === 1;

  return (
    <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-900">Monthly Reflection</h2>

      {/* ⭐ NEW: Resume Voting Banner */}
      {isFinal && (
        <div className="p-4 bg-blue-50 border border-blue-300 rounded-card text-blue-800 flex items-center justify-between">
          <div>
            <strong>Your reflection is submitted.</strong> You can continue with your voting for this month.
          </div>
          <Link to="/app/vote" className="px-4 py-2 bg-blue-600 text-white rounded-card hover:bg-blue-700 transition">
            Resume Voting
          </Link>
        </div>
      )}

      {message && <p className={`text-sm font-medium ${messageColor}`}>{message}</p>}

      {isFinal && (
        <div className="p-4 bg-green-50 border border-green-300 rounded-card text-green-800">
          This reflection has been submitted and can no longer be edited.
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-800">Month</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          disabled={isFinal}
          className="w-full border border-slate-300 rounded-card px-3 py-2"
        />
      </div>

      {(
        [
          ["achievements_text", "Key achievements for the month"],
          ["impact_text", "Impact on the team or organisation"],
          ["values_text", "Behaviour and values"],
          ["growth_text", "Growth and learning"],
          ["beyond_text", "Going above and beyond"],
          ["nomination_text", "Why you should be considered for Employee of the Month"],
        ] as const
      ).map(([field, label]) => (
        <div key={field} className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="block text-sm font-medium text-slate-800">{label}</label>
            <InfoIcon onClick={() => setGuidelineFor(field)} title="Guidance" />
          </div>

          <textarea
            value={reflection[field]}
            onChange={(e) => updateField(field, e.target.value)}
            disabled={isFinal}
            rows={5}
            className="w-full border border-slate-300 rounded-card px-3 py-2"
          />

          <div className={`text-xs ${rangeStatus(field as keyof typeof ranges, reflection[field])}`}>
            Recommended: {ranges[field as keyof typeof ranges][0]}–{ranges[field as keyof typeof ranges][1]} words • Current: {countWords(reflection[field])}
          </div>
        </div>
      ))}

      {!isFinal && (
        <div className="flex gap-4 items-center">
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className={`px-6 py-3 rounded-card font-semibold transition inline-flex items-center gap-2
              ${saved ? "bg-green-600 text-white" : "bg-slate-200 text-slate-900"}
              ${saving ? "opacity-70 cursor-not-allowed" : "hover:brightness-95"}`}
            aria-pressed={saved}
          >
            {saving ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : null}
            {saving ? "Saving…" : saved ? "Saved" : "Save Draft"}
          </button>

          <button type="button" onClick={finalize} disabled={finalizing} className="px-6 py-3 rounded-card bg-brandnavy text-white hover:bg-slate-800">
            {finalizing ? "Submitting…" : "Final Submit"}
          </button>

          {/* Inline message and accessible live region */}
          <div className="ml-4">
            {message && <div className={`${messageType === "success" ? "text-green-700" : "text-red-600"} text-sm`}>{message}</div>}
            <div aria-live="polite" className="sr-only">{message || ""}</div>
          </div>
        </div>
      )}

      <Modal open={guidelineFor !== null} onClose={() => setGuidelineFor(null)} title="Guidance">
        <p className="text-slate-700 text-sm leading-relaxed">{guidelineFor ? fieldGuidance[guidelineFor] : ""}</p>
      </Modal>

      {/* Transient toast (top-right) */}
      {toast && (
        <div role="status" aria-live="polite" className="fixed top-6 right-6 z-50 bg-white border rounded shadow px-4 py-2 text-sm text-slate-800">
          {toast}
        </div>
      )}
    </div>
  );
}