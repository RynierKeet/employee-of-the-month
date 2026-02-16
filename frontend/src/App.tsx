import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";

import Login from "./pages/Login";
import SubmitReflection from "./pages/SubmitReflection";
import ReflectionsVote from "./pages/ReflectionsVote";
import Results from "./pages/Results";
import Admin from "./pages/Admin";
import Adjudication from "./pages/Adjudication";
import AdjudicationPanel from "./pages/AdjudicationPanel";
import FinalResults from "./pages/FinalResults";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Public route */}
        <Route path="/login" element={<Login />} />

        {/* Default route → redirect to login */}
        <Route
          path="/"
          element={
            <RequireAuth roles={["Employee", "Adjudicator", "Admin"]}>
              <SubmitReflection />
            </RequireAuth>
          }
        />

        {/* Employee-only */}
        <Route
          path="/submit-reflection"
          element={
            <RequireAuth roles={["Employee"]}>
              <SubmitReflection />
            </RequireAuth>
          }
        />

        {/* Employee-only: reflections + voting */}
        <Route
          path="/reflections-vote"
          element={
            <RequireAuth roles={["Employee"]}>
              <ReflectionsVote />
            </RequireAuth>
          }
        />

        {/* Results (everyone logged in can view) */}
        <Route
          path="/results"
          element={
            <RequireAuth roles={["Employee", "Adjudicator", "Admin"]}>
              <Results />
            </RequireAuth>
          }
        />

        <Route
          path="/final-results"
          element={
            <RequireAuth roles={["Employee", "Adjudicator", "Admin"]}>
              <FinalResults />
            </RequireAuth>
          }
        />

        {/* Admin-only */}
        <Route
          path="/admin"
          element={
            <RequireAuth roles={["Admin"]}>
              <Admin />
            </RequireAuth>
          }
        />

        {/* Adjudicator + Admin */}
        <Route
          path="/adjudication"
          element={
            <RequireAuth roles={["Adjudicator", "Admin"]}>
              <Adjudication />
            </RequireAuth>
          }
        />

        <Route
          path="/adjudication-panel"
          element={
            <RequireAuth roles={["Adjudicator", "Admin"]}>
              <AdjudicationPanel />
            </RequireAuth>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Layout>
  );
}