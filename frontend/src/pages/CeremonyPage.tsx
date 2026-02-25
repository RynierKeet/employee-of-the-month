// src/pages/CeremonyPage.tsx
import { useEffect, useState } from "react";
import ShuffleWall from "../components/ShuffleWall";
import ShimmerLayer from "../components/ShimmerLayer";
import ConfettiBurst from "../components/ConfettiBurst";
import useSound from "../hooks/useSound";

type Winner = {
  employee_id: number;
  employee_name: string;
  photo_url?: string | null;
  revealed?: boolean;
  revealed_at?: string | null;
  citation?: string | null;
};

type Candidate = {
  employee_id: number;
  name: string;
  photo_url?: string;
};

export default function CeremonyPage() {
  const month = "2026-02";

  const [winner, setWinner] = useState<Winner | null>(null);
  const [nominees, setNominees] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRevealed, setIsRevealed] = useState(false);
  const [showShuffle, setShowShuffle] = useState(false);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showWinner, setShowWinner] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  /* -----------------------------------------------------
     SOUND EFFECTS (using your actual filenames)
  ----------------------------------------------------- */
  const playDrumroll = useSound("/sounds/entrance-drum beat.wav", 0.5);
  const playSpotlight = useSound("/sounds/mixkit-fast-whoosh-tra.wav", 0.8);
  const playApplause = useSound("/sounds/applause.flac", 0.9);
  const playChime = useSound("/sounds/gentle chime tree.wav", 0.6);

  /* -----------------------------------------------------
     Load winner + nominees
  ----------------------------------------------------- */
  useEffect(() => {
    loadWinner();
    loadNominees();
  }, []);

  async function loadWinner() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/results-final?month=${month}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to load winner");
        setWinner(null);
        setLoading(false);
        return;
      }
      setWinner(json);
      setIsRevealed(Boolean(json?.revealed));
    } catch (err: any) {
      setError(String(err));
      setWinner(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadNominees() {
    try {
      const res = await fetch(`/results?month=${month}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (Array.isArray(json)) setNominees(json);
    } catch {
      setNominees([]);
    }
  }

  /* -----------------------------------------------------
     Reveal logic
  ----------------------------------------------------- */
  async function revealNow() {
    if (!winner) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/results-final/reveal", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month_key: month }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to reveal winner");
        setLoading(false);
        return;
      }

      setWinner(json);
      setIsRevealed(true);

      /* -----------------------------------------------------
         B: Spotlight + shimmer + whoosh
      ----------------------------------------------------- */
      playSpotlight();
      setShowSpotlight(true);

      /* -----------------------------------------------------
         C: Camera zoom + winner reveal + chime
      ----------------------------------------------------- */
      setTimeout(() => {
        setShowWinner(true);
        playChime();
      }, 1500);

      /* -----------------------------------------------------
         A: Confetti + applause
      ----------------------------------------------------- */
      setTimeout(() => {
        playApplause();
        setShowConfetti(true);
      }, 1800);

    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  /* -----------------------------------------------------
     HERO LANDING PAGE
  ----------------------------------------------------- */
  if (!showShuffle && !isRevealed) {
    if (!winner || !winner.employee_id) {
      return (
        <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
          <h1 className="text-4xl font-extrabold mb-6 text-center">
            Employee of the Month Ceremony
          </h1>

          <p className="text-xl text-gray-300 mb-4">
            Adjudication for {month} is not yet finalised.
          </p>

          <p className="text-lg text-gray-500">
            Please return once the adjudication panel has completed the process.
          </p>
        </div>
      );
    }

    return (
      <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-4xl font-extrabold mb-6 text-center">
          Employee of the Month Ceremony
        </h1>

        <p className="text-xl text-gray-300 mb-8">
          The Employee of the Month for {month} has been chosen.
        </p>

        <button
          onClick={() => {
            playDrumroll();
            setShowShuffle(true);
          }}
          className="px-10 py-4 bg-yellow-500 text-black rounded-xl text-2xl font-bold shadow-lg hover:bg-yellow-400 transition"
        >
          Begin Ceremony
        </button>
      </div>
    );
  }

  /* -----------------------------------------------------
     SHUFFLE WALL PHASE
  ----------------------------------------------------- */
  if (showShuffle && !isRevealed) {
    return (
      <div className="w-full min-h-screen bg-black text-white relative overflow-hidden">
        <ShuffleWall
          nominees={nominees}
          winner={winner!}
          onComplete={() => revealNow()}
        />
      </div>
    );
  }

  /* -----------------------------------------------------
     SPOTLIGHT + WINNER REVEAL
  ----------------------------------------------------- */
  return (
    <div className="w-full min-h-screen bg-black text-white flex flex-col items-center justify-center relative overflow-hidden">

      {/* Gold shimmer */}
      {showSpotlight && <ShimmerLayer />}

      {/* Spotlight overlay */}
      {showSpotlight && (
        <div
          className="absolute inset-0 transition-all duration-[1500ms]"
          style={{
            background:
              "radial-gradient(circle at 50% 30%, rgba(255,255,230,0.9), rgba(0,0,0,0.95) 60%)",
            opacity: showWinner ? 0.2 : 1,
          }}
        />
      )}

      {/* Confetti */}
      {showConfetti && <ConfettiBurst />}

      {loading && (
  <div className="absolute top-4 text-slate-300 text-sm">Loading…</div>
)}

      {error && (
      <div className="absolute top-4 text-red-400 text-sm">{error}</div>
      )}

      {/* Winner reveal */}
      {showWinner && winner && (
        <div className="text-center relative z-10 animate-fade-in">
          <div className="w-64 h-64 mx-auto rounded-full overflow-hidden border-4 border-yellow-400 shadow-2xl animate-camera-zoom">
            {winner.photo_url ? (
              <img
                src={winner.photo_url}
                alt={winner.employee_name}
                className="w-full h-full object-cover blur-sm animate-unblur"
              />
            ) : (
              <div className="w-full h-full bg-gray-700 flex items-center justify-center text-4xl font-bold">
                {winner.employee_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
            )}
          </div>

          <h2 className="mt-8 text-6xl font-extrabold text-yellow-400 tracking-wide animate-slide-up">
            {winner.employee_name}
          </h2>

          {winner.citation && (
            <p className="mt-6 text-2xl max-w-2xl mx-auto text-gray-200 animate-fade-in-slow">
              {winner.citation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}