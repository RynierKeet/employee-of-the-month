// src/App.tsx
console.log("Running App.tsx");

import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import { useAuth } from "./auth";
import AdjudicationPanel from "./pages/AdjudicationPanel";

const ChangePassword = React.lazy(() => import("./pages/ChangePassword"));
import SubmitReflection from "./pages/SubmitReflection";
import Vote from "./pages/Vote"; // voting page

export default function App() {
  const { me, loading } = useAuth();

  if (loading) {
    return <div>Loading…</div>;
  }

  // Narrow helper so we don't fight the me type
  const isAdjudicator = (me as any)?.is_adjudicator;

  // Helper: determine landing page based on role
  const landingFor = (user: any) => {
    if (!user) return "/login";
    if ((user as any).is_adjudicator) return "/app/adjudication";
    return "/app/submit-reflection";
  };

  return (
    <Routes>
      {/* ROOT: redirect based on role */}
      <Route
        path="/"
        element={<Navigate to={landingFor(me)} replace />}
      />

      {/* LOGIN */}
      <Route
        path="/login"
        element={me ? <Navigate to={landingFor(me)} replace /> : <Login />}
      />

      {/* CHANGE PASSWORD */}
      <Route
        path="/change-password"
        element={
          me && !me.must_change_password ? (
            <Navigate to={landingFor(me)} replace />
          ) : (
            <Suspense fallback={<div>Loading…</div>}>
              <ChangePassword />
            </Suspense>
          )
        }
      />

      {/* PROTECTED ROUTES */}
      <Route
        path="/app/*"
        element={
          <RequireAuth roles={["Employee", "Adjudicator", "Admin"]}>
            <Layout />
          </RequireAuth>
        }
      >
        {/* DEFAULT INSIDE /app */}
        <Route
          index
          element={
            isAdjudicator ? (
              <Navigate to="adjudication" replace />
            ) : (
              <Navigate to="submit-reflection" replace />
            )
          }
        />

        {/* EMPLOYEE ROUTES */}
        <Route path="submit-reflection" element={<SubmitReflection />} />
        <Route path="vote" element={<Vote />} />

        {/* ADJUDICATOR ROUTE */}
        <Route
          path="adjudication"
          element={<AdjudicationPanel />}
        />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}