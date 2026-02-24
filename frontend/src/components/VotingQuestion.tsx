import { useEffect, useState } from "react";

interface Props {
  month: string;
  questionKey: string;
  questionLabel: string;
  initialSelected: number[];
  onSave: (questionKey: string, selectedIds: number[]) => Promise<void>;
  onBack?: () => void;
  onNext?: () => void;
  isLast?: boolean;
}

export default function VotingQuestion({
  month,
  questionKey,
  questionLabel,
  initialSelected,
  onSave,
  onBack,
  onNext,
  isLast = false,
}: Props) {
  const [nominees, setNominees] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Load nominees
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setMessage(null);

    fetch(`/voting/question/${questionKey}?month=${month}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        setNominees(data?.nominees ?? []);
      })
      .catch(() => {
        if (!mounted) return;
        setMessage("Failed to load nominees.");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [questionKey, month]);

  // Update selection when parent changes
  useEffect(() => {
    setSelected(initialSelected);
  }, [initialSelected]);

  function toggleSelection(id: number) {
    setMessage(null);
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  }

  async function handleSave(advance: boolean) {
    if (selected.length !== 2) {
      setMessage("Please select exactly two nominees.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      await onSave(questionKey, selected);
      setMessage("Saved.");

      if (advance && onNext) onNext();
    } catch (err: any) {
      setMessage(err?.message || "Failed to save votes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading nominees…</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{questionLabel}</h3>

      {message && <div className="text-sm text-amber-700">{message}</div>}

      <div className="space-y-3">
        {nominees.map((n) => {
          const id = n.nominee_id ?? n.id ?? n.employee_id;
          const isSelected = selected.includes(id);

          return (
            <div
              key={id}
              onClick={() => toggleSelection(id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleSelection(id)}
              className={`p-3 border rounded flex items-start gap-4 cursor-pointer ${
                isSelected ? "border-brandnavy bg-slate-50" : "border-slate-200"
              }`}
            >
              <input type="checkbox" checked={isSelected} readOnly className="mt-1" />

              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{n.nominee_name}</div>
                  {isSelected && <div className="text-xs text-green-700">Selected</div>}
                </div>
                {n.answer && <div className="text-sm text-slate-600 mt-1">{n.answer}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between pt-4">
        {onBack && (
          <button onClick={onBack} className="px-4 py-2 bg-slate-200 rounded">
            Back
          </button>
        )}

        <button
          onClick={() => handleSave(!isLast)}
          disabled={saving}
          className="px-4 py-2 bg-brandnavy text-white rounded"
        >
          {saving ? "Saving…" : isLast ? "Save & Review" : "Save & Next"}
        </button>
      </div>
    </div>
  );
}