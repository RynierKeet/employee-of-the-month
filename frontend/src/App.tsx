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
import Vote from "./pages/Vote";

// ⭐ Ceremony Page
import CeremonyPage from "./pages/CeremonyPage";

export default function App() {
  const { me, loading } = useAuth();

  if (loading) {
    return <div>Loading…</div>;
  }

  // IMPORTANT:
  // me.role is now the EFFECTIVE role (Admin / Adjudicator / Employee)
  const effectiveRole = me?.role;

  const landingFor = (user: any) => {
    if (!user) return "/login";

    if (user.role === "Adjudicator") return "/app/adjudication";
    if (user.role === "Admin") return "/app/admin"; // optional if you add an admin dashboard
    return "/app/submit-reflection";
  };

  return (
    <Routes>
      {/* ROOT */}
      <Route path="/" element={<Navigate to={landingFor(me)} replace />} />

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
        {/* DEFAULT inside /app */}
        <Route
          index
          element={
            effectiveRole === "Adjudicator" ? (
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
        <Route path="adjudication" element={<AdjudicationPanel />} />

        {/* ⭐ Ceremony Page */}
        <Route path="ceremony" element={<CeremonyPage />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}