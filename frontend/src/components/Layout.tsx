import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import crgLogo from "../assets/crg-logo.png";
import { fetchCurrentUser, logout } from "../utils/auth";
import type { AuthUser } from "../utils/auth";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState<AuthUser | null>(null);

  const isActive = (path: string) => location.pathname.startsWith(path);

  useEffect(() => {
    async function load() {
      const u = await fetchCurrentUser();
      setUser(u);
    }
    load();
  }, []);

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

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

          {/* RIGHT: Navigation + User */}
          <div className="flex items-center gap-8">

            {/* NAVIGATION */}
            {user && (
              <nav className="flex items-center gap-5 text-sm font-medium">

                {/* Employee-only */}
                {["Employee", "Adjudicator", "Admin"].includes(user.role) && (
                  <NavLink
                    to="/submit-reflection"
                    label="Submit Reflection"
                    active={
                      isActive("/submit-reflection") ||
                      location.pathname === "/"
                    }
                  />
                )}

                {/* Employee-only */}
                {user.role === "Employee" && (
                  <NavLink
                    to="/reflections-vote"
                    label="Reflections & Voting"
                    active={isActive("/reflections-vote")}
                  />
                )}

                {/* All roles */}
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

                {/* Admin-only */}
                {user.role === "Admin" && (
                  <NavLink
                    to="/admin"
                    label="Admin"
                    active={isActive("/admin")}
                  />
                )}

                {/* Adjudicator + Admin */}
                {["Adjudicator", "Admin"].includes(user.role) && (
                  <NavLink
                    to="/adjudication"
                    label="Adjudication"
                    active={
                      isActive("/adjudication") ||
                      isActive("/adjudication-panel")
                    }
                  />
                )}
              </nav>
            )}

            {/* USER INFO + LOGOUT */}
            {user && (
              <div className="flex items-center gap-4">
                <div className="text-right leading-tight">
                  <div className="font-semibold text-crgGold">{user.name}</div>
                  <div className="text-xs text-slate-200">{user.role}</div>
                </div>

                <button
                  onClick={handleLogout}
                  className="bg-white text-crgBlue px-3 py-1 rounded font-semibold hover:bg-slate-200 transition"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
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
            <div
              className={
                isCurrent
                  ? "h-3 w-3 rounded-full bg-crgGold"
                  : isCompleted
                  ? "h-3 w-3 rounded-full bg-slate-900"
                  : "h-3 w-3 rounded-full bg-slate-300"
              }
            />

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

            {index < steps.length - 1 && (
              <span className="text-slate-400">→</span>
            )}
          </div>
        );
      })}
    </div>
  );
}