import React, { useEffect, useMemo, useState } from "react";

type Employee = {
  id: number;
  name: string;
  photo_url: string;
};

type QuestionMarkMontageProps = {
  employees: Employee[];
  isActive: boolean;
  onComplete: () => void;

  // NEW: dramatic mode for final reveal
  finalMode?: boolean;
};

type Point = { x: number; y: number };

// Normalised anchor points (0–1) forming an organic question mark
const QUESTION_MARK_POINTS: Point[] = [
  { x: 0.35, y: 0.10 },
  { x: 0.55, y: 0.12 },
  { x: 0.65, y: 0.25 },
  { x: 0.55, y: 0.38 },
  { x: 0.40, y: 0.50 },
  { x: 0.40, y: 0.65 },
  { x: 0.40, y: 0.82 }, // dot
  { x: 0.20, y: 0.20 }, // slight organic offset
];

// -----------------------------
// Timing Profiles
// -----------------------------

// Category reveal timing
const CATEGORY_TIMING = {
  INITIAL_HOLD: 800,
  SHUFFLE_CYCLES: 3,
  CYCLE_DURATION: 700,
  FREEZE_DURATION: 2000,
  FADE_OUT_DURATION: 600,
};

// Dramatic final reveal timing
const FINAL_TIMING = {
  INITIAL_HOLD: 1400,
  SHUFFLE_CYCLES: 6,
  CYCLE_DURATION: 900,
  FREEZE_DURATION: 3500,
  FADE_OUT_DURATION: 1200,
};

export const QuestionMarkMontage: React.FC<QuestionMarkMontageProps> = ({
  employees,
  isActive,
  onComplete,
  finalMode = false,
}) => {
  const [cycle, setCycle] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const [visible, setVisible] = useState(false);

  const anchors = QUESTION_MARK_POINTS;

  // Choose timing profile
  const T = finalMode ? FINAL_TIMING : CATEGORY_TIMING;

  // Shuffle mapping regenerated each cycle for randomness
  const mapping = useMemo(() => {
    const indices = anchors.map((_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, [cycle, anchors.length]);

  useEffect(() => {
    if (!isActive || employees.length === 0) return;

    setVisible(true);
    setFadingOut(false);
    setCycle(0);

    const timeouts: number[] = [];

    // Start after initial hold
    timeouts.push(
      window.setTimeout(() => {
        let currentCycle = 0;

        const runCycle = () => {
          currentCycle += 1;
          setCycle(currentCycle);

          if (currentCycle < T.SHUFFLE_CYCLES) {
            timeouts.push(window.setTimeout(runCycle, T.CYCLE_DURATION));
          } else {
            // Freeze on the "?"
            timeouts.push(
              window.setTimeout(() => {
                setFadingOut(true);

                // Fade out, then reveal winner
                timeouts.push(
                  window.setTimeout(() => {
                    setVisible(false);
                    onComplete();
                  }, T.FADE_OUT_DURATION)
                );
              }, T.FREEZE_DURATION)
            );
          }
        };

        runCycle();
      }, T.INITIAL_HOLD)
    );

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [isActive, employees.length, onComplete, finalMode]);

  if (!visible || employees.length === 0) return null;

  // Subtle jitter for organic movement
  const jitterFor = (index: number) => {
    const seed = (index + cycle * 7) % 5;
    const dx = (seed - 2) * 4;
    const dy = (2 - seed) * 3;
    return { dx, dy };
  };

  // Determine which anchor each employee uses
  const getAnchorIndexForEmployee = (employeeIndex: number) => {
    const baseIndex = employeeIndex % anchors.length;
    const offset = cycle % anchors.length;
    return (mapping[baseIndex] + offset) % anchors.length;
  };

  return (
    <div className="w-full flex items-center justify-center py-8">
      <div
        className={`
          relative w-full max-w-md sm:max-w-lg md:max-w-xl
          aspect-[3/4]
          transition-opacity duration-700
          ${fadingOut ? "opacity-0" : "opacity-100"}
        `}
      >
        {employees.map((emp, idx) => {
          const anchorIndex = getAnchorIndexForEmployee(idx);
          const anchor = anchors[anchorIndex];
          const { dx, dy } = jitterFor(idx);

          const sizeBase = 70;
          const size = sizeBase * (0.9 + (idx % 3) * 0.05);

          return (
            <div
              key={emp.id}
              className="absolute transition-all duration-500 ease-out"
              style={{
                left: `calc(${anchor.x * 100}% - ${size / 2}px + ${dx}px)`,
                top: `calc(${anchor.y * 100}% - ${size / 2}px + ${dy}px)`,
                width: `${size}px`,
                height: `${size}px`,
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden border border-white/20 shadow-[0_0_25px_rgba(0,0,0,0.8)] bg-black/60">
                <img
                  src={emp.photo_url}
                  alt={emp.name}
                  className="w-full h-full object-cover transition-opacity duration-700 opacity-100"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};