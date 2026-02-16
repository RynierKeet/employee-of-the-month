// src/components/RequireAuth.tsx
import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../App";

interface Props {
  children: React.ReactNode;
  roles?: Array<"Admin" | "Adjudicator" | "Employee">;
}

export default function RequireAuth({ children, roles }: Props) {
  const location = useLocation();
  const { me, loading } = useAuth();

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Checking session…</div>;
  }

  if (!me || !(me as any).id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if ((me as any).must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && roles.length > 0) {
    const userRole = (me as any)?.role;
    const userRoles = (me as any)?.roles;

    // Narrow runtime values to string before checking against the typed roles array
    const hasRole =
      (typeof userRole === "string" && (roles as Array<string>).includes(userRole)) ||
      (Array.isArray(userRoles) && roles.some((r) => userRoles.includes(r)));

    if (!hasRole) {
      return (
        <div style={{ padding: "2rem" }}>
          <h3>Access denied</h3>
          <p>You do not have permission to view this page.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}