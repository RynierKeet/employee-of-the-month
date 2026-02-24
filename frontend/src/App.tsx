// src/App.tsx
console.log("Running App.tsx");

import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import { useAuth } from "./auth";

const ChangePassword = React.lazy(() => import("./pages/ChangePassword"));
import SubmitReflection from "./pages/SubmitReflection";
import Vote from "./pages/Vote"; // ✅ new voting page route

export default function App() {
  const { me, loading } = useAuth();

  // While auth is loading, avoid rendering routes prematurely
  if (loading) {
    return <div>Loading…</div>;
  }

  return (
    <Routes>
      {/* Redirect root to login or app depending on auth */}
      <Route
        path="/"
        element={
          me ? <Navigate to="/app" replace /> : <Navigate to="/login" replace />
        }
      />

      {/* LOGIN ROUTE — redirect authenticated users away */}
      <Route
        path="/login"
        element={me ? <Navigate to="/app" replace /> : <Login />}
      />

      {/* CHANGE PASSWORD */}
      <Route
        path="/change-password"
        element={
          me && !me.must_change_password ? (
            <Navigate to="/app" replace />
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
        {/* Default route inside /app */}
        <Route index element={<Navigate to="submit-reflection" replace />} />

        {/* STEP 1 — Submit Reflection */}
        <Route path="submit-reflection" element={<SubmitReflection />} />

        {/* STEP 2 — Voting */}
        <Route path="vote" element={<Vote />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}