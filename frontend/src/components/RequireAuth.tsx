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

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }} aria-live="polite">
        Checking session…
      </div>
    );
  }

  if (!me) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (me.must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" state={{ from: location }} replace />;
  }

  const effectiveRole = me.role as Role;

  const isEmployee = effectiveRole === "Employee";
  const isAdjudicator = effectiveRole === "Adjudicator";
  const isAdmin = effectiveRole === "Admin";

  const path = location.pathname;

  // ⭐ Allow adjudicators and admins to access ceremony
  if (path.startsWith("/app/ceremony")) {
    if (!isAdjudicator && !isAdmin) {
      return <Navigate to="/app/submit-reflection" replace />;
    }
    return children ? <>{children}</> : <Outlet />;
  }

  // Employee-only pages
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

  // Adjudicator-only pages
  if (path.startsWith("/app/adjudication")) {
    if (!isAdjudicator && !isAdmin) {
      return <Navigate to="/app/submit-reflection" replace />;
    }
  }

  return children ? <>{children}</> : <Outlet />;
}