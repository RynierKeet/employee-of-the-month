// src/components/RequireAuth.tsx
import React from "react";
import { Navigate, useLocation, Outlet } from "react-router-dom";
import { useAuth, type AuthUser } from "../auth";

type Role = "Admin" | "Adjudicator" | "Employee";

interface Props {
  children?: React.ReactNode;
  roles?: Role[];
}

/** Type guard: ensures value is an AuthUser with a numeric id */
function isAuthUser(value: unknown): value is AuthUser {
  return (
    !!value &&
    typeof value === "object" &&
    "id" in (value as object) &&
    typeof (value as any).id === "number"
  );
}

/**
 * RequireAuth
 *
 * - Shows a loading placeholder while auth state is resolving.
 * - Redirects to /login when not authenticated (preserves attempted location).
 * - Redirects to /change-password when must_change_password is set (preserves attempted location).
 * - If roles are provided, ensures the user has at least one of them.
 * - If unauthorized, shows a small Access Denied message (no redirect).
 */
export default function RequireAuth({ children, roles }: Props): React.ReactElement {
  const location = useLocation();
  const { me, loading } = useAuth();

  // While auth state is loading, render a neutral placeholder.
  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }} aria-live="polite">
        Checking session…
      </div>
    );
  }

  // Not authenticated → redirect to login and preserve attempted location.
  if (!isAuthUser(me)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Force password change flow if required. Preserve original 'from' so user can continue after change.
  if ((me as any).must_change_password && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" state={{ from: location }} replace />;
  }

  // If roles are provided, verify the user has at least one.
  if (roles && roles.length > 0) {
    const userRole = (me as any)?.role as string | undefined;
    const userRoles = (me as any)?.roles as string[] | undefined;

    const hasRole =
      (typeof userRole === "string" && roles.includes(userRole as Role)) ||
      (Array.isArray(userRoles) && roles.some((r) => userRoles.includes(r)));

    if (!hasRole) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h3>Access denied</h3>
          <p>You do not have permission to view this page.</p>
        </div>
      );
    }
  }

  // Authorized — render children if provided, otherwise render nested routes via Outlet.
  return children ? <>{children}</> : <Outlet />;
}