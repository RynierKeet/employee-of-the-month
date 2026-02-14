import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import crgLogo from "../assets/crg-logo.png"; // Update if your logo file name differs

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-crg">

      {/* HEADER (sticky) */}
      <header className="bg-crgBlue text-white shadow relative sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-8">

          {/* LEFT: Logo + Title */}
          <div className="flex items-center gap-4">
            <img
              src={crgLogo}
              alt="CRG South Africa"
              className="h-10 w-auto object-contain"
            />
            <div className="leading-tight">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-200">
                CRG South Africa
              </div>
              <div className="text-lg font-semibold tracking-wide text-crgGold">
                Employee of the Month
              </div>
            </div>
          </div>

          {/* RIGHT: Navigation */}
          <nav className="flex items-center gap-5 text-sm font-medium">

            <NavLink
              to="/submit-reflection"
              label="Submit Reflection"
              active={isActive("/submit-reflection") || location.pathname === "/"}
            />

            <NavLink
              to="/reflections-vote"
              label="Reflections & Voting"
              active={isActive("/reflections-vote")}
            />

            <NavLink
              to="/results"
              label="Results"
              active={isActive("/results")}
            />

            <NavLink
              to="/final-results"
              label="Final Results"
              active={isActive("/final-results")}
            />

            <NavLink
              to="/admin"
              label="Admin"
              active={isActive("/admin")}
            />

            <NavLink
              to="/adjudication"
              label="Adjudication"
              active={
                isActive("/adjudication") ||
                isActive("/adjudication-panel")
              }
            />
          </nav>
        </div>

        {/* Gold accent line */}
        <div className="h-[3px] w-full bg-crgGold" />
      </header>

      {/* PROCESS ORIENTATION BAR (sticky under header) */}
      <div className="bg-slate-100 border-b border-slate-300 py-3 sticky top-[63px] z-40">
        <ProcessBar />
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-10">
        {children}
      </main>

      {/* FOOTER */}
      <footer className="bg-crgBlue text-slate-300 text-center py-6 text-sm border-t border-slate-800">
        © {new Date().getFullYear()} CRG South Africa
      </footer>
    </div>
  );
}

/* -------------------------------------------------------
   NAV LINK COMPONENT
------------------------------------------------------- */
function NavLink({
  to,
  label,
  active,
}: {
  to: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={
        active
          ? "text-crgGold border-b-2 border-crgGold pb-1"
          : "text-slate-100 hover:text-crgGold transition-colors"
      }
    >
      {label}
    </Link>
  );
}

/* -------------------------------------------------------
   PROCESS BAR WITH COMPLETED STEPS
------------------------------------------------------- */
function ProcessBar() {
  const location = useLocation();

  const steps = [
    { label: "Submit Reflection", path: "/submit-reflection" },
    { label: "Reflections & Voting", path: "/reflections-vote" },
    { label: "Results", path: "/results" },
    { label: "Final Results", path: "/final-results" },
  ];

  // Determine the index of the current step
  const currentIndex = steps.findIndex((step) =>
    location.pathname.startsWith(step.path)
  );

  return (
    <div className="flex items-center gap-4 text-sm font-medium text-slate-700 px-6">
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div key={step.path} className="flex items-center gap-3">

            {/* Dot indicator */}
            <div
              className={
                isCurrent
                  ? "h-3 w-3 rounded-full bg-crgGold"
                  : isCompleted
                  ? "h-3 w-3 rounded-full bg-slate-900"
                  : "h-3 w-3 rounded-full bg-slate-300"
              }
            />

            {/* Step label */}
            <span
              className={
                isCurrent
                  ? "text-crgGold font-semibold"
                  : isCompleted
                  ? "text-slate-900"
                  : "text-slate-400"
              }
            >
              {index + 1}. {step.label}
            </span>

            {/* Arrow */}
            {index < steps.length - 1 && (
              <span className="text-slate-400">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}