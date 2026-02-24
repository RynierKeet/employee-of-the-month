// src/components/RequireAuth.tsx
import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../auth";

type Role = "Admin" | "Adjudicator" | "Employee";

interface Props {
  children?: React.ReactNode;
  roles?: Role[];
}

export default function RequireAuth({ children }: Props) {
  const location = useLocation();
  const { me, loading } = useAuth();

  // While loading
  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }} aria-live="polite">
        Checking session…
      </div>
    );
  }

  // Not logged in
  if (!me) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Must change password
  if (me.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" state={{ from: location }} replace />;
  }

  const isEmployee = me.role === "Employee";
  const isAdjudicator = me.role === "Adjudicator";
  const isAdmin = me.role === "Admin";

  const path = location.pathname;

  // -----------------------------
  // ROLE‑BASED ROUTE PROTECTION
  // -----------------------------

  // EMPLOYEE‑ONLY PAGES
  if (
    path.startsWith("/app/submit-reflection") ||
    path.startsWith("/app/vote") ||
    path.startsWith("/results") ||
    path.startsWith("/final-results")
  ) {
    if (!isEmployee && !isAdmin) {
      return <Navigate to="/app/adjudication" replace />;
    }
  }

  // ADJUDICATOR‑ONLY PAGES
  if (path.startsWith("/app/adjudication")) {
    if (!isAdjudicator && !isAdmin) {
      return <Navigate to="/app/submit-reflection" replace />;
    }
  }

  // Admin can go anywhere — no restrictions

  // Authorized
  return children ? <>{children}</> : <Outlet />;
}