import { Routes, Route } from "react-router-dom";

import Layout from "./components/Layout";

import SubmitReflection from "./pages/SubmitReflection";
import ReflectionsVote from "./pages/ReflectionsVote";   // ← NEW integrated page
import Results from "./pages/Results";
import Admin from "./pages/Admin";
import Adjudication from "./pages/Adjudication";
import AdjudicationPanel from "./pages/AdjudicationPanel";
import FinalResults from "./pages/FinalResults";

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<SubmitReflection />} />

        {/* Submit Reflection */}
        <Route path="/submit-reflection" element={<SubmitReflection />} />

        {/* NEW: Combined Reflections + Voting page */}
        <Route path="/reflections-vote" element={<ReflectionsVote />} />

        {/* Results */}
        <Route path="/results" element={<Results />} />
        <Route path="/final-results" element={<FinalResults />} />

        {/* Admin */}
        <Route path="/admin" element={<Admin />} />

        {/* Adjudication */}
        <Route path="/adjudication" element={<Adjudication />} />
        <Route path="/adjudication-panel" element={<AdjudicationPanel />} />
      </Routes>
    </Layout>
  );
}