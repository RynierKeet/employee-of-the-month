import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";

export default function Sidebar() {
  const { me } = useAuth();

  const linkClass =
    "block px-4 py-2 rounded hover:bg-gray-200 transition-colors text-sm";

  return (
    <aside className="w-56 bg-gray-100 border-r border-gray-300 p-4 flex flex-col gap-2">
      <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
        Navigation
      </div>

      <NavLink to="/app/submit-reflection" className={linkClass}>
        Submit Reflection
      </NavLink>

      {/* Adjudicator-only */}
      {me?.role === "Adjudicator" && (
        <NavLink to="/app/adjudicate" className={linkClass}>
          Adjudicate Reflections
        </NavLink>
      )}

      {/* Admin-only */}
      {me?.role === "Admin" && (
        <>
          <NavLink to="/app/manage-users" className={linkClass}>
            Manage Users
          </NavLink>
          <NavLink to="/app/reports" className={linkClass}>
            Reports
          </NavLink>
        </>
      )}
    </aside>
  );
}