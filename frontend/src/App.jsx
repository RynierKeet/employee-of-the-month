import { Routes, Route, Link } from "react-router-dom";
import SubmitReflection from "./pages/SubmitReflection.jsx";
import Vote from "./pages/Vote.jsx";
import ViewReflections from "./pages/ViewReflections.jsx";
import Results from "./pages/Results.jsx";
import Admin from "./pages/Admin.jsx";

export default function App() {
  return (
    <div className="p-6">
      <nav className="mb-6 flex gap-4">
        <Link to="/submit-reflection" className="text-blue-600 underline">
          Submit Reflection
        </Link>
        <Link to="/vote" className="text-blue-600 underline">
          Vote
        </Link>
        <Link to="/view-reflections" className="text-blue-600 underline">
          View Reflections
        </Link>
        <Link to="/results" className="text-blue-600 underline">
          Results
        </Link>
        <Link to="/admin" className="text-blue-600 underline">
          Admin
        </Link>
      </nav>

      <Routes>
        <Route path="/" element={<SubmitReflection />} />
        <Route path="/submit-reflection" element={<SubmitReflection />} />
        <Route path="/vote" element={<Vote />} />
        <Route path="/view-reflections" element={<ViewReflections />} />
        <Route path="/results" element={<Results />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </div>
  );
}