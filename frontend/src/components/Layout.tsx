// src/components/Layout.tsx
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import crgLogo from "../assets/crg-logo.png";
import { useAuth } from "../auth";

// ⭐ Step highlighting
import { useStep } from "../context/StepContext";

type Role = "Admin" | "Adjudicator" | "Employee";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { me, loading, logout } = useAuth();

  const { currentStep } = useStep();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }

  // EFFECTIVE role
  const isAdjudicator = hasRole(me, "Adjudicator");
  const isEmployee = hasRole(me, "Employee");
  const isAdmin = hasRole(me, "Admin");

  // ⭐ NEW: Ceremony route detection
  const isCeremony = location.pathname.startsWith("/app/ceremony");

  // ⭐ NEW: Ceremony bypass — full-screen, no layout
  if (isCeremony) {
    return (
      <div className="fixed inset-0 bg-black text-white overflow-hidden">
        <Outlet />
      </div>
    );
  }

  // ⭐ Normal layout for all other pages
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-crg">
      {/* HEADER */}
      <header className="bg-crgBlue text-white shadow sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-8">
          {/* Left: Logo + Title */}
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

          {/* Right: Navigation + User */}
          <div className="flex items-center gap-8">
            {/* NAVIGATION */}
            {!loading && me ? (
              <nav
                className="flex items-center gap-5 text-sm font-medium"
                aria-label="Primary"
              >
                {/* EMPLOYEE NAVIGATION */}
                {isEmployee && (
                  <>
                    <NavLink
                      to="/app/submit-reflection"
                      label="Submit Reflection"
                      active={currentStep === 1}
                    />
                    <NavLink
                      to="/app/vote"
                      label="Reflections & Voting"
                      active={currentStep === 2}
                    />
                    <NavLink
                      to="/results"
                      label="Results"
                      active={currentStep === 3}
                    />
                    <NavLink
                      to="/final-results"
                      label="Final Results"
                      active={currentStep === 4}
                    />
                  </>
                )}

                {/* ADJUDICATOR NAVIGATION */}
                {(isAdjudicator || isAdmin) && (
                  <NavLink
                    to="/app/adjudication"
                    label="Adjudication"
                    active={location.pathname.startsWith("/app/adjudication")}
                  />
                )}

                {/* ADMIN NAVIGATION */}
                {isAdmin && (
                  <NavLink
                    to="/admin"
                    label="Admin"
                    active={location.pathname.startsWith("/admin")}
                  />
                )}
              </nav>
            ) : (
              <div
                className="h-6 w-48 bg-slate-200 rounded animate-pulse"
                aria-hidden
              />
            )}

            {/* USER + LOGOUT */}
            {!loading && me && (
              <div className="flex items-center gap-4">
                <div className="text-right leading-tight">
                  <div className="font-semibold text-crgGold">{me.name}</div>

                  {/* EFFECTIVE ROLE DISPLAY */}
                  <div className="text-xs text-slate-200">{me.role}</div>
                </div>

                <button
                  onClick={handleLogout}
                  className="bg-white text-crgBlue px-3 py-1 rounded font-semibold hover:bg-slate-200 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white"
                  aria-label="Logout"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="h-[3px] w-full bg-crgGold" />
      </header>

      {/* PROCESS BAR — HIDDEN FOR ADJUDICATORS */}
      {!isAdjudicator && (
        <div className="bg-slate-100 border-b border-slate-300 py-3 sticky top-[63px] z-40">
          <ProcessBar />
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-grow max-w-4xl mx-auto w-full px-6 py-10">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="bg-crgBlue text-slate-300 text-center py-6 text-sm border-t border-slate-800">
        © {new Date().getFullYear()} CRG South Africa
      </footer>
    </div>
  );
}

/* ------------------------------
   NAV LINK COMPONENT
------------------------------ */
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
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "text-crgGold border-b-2 border-crgGold pb-1"
          : "text-slate-100 hover:text-crgGold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-white"
      }
    >
      {label}
    </Link>
  );
}

/* ------------------------------
   PROCESS BAR
------------------------------ */
function ProcessBar() {
  const { currentStep } = useStep();

  const steps = [
    { label: "Submit Reflection", step: 1 },
    { label: "Reflections & Voting", step: 2 },
    { label: "Results", step: 3 },
    { label: "Final Results", step: 4 },
  ];

  return (
    <div className="flex items-center gap-4 text-sm font-medium text-slate-700 px-6">
      {steps.map((step, index) => {
        const isCurrent = step.step === currentStep;
        const isCompleted = step.step < currentStep;

        return (
          <div key={step.step} className="flex items-center gap-3">
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
              {step.step}. {step.label}
            </span>

            {index < steps.length - 1 && (
              <span className="text-slate-400" aria-hidden>
                →
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------
   ROLE HELPERS
------------------------------ */
function hasRole(me: any, role: Role) {
  if (!me) return false;
  if (typeof me.role === "string") return me.role === role;
  if (Array.isArray(me.roles)) return me.roles.includes(role);
  return false;
}