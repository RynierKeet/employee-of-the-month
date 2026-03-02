import React, { useEffect, useState } from "react";

type Winner = {
  nominee_id: number;
  nominee_name: string;
  reflection_text: string;
  photo_url: string;
};

type WinnerRevealProps = {
  winner: Winner | null;
  questionLabel: string;
  onShowAll: () => void;
};

export const WinnerReveal: React.FC<WinnerRevealProps> = ({
  winner,
  questionLabel,
  onShowAll,
}) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [winner]);

  if (!winner) return null;

  return (
    <div className="w-full flex flex-col items-center mt-6 px-4 text-center">

      {/* Category Label */}
      <div className="text-sm uppercase tracking-[0.25em] text-gray-400 mb-4">
        {questionLabel}
      </div>

      {/* Winner Photo with Spotlight Halo */}
      <div className="relative">
        {/* Soft gold spotlight halo */}
        <div className="absolute inset-0 rounded-full shadow-[0_0_80px_rgba(212,175,55,0.45)] pointer-events-none"></div>

        <div
          className={`
            relative
            w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56
            rounded-full overflow-hidden
            border border-yellow-400/70
            bg-black/70
            shadow-[0_0_60px_rgba(0,0,0,0.9)]
            transition-transform duration-700
            ${visible ? "scale-100" : "scale-90"}
          `}
        >
          <img
            src={winner.photo_url}
            alt={winner.nominee_name}
            className="w-full h-full object-cover brightness-110"
          />
        </div>
      </div>

      {/* Winner Name */}
      <div
        className={`
          mt-5 text-3xl sm:text-4xl md:text-5xl font-semibold text-yellow-300
          transition-opacity duration-700 delay-200
          ${visible ? "opacity-100" : "opacity-0"}
        `}
      >
        {winner.nominee_name}
      </div>

      {/* Reflection Box */}
      {winner.reflection_text && (
        <div
          className={`
            mt-6 w-full max-w-2xl mx-auto
            bg-black/40 backdrop-blur-md
            border border-white/10
            rounded-xl
            p-6 sm:p-7
            text-gray-200 leading-relaxed
            shadow-[0_0_40px_rgba(0,0,0,0.7)]
            transition-opacity duration-700 delay-300
            ${visible ? "opacity-100" : "opacity-0"}
          `}
        >
          <div className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">
            Winning reflection
          </div>
          <div className="whitespace-pre-line text-sm sm:text-base">
            {winner.reflection_text}
          </div>
        </div>
      )}

      {/* View All Reflections Button */}
      <button
        onClick={onShowAll}
        className={`
          mt-6 text-sm sm:text-base
          text-yellow-400 hover:text-yellow-300
          border border-yellow-400/40 hover:border-yellow-300
          px-4 py-2 rounded-full
          transition-colors duration-200
          transition-opacity duration-700 delay-500
          ${visible ? "opacity-100" : "opacity-0"}
        `}
      >
        View all reflections
      </button>
    </div>
  );
};