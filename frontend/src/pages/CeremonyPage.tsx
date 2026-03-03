// src/pages/CeremonyPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

import { QuestionMarkMontage } from "../components/QuestionMarkMontage";
import { WinnerReveal } from "../components/WinnerReveal";
import { ReflectionsModal } from "../components/ReflectionsModal";

import crgLogo from "../assets/crg-logo.png";

const MONTH_KEY = "2026-02";

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

function PanePortal({
  children,
  containerId = "ceremony-pane-root",
}: {
  children: React.ReactNode;
  containerId?: string;
}) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement("div");
      el.id = containerId;
      document.body.appendChild(el);
    }
    setContainer(el);
    return () => {
      // keep container to avoid flicker if reused
    };
  }, [containerId]);

  if (!container) return null;
  return createPortal(children, container);
}

const CeremonyPage: React.FC = () => {
  const [categories, setCategories] = useState<CategoryResult[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryResult | null>(null);

  const [winner, setWinner] = useState<Nominee | null>(null);

  // const [employees, setEmployees] = useState<Employee[]>([]);
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

  const [showTitle, setShowTitle] = useState(true);

  const CATEGORY_WINNER_DELAY = 1800;
  const FINAL_WINNER_DELAY = 3500;

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
        resultsData.results.forEach((c:any) => (initial[c.question_key] = false));
        setCompleted(initial);

        const emps = empRes.data.filter((e:any) => e.role === "Employee");
        const faces = emps.map((e:any) => ({
          id: e.id,
          name: e.name,
          photo_url: `/photos/${e.id}.jpg`,
        }));

        // setEmployees(emps);
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

  const employeeFacesMemo = useMemo(
    () => employeeFaces,
    [employeeFaces.length]
  );

  const handleCategorySelect = (cat: CategoryResult) => {
    setShowTitle(false);
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

  const triggerFinalReveal = () => {
    setFinalRevealMode(true);
    setRevealCounter((n) => n + 1);

    setSelectedCategory(null);
    setWinner(null);
    setShowAllReflections(false);
    setStage("montage");
  };

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

  return (
    <div className="relative w-screen h-screen bg-black text-white overflow-hidden">
      {/* Portal-rendered permanent left pane */}
      <PanePortal>
        <aside
          className="
            fixed left-0 top-0 h-screen w-64 z-[9999]
            bg-[#111113] border-r border-transparent
            p-6 space-y-4 shadow-xl opacity-75
          "
          aria-label="Categories"
        >
          {/* gold divider moved to RIGHT edge of pane, glowing toward stage */}
          <div className="absolute right-0 top-0 h-full w-[4px] bg-crgGold shadow-[6px_0_24px_rgba(212,175,55,0.18)]" />
          <h2 className="text-lg font-semibold mb-4 tracking-wide text-crgGold">
            Categories
          </h2>

          {categories.map((cat) => (
            <button
              key={cat.question_key}
              onClick={() => handleCategorySelect(cat)}
              className={`
                w-full text-left px-4 py-3 rounded-lg transition-colors duration-200
                ${selectedCategory?.question_key === cat.question_key
                  ? "bg-white/8 shadow-lg"
                  : "bg-white/3 hover:bg-white/8"
                }
                focus:outline-none focus-visible:ring-2 focus-visible:ring-crgGold focus-visible:ring-offset-2
              `}
            >
              <div className="flex justify-between items-center">
                <span className="tracking-wide text-white/75 hover:text-white">
                  {cat.question_label}
                </span>
                {completed[cat.question_key] && (
                  <span className="text-crgGold text-sm">●</span>
                )}
              </div>
            </button>
          ))}

          {allCategoriesCompleted && overallWinner && (
            <button
              onClick={triggerFinalReveal}
              className="mt-8 w-full px-4 py-3 rounded-lg bg-crgGold text-black font-bold hover:bg-yellow-400 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-crgGold"
            >
              Employee of the Month is…
            </button>
          )}
        </aside>
      </PanePortal>

      {/* Stage shifted right by pane width so content has more room */}
      <div className="absolute inset-0 flex items-center justify-center pl-64 overflow-hidden">
        {/* Cinematic warm-gold spotlight background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0)_0%,rgba(0,0,0,0.65)_70%,rgba(0,0,0,0.9)_100%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.22),rgba(0,0,0,0)_70%)]" />
        </div>

        {/* Title screen */}
        {showTitle && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-50 animate-fadeIn">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.12),transparent_70%)]" />
            <img src={crgLogo} alt="CRG Logo" className="w-56 h-56 mb-8 opacity-95 animate-slowFade" />
            <h1 className="text-6xl font-bold tracking-wide animate-slowFade">CRG Employee of the Month</h1>
            <div className="w-40 h-[2px] bg-crgGold mt-6 opacity-90" />
          </div>
        )}

        {/* Montage: larger on medium+ screens */}
        {stage === "montage" && !showTitle && (
          <div className="animate-fadeIn transform transition-transform duration-500 md:scale-115 lg:scale-125">
            <QuestionMarkMontage
              key={selectedCategory ? selectedCategory.question_key : `overall-${revealCounter}`}
              employees={employeeFacesMemo}
              isActive={true}
              finalMode={finalRevealMode}
              onComplete={handleMontageComplete}
            />
          </div>
        )}

        {/* Category winner reveal: larger presentation */}
        {stage === "winner" && winner && selectedCategory && (
          <div className="animate-fadeIn transform transition-transform duration-500 md:scale-115 lg:scale-125 brightness-110">
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
          </div>
        )}

        {/* Final overall winner: larger presentation */}
        {stage === "winner" && !selectedCategory && overallWinner && (
          <div className="animate-fadeIn transform transition-transform duration-500 md:scale-115 lg:scale-125 brightness-110">
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
          </div>
        )}

        {/* Reflections modal */}
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