import React from "react";

type Winner = {
  nominee_id: number;
  nominee_name: string;
  reflection_text: string;
  photo_url: string;
  vote_count?: number;
};

type CategoryResult = {
  question_key: string;
  question_label: string;
  nominees: Winner[];   // CeremonyPage now sends winner first, then others
  winners: Winner[];    // Not used anymore, but kept for type compatibility
};

type ReflectionsModalProps = {
  open: boolean;
  onClose: () => void;
  results: CategoryResult[];
};

export const ReflectionsModal: React.FC<ReflectionsModalProps> = ({
  open,
  onClose,
  results,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8">
      <div
        className="
          bg-black/70 border border-white/10 rounded-xl
          max-w-4xl w-full max-h-[85vh]
          p-6 sm:p-8
          overflow-y-auto
          shadow-[0_0_50px_rgba(0,0,0,0.7)]
        "
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl sm:text-2xl text-white tracking-wide">
            All reflections
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-sm transition-colors"
          >
            Close
          </button>
        </div>

        {/* Reflections */}
        <div className="space-y-6">
          {results.map((category) => (
            <div
              key={category.question_key}
              className="border border-white/10 rounded-lg p-4 sm:p-5 bg-black/40"
            >
              {/* Category label */}
              <div className="text-xs uppercase tracking-[0.2em] text-gray-400 mb-4">
                {category.question_label}
              </div>

              {/* Winner + others */}
              {category.nominees.map((n, index) => (
                <div
                  key={n.nominee_id}
                  className="mb-6 last:mb-0 p-4 rounded-lg bg-white/5 border border-white/10"
                >
                  {/* Winner highlight */}
                  {index === 0 && (
                    <div className="text-xs text-crgGold mb-1 tracking-wide">
                      Winner
                    </div>
                  )}

                  <div className="text-sm text-yellow-300 mb-2">
                    {n.nominee_name}
                  </div>

                  <div className="text-sm sm:text-base text-gray-200 whitespace-pre-line leading-relaxed">
                    {n.reflection_text || "No reflection submitted."}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Close button bottom */}
        <div className="text-center mt-8">
          <button
            onClick={onClose}
            className="
              px-6 py-3
              bg-white/10 hover:bg-white/20
              rounded-lg
              text-sm text-gray-200
              transition-colors
            "
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};