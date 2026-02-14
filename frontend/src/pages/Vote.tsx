import { useEffect, useState } from "react";
import { InfoIcon } from "../components/InfoIcon";
import { Modal } from "../components/Modal";
import { ReflectionGuidelines } from "../components/ReflectionGuidelines";

interface Employee {
  id: number;
  name: string;
}

export default function Vote() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [yourId, setYourId] = useState<number | "">("");
  const [voteForId, setVoteForId] = useState<number | "">("");
  const [month, setMonth] = useState("2026-02");
  const [motivation, setMotivation] = useState("");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | "warning" | "info"
  >("info");

  const [loading, setLoading] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  // Adjudicators cannot vote in normal mode
  const EXCLUDED_IDS = [7, 10];

  useEffect(() => {
    fetch("http://localhost:3000/employees")
      .then((res) => res.json())
      .then((data) => setEmployees(data))
      .catch(() => {
        setMessage("Failed to load employees.");
        setMessageType("error");
      });
  }, []);

  const handleSubmit = async () => {
    setMessage("");
    setMessageType("info");

    if (!yourId) {
      setMessage("Please select your name.");
      setMessageType("warning");
      return;
    }

    if (!voteForId) {
      setMessage("Please select who you want to vote for.");
      setMessageType("warning");
      return;
    }

    if (!motivation.trim()) {
      setMessage("Please provide a motivation for your vote.");
      setMessageType("warning");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voter_id: yourId,
          vote_for_id: voteForId,
          month_key: month,
          motivation,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setMessage("Vote submitted successfully.");
        setMessageType("success");
        setVoteForId("");
        setMotivation("");
      } else {
        setMessage(data.error || "Failed to submit vote.");
        setMessageType("error");
      }
    } catch (err) {
      console.error("submitVote error:", err);
      setMessage("Server error while submitting vote.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const allowedVoters = employees.filter((emp) => !EXCLUDED_IDS.includes(emp.id));

  const messageColor =
    messageType === "error"
      ? "text-red-500"
      : messageType === "success"
      ? "text-green-600"
      : messageType === "warning"
      ? "text-amber-600"
      : "text-slate-700";

  return (
    <div className="bg-white shadow-card border border-slate-200 rounded-card p-8 space-y-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-slate-900">
        Vote for Employee of the Month
      </h2>

      {loading && <p className="text-sm text-slate-700">Submitting…</p>}

      {message && (
        <p className={`text-sm font-medium ${messageColor}`}>{message}</p>
      )}

      {/* Month */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-800">Month</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full border border-slate-300 rounded-card px-3 py-2 
                     focus:outline-none focus:ring-2 focus:ring-crgGold"
        />
      </div>

      {/* Voter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-800">
          Your Name
        </label>
        <select
          value={yourId}
          onChange={(e) => setYourId(Number(e.target.value))}
          className="w-full border border-slate-300 rounded-card px-3 py-2 
                     focus:outline-none focus:ring-2 focus:ring-crgGold"
        >
          <option value="">Select your name</option>
          {allowedVoters.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </div>

      {/* Vote For */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-800">
          Vote For
        </label>
        <select
          value={voteForId}
          onChange={(e) => setVoteForId(Number(e.target.value))}
          className="w-full border border-slate-300 rounded-card px-3 py-2 
                     focus:outline-none focus:ring-2 focus:ring-crgGold"
        >
          <option value="">Select employee</option>
          {employees
            .filter((e) => e.id !== yourId)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
        </select>
      </div>

      {/* Motivation + InfoIcon */}
      <div className="space-y-2">
        <div className="flex items-center">
          <label className="block text-sm font-medium text-slate-800">
            Motivation
          </label>
          <InfoIcon
            onClick={() => setGuidelinesOpen(true)}
            title="Voting Guidelines"
          />
        </div>

        <textarea
          value={motivation}
          onChange={(e) => setMotivation(e.target.value)}
          rows={4}
          className="w-full border border-slate-300 rounded-card px-3 py-2 
                     focus:outline-none focus:ring-2 focus:ring-crgGold"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="px-6 py-3 rounded-card font-medium text-white bg-brandnavy 
                   hover:bg-slate-800 hover:text-crgGold transition"
      >
        Submit Vote
      </button>

      {/* Guidelines Modal */}
      <Modal
        open={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
        title="Voting Guidelines"
      >
        <ReflectionGuidelines />
      </Modal>
    </div>
  );
}