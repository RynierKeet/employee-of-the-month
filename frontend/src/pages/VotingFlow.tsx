import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VotingQuestion from "../components/VotingQuestion";

const QUESTIONS = [
  { key: "achievements", label: "Key Achievements" },
  { key: "impact", label: "Impact on Team / Organisation" },
  { key: "values", label: "Behaviour and Values" },
  { key: "growth", label: "Growth and Learning" },
  { key: "beyond", label: "Going Above and Beyond" },
  { key: "nomination", label: "Nomination Justification" },
];

const STORAGE_KEY = "crg_voting_draft_v1";

export default function VotingFlow({ month }: { month?: string }) {
  const navigate = useNavigate();
  const effectiveMonth = month ?? new Date().toISOString().slice(0, 7);

  const [index, setIndex] = useState(0);
  const [perQuestion, setPerQuestion] = useState<Record<string, number[]>>({});
  const [loading, setLoading] = useState(true);

  // Load draft from localStorage
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.month === effectiveMonth && parsed?.votes) {
          setPerQuestion(parsed.votes);
        }
      } catch {}
    }
    setLoading(false);
  }, [effectiveMonth]);

  function persist(votes: Record<string, number[]>) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ month: effectiveMonth, votes })
    );
  }

  async function handleSave(questionKey: string, ids: number[]) {
    const next = { ...perQuestion, [questionKey]: ids };
    setPerQuestion(next);
    persist(next);

    const res = await fetch(`/voting/save`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month_key: effectiveMonth,
        question_key: questionKey,
        nominee_ids: ids,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error(body?.error || "Failed to save votes.");
    }
  }

  const q = QUESTIONS[index];

  if (loading) return <div>Loading voting…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <header>
        <h2 className="text-2xl font-semibold">Employee Voting</h2>
        <p className="text-sm text-slate-600 mt-1">
          Question {index + 1} of {QUESTIONS.length}
        </p>
      </header>

      <VotingQuestion
        month={effectiveMonth}
        questionKey={q.key}
        questionLabel={q.label}
        initialSelected={perQuestion[q.key] ?? []}
        onSave={handleSave}
        onBack={index > 0 ? () => setIndex(index - 1) : undefined}
        onNext={() => setIndex(index + 1)}
        isLast={index === QUESTIONS.length - 1}
      />

      {index === QUESTIONS.length - 1 && (
        <div className="flex justify-end">
          <button
            onClick={() => navigate("/app/vote/review")}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Review All
          </button>
        </div>
      )}
    </div>
  );
}