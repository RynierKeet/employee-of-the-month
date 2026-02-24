import { useEffect, useState } from "react";
import { useAuth } from "../auth";
import VotingQuestion from "../components/VotingQuestion";
import { useStep } from "../context/StepContext";

const QUESTION_KEYS = [
  "achievements",
  "impact",
  "values",
  "growth",
  "beyond",
  "nomination",
] as const;

const QUESTION_LABELS: Record<string, string> = {
  achievements: "Key Achievements",
  impact: "Impact on Team / Organisation",
  values: "Behaviour and Values",
  growth: "Growth and Learning",
  beyond: "Going Above and Beyond",
  nomination: "Nomination Justification",
};

/* -------------------------------------------------------
   ⭐ Voting Summary Sidebar Component
------------------------------------------------------- */
function VotingSummarySidebar({
  status,
  currentIndex,
  setCurrentIndex,
  REVIEW_INDEX,
}: any) {
  if (!status || !status.questions) return null;

  return (
    <aside className="hidden lg:block w-64 bg-slate-50 border border-slate-200 rounded-card p-4 h-fit sticky top-24">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Voting Summary
      </h3>

      <ul className="space-y-3">
        {status.questions.map((q: any, index: number) => {
          const isCurrent = currentIndex === index;
          const isCompleted = q.hasVotes;

          return (
            <li
              key={index}
              className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
                isCurrent
                  ? "bg-crgGold text-slate-900 font-semibold"
                  : "hover:bg-slate-200"
              }`}
              onClick={() => setCurrentIndex(index)}
            >
              <span>
                {index + 1}. {QUESTION_LABELS[QUESTION_KEYS[index]]}
              </span>

              {isCompleted && (
                <span className="text-green-700 font-bold">✓</span>
              )}
            </li>
          );
        })}

        {/* Review Screen Entry */}
        <li
          className={`flex items-center justify-between p-2 rounded cursor-pointer transition ${
            currentIndex === REVIEW_INDEX
              ? "bg-crgGold text-slate-900 font-semibold"
              : "hover:bg-slate-200"
          }`}
          onClick={() => setCurrentIndex(REVIEW_INDEX)}
        >
          <span>Review All Answers</span>
          {status.questions.every((q: any) => q.hasVotes) && (
            <span className="text-green-700 font-bold">✓</span>
          )}
        </li>
      </ul>
    </aside>
  );
}

/* -------------------------------------------------------
   ⭐ MAIN VOTE COMPONENT
------------------------------------------------------- */
export default function Vote() {
  const { me } = useAuth();
  const employeeId = me?.id;

  const { setCurrentStep } = useStep();
  useEffect(() => {
    setCurrentStep(2);
  }, []);

  const [month] = useState(new Date().toISOString().slice(0, 7));
  const [status, setStatus] = useState<any>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [message, setMessage] = useState("");

  const totalQuestions = QUESTION_KEYS.length;
  const REVIEW_INDEX = totalQuestions;

  /* -------------------------------------------------------
     Load Voting Status
  ------------------------------------------------------- */
  useEffect(() => {
    if (!employeeId) return;

    fetch(`/voting/status?month=${month}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setStatus(data);

        if (data.is_final) {
          setCurrentIndex(-1);
        } else {
          const firstUnanswered = data.questions.findIndex(
            (q: any) => !q.hasVotes
          );
          setCurrentIndex(firstUnanswered === -1 ? 0 : firstUnanswered);
        }
      })
      .finally(() => setLoading(false));
  }, [employeeId, month]);

  /* -------------------------------------------------------
     Finalize Voting
  ------------------------------------------------------- */
  async function finalizeVoting() {
    setFinalizing(true);

    try {
      const res = await fetch(`/voting/finalize`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month_key: month }),
      });

      if (res.ok) {
        setStatus({ ...status, is_final: true });
        setCurrentIndex(-1);
        setMessage("Your votes have been submitted. Thank you!");
      } else {
        const err = await res.json().catch(() => null);
        setMessage(err?.error || "Failed to finalize voting.");
      }
    } finally {
      setFinalizing(false);
    }
  }

  /* -------------------------------------------------------
     Loading State
  ------------------------------------------------------- */
  if (loading) {
    return <div className="p-8 text-center">Loading voting…</div>;
  }

  /* -------------------------------------------------------
     Voting Completed Screen
  ------------------------------------------------------- */
  if (currentIndex === -1) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center">
        <h2 className="text-2xl font-semibold text-slate-900 mb-4">
          Voting Completed
        </h2>
        <p className="text-slate-700">{message || "Thank you for voting."}</p>
      </div>
    );
  }

  /* -------------------------------------------------------
     Progress Calculation
  ------------------------------------------------------- */
  const answeredCount =
    status?.questions?.filter((q: any) => q.hasVotes).length || 0;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  /* -------------------------------------------------------
     ⭐ REVIEW SCREEN
  ------------------------------------------------------- */
  if (currentIndex === REVIEW_INDEX) {
    return (
      <div className="max-w-6xl mx-auto flex gap-8 p-8">
        <VotingSummarySidebar
          status={status}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          REVIEW_INDEX={REVIEW_INDEX}
        />

        <div className="flex-grow space-y-8 bg-white shadow-card border border-slate-200 rounded-card p-8">
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium text-slate-700">
              <span>Voting Progress</span>
              <span>
                {answeredCount} of {totalQuestions} completed
              </span>
            </div>

            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-crgGold transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-slate-900">
            Review Your Answers
          </h2>

          <p className="text-slate-700">
            Please review all your selections before submitting your final votes.
          </p>

          <div className="space-y-6">
            {status.questions.map((q: any, index: number) => (
              <div
                key={index}
                className="border border-slate-300 rounded-card p-4 bg-slate-50"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-slate-900">
                    {index + 1}. {QUESTION_LABELS[QUESTION_KEYS[index]]}
                  </h3>

                  <button
                    onClick={() => setCurrentIndex(index)}
                    className="text-sm text-crgBlue hover:text-crgGold underline"
                  >
                    Edit
                  </button>
                </div>

                <p className="text-slate-700 mt-2">
                  <strong>Selected Nominees:</strong>
                </p>

                <ul className="list-disc ml-6 text-slate-800">
                  {q.votes.map((v: any) => (
                    <li key={v.employee_id}>{v.employee_name}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-4">
            <button
              onClick={() => setCurrentIndex(totalQuestions - 1)}
              className="text-sm text-crgBlue hover:text-crgGold underline"
            >
              ← Return to Last Question
            </button>

            <button
              onClick={finalizeVoting}
              disabled={finalizing}
              className="px-6 py-3 rounded-card bg-crgGold text-slate-900 font-semibold hover:bg-yellow-500 transition"
            >
              {finalizing ? "Submitting…" : "Submit Final Votes"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------
     ⭐ NORMAL QUESTION SCREEN
  ------------------------------------------------------- */
  const questionKey = QUESTION_KEYS[currentIndex];
  const questionLabel = QUESTION_LABELS[questionKey];

  return (
    <div className="max-w-6xl mx-auto flex gap-8 p-8">
      <VotingSummarySidebar
        status={status}
        currentIndex={currentIndex}
        setCurrentIndex={setCurrentIndex}
        REVIEW_INDEX={REVIEW_INDEX}
      />

      <div className="flex-grow space-y-8 bg-white shadow-card border border-slate-200 rounded-card p-8">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium text-slate-700">
            <span>Voting Progress</span>
            <span>
              {answeredCount} of {totalQuestions} completed
            </span>
          </div>

          <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-crgGold transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">
            Jump to Question:
          </label>

          <select
            value={currentIndex}
            onChange={(e) => setCurrentIndex(Number(e.target.value))}
            className="border border-slate-300 rounded px-3 py-1 text-sm"
          >
            {QUESTION_KEYS.map((key, index) => (
              <option key={key} value={index}>
                {index + 1}. {QUESTION_LABELS[key]}
                {status?.questions?.[index]?.hasVotes ? " ✓" : ""}
              </option>
            ))}
          </select>
        </div>

        {currentIndex > 0 && (
          <button
            onClick={() => setCurrentIndex(currentIndex - 1)}
            className="text-sm text-crgBlue hover:text-crgGold underline transition"
          >
            ← Return to Previous Question
          </button>
        )}

        <h2 className="text-2xl font-semibold text-slate-900">
          Employee Voting
        </h2>

        <p className="text-slate-700">
          Question {currentIndex + 1} of {totalQuestions}:{" "}
          <strong>{questionLabel}</strong>
        </p>

        <VotingQuestion
          month={month}
          questionKey={questionKey}
          questionLabel={questionLabel}
          initialSelected={status.questions[currentIndex].votes.map(
            (v: any) => v.employee_id
          )}
          onSave={async (qKey, ids) => {
            // Save to backend
            const res = await fetch(`/voting/save`, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                month_key: month,
                question_key: qKey,
                nominee_ids: ids,
              }),
            });

            if (!res.ok) {
              const err = await res.json().catch(() => null);
              throw new Error(err?.error || "Failed to save votes.");
            }

            // Update local status
            const updated = { ...status };
            updated.questions[currentIndex].hasVotes = true;
            updated.questions[currentIndex].votes = ids.map((id: number) => ({
              employee_id: id,
              employee_name:
                status.questions[currentIndex].nominees.find(
                  (n: any) => n.nominee_id === id
                )?.nominee_name || "Unknown",
            }));
            setStatus(updated);
          }}
          onBack={() => {
            if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
          }}
          onNext={() => {
            if (currentIndex < totalQuestions - 1) {
              setCurrentIndex(currentIndex + 1);
            } else {
              setCurrentIndex(REVIEW_INDEX);
            }
          }}
          isLast={currentIndex === totalQuestions - 1}
        />
      </div>
    </div>
  );
}