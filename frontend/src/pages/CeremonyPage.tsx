import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { QuestionMarkMontage } from "../components/QuestionMarkMontage";
import { WinnerReveal } from "../components/WinnerReveal";
import { ReflectionsModal } from "../components/ReflectionsModal";

const MONTH_KEY = "2026-02";

// -----------------------------
// Backend types
// -----------------------------
type Nominee = {
  nominee_id: number;
  nominee_name: string;
  vote_count: number;
  reflection_text: string;
  photo_url: string;
};

type CategoryResult = {
  question_key: string;
  question_label: string;
  nominees: Nominee[];
  winners: Nominee[];
};

type OverallWinner = {
  nominee_id: number;
  nominee_name: string;
  total_votes: number;
  photo_url: string;
};

type FinalResultsResponse = {
  published: boolean;
  month_key: string;
  results: CategoryResult[];
  winners: {
    question_key: string;
    question_label: string;
    winners: Nominee[];
  }[];
  overall_winner: OverallWinner | null;
  visibleScope: string;
};

type Employee = {
  id: number;
  name: string;
  role: string;
};

// -----------------------------
// Ceremony Component
// -----------------------------
const CeremonyPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryResult[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryResult | null>(null);

  const [winner, setWinner] = useState<Nominee | null>(null);

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeFaces, setEmployeeFaces] = useState<
    { id: number; name: string; photo_url: string }[]
  >([]);

  const [stage, setStage] = useState<"montage" | "winner" | "idle">("idle");

  const [showAllReflections, setShowAllReflections] = useState(false);

  const [overallWinner, setOverallWinner] = useState<OverallWinner | null>(
    null
  );

  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [allCategoriesCompleted, setAllCategoriesCompleted] = useState(false);

  const [finalRevealMode, setFinalRevealMode] = useState(false);
  const [revealCounter, setRevealCounter] = useState(0);

  const CATEGORY_WINNER_DELAY = 1800;
  const FINAL_WINNER_DELAY = 3500;

  // ------------------------------------------------------------
  // Load employees + results
  // ------------------------------------------------------------
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const [empRes, resRes] = await Promise.all([
          axios.get<Employee[]>("/employees", { withCredentials: true }),
          axios.get<FinalResultsResponse>(
            `/results-final/?month=${MONTH_KEY}`,
            { withCredentials: true }
          ),
        ]);

        if (!mounted) return;

        const resultsData = resRes.data;

        if (!resultsData.published) {
          alert("Results are not published yet.");
          return;
        }

        setCategories(resultsData.results);
        setOverallWinner(resultsData.overall_winner);

        const initial: Record<string, boolean> = {};
        resultsData.results.forEach((c) => (initial[c.question_key] = false));
        setCompleted(initial);

        const emps = empRes.data.filter((e) => e.role === "Employee");
        const faces = emps.map((e) => ({
          id: e.id,
          name: e.name,
          photo_url: `/photos/${e.id}.jpg`,
        }));

        setEmployees(emps);
        setEmployeeFaces(faces);
      } catch (err) {
        console.error("Error loading ceremony data:", err);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // ------------------------------------------------------------
  // Memoize employeeFaces so montage does NOT restart
  // ------------------------------------------------------------
  const employeeFacesMemo = useMemo(
    () => employeeFaces,
    [employeeFaces.length]
  );

  // ------------------------------------------------------------
  // Category selection
  // ------------------------------------------------------------
  const handleCategorySelect = (cat: CategoryResult) => {
    setFinalRevealMode(false);

    setSelectedCategory(cat);

    const resolvedWinner =
      Array.isArray(cat.winners) && cat.winners.length > 0
        ? cat.winners[0]
        : null;

    setWinner(resolvedWinner);

    setShowAllReflections(false);
    setStage("montage");
  };

  // ------------------------------------------------------------
  // Montage complete → show winner
  // ------------------------------------------------------------
  const handleMontageComplete = () => {
    const delay = finalRevealMode ? FINAL_WINNER_DELAY : CATEGORY_WINNER_DELAY;

    setTimeout(() => {
      setStage("winner");

      if (!finalRevealMode && selectedCategory) {
        setCompleted((prev) => {
          const updated = { ...prev, [selectedCategory.question_key]: true };
          const allDone = Object.values(updated).every((v) => v);
          setAllCategoriesCompleted(allDone);
          return updated;
        });
      }
    }, delay);
  };

  // ------------------------------------------------------------
  // Final reveal
  // ------------------------------------------------------------
  const triggerFinalReveal = () => {
    setFinalRevealMode(true);
    setRevealCounter((n) => n + 1);

    setSelectedCategory(null);
    setWinner(null);
    setShowAllReflections(false);
    setStage("montage");
  };

  // ------------------------------------------------------------
  // Modal reflections
  // ------------------------------------------------------------
  const modalResults = selectedCategory
    ? (() => {
        const winnerId = winner?.nominee_id;

        const winnerEntry = selectedCategory.nominees.find(
          (n) => n.nominee_id === winnerId
        );

        const others = selectedCategory.nominees
          .filter((n) => n.nominee_id !== winnerId)
          .sort((a, b) => b.vote_count - a.vote_count);

        return [
          {
            ...selectedCategory,
            nominees: winnerEntry ? [winnerEntry, ...others] : others,
          },
        ];
      })()
    : overallWinner
    ? [
        {
          question_key: "overall",
          question_label: "Employee of the Month",
          nominees: categories
            .flatMap((c) => c.nominees)
            .filter((n) => n.nominee_id === overallWinner.nominee_id),
          winners: [],
        },
      ]
    : [];

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="relative w-full min-h-screen bg-black text-white flex">
      {/* LEFT SIDE CATEGORY LIST */}
      <div className="w-64 bg-black/40 border-r border-white/10 p-6 space-y-4">
        <h2 className="text-lg font-semibold mb-4">Categories</h2>

        {categories.map((cat) => (
          <button
            key={cat.question_key}
            onClick={() => handleCategorySelect(cat)}
            className={`
              w-full text-left px-4 py-3 rounded-lg transition-all duration-300
              ${
                selectedCategory?.question_key === cat.question_key
                  ? "bg-white/20 shadow-lg"
                  : "bg-white/5 hover:bg-white/10"
              }
            `}
          >
            <div className="flex justify-between items-center">
              <span>{cat.question_label}</span>
              {completed[cat.question_key] && (
                <span className="text-crgGold text-sm">✓</span>
              )}
            </div>
          </button>
        ))}

        {allCategoriesCompleted && overallWinner && (
          <button
            onClick={triggerFinalReveal}
            className="mt-8 w-full px-4 py-3 rounded-lg bg-crgGold text-black font-bold hover:bg-yellow-400 transition-all"
          >
            Employee of the Month is…
          </button>
        )}
      </div>

      {/* RIGHT SIDE CEREMONY AREA */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* QUESTION MARK MONTAGE */}
        {stage === "montage" && (
          <QuestionMarkMontage
            key={
              selectedCategory
                ? selectedCategory.question_key
                : `overall-${revealCounter}`
            }
            employees={employeeFacesMemo}
            isActive={true}
            finalMode={finalRevealMode}
            onComplete={handleMontageComplete}
          />
        )}

        {/* CATEGORY WINNER REVEAL */}
        {stage === "winner" && winner && selectedCategory && (
          <WinnerReveal
            winner={{
              nominee_id: winner.nominee_id,
              nominee_name: winner.nominee_name,
              reflection_text: winner.reflection_text,
              photo_url: winner.photo_url,
            }}
            questionLabel={selectedCategory.question_label}
            onShowAll={() => setShowAllReflections(true)}
          />
        )}

        {/* FINAL OVERALL WINNER */}
        {stage === "winner" && !selectedCategory && overallWinner && (
          <WinnerReveal
            winner={{
              nominee_id: overallWinner.nominee_id,
              nominee_name: overallWinner.nominee_name,
              reflection_text: "",
              photo_url: overallWinner.photo_url,
            }}
            questionLabel="Employee of the Month"
            onShowAll={() => setShowAllReflections(true)}
          />
        )}

        {/* ALL REFLECTIONS MODAL */}
        <ReflectionsModal
          open={showAllReflections}
          onClose={() => setShowAllReflections(false)}
          results={modalResults}
        />
      </div>
    </div>
  );
};

export default CeremonyPage;