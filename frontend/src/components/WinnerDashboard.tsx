// src/components/WinnerDashboard.tsx
import React, { useEffect, useRef, useState } from "react";

type Winner = {
  employee_id: number;
  employee_name: string;
  photo_url?: string | null;
  revealed?: boolean;
  revealed_at?: string | null;
  citation?: string | null;
};

type ConfettiParticle = {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
};

export default function WinnerDashboard({ initialMonth = "2026-02" }: { initialMonth?: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const confettiRef = useRef<ConfettiParticle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fetchWinner();
    return () => {
      // cleanup RAF on unmount
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function fetchWinner() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/results-final?month=${encodeURIComponent(month)}`, { credentials: "include" });
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || "Failed to load winner");
        setWinner(null);
        setLoading(false);
        return;
      }
      const json = await res.json();
      setWinner(json || null);
      setIsRevealed(Boolean(json?.revealed));
    } catch (err: any) {
      setError(String(err));
      setWinner(null);
    } finally {
      setLoading(false);
    }
  }

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
      if (!res.ok) {
        const txt = await res.text();
        setError(txt || "Failed to reveal winner");
        setLoading(false);
        return;
      }
      const json = await res.json();
      setWinner(json);
      setIsRevealed(true);
      startConfetti();
      announceWinner(json.employee_name);
    } catch (err: any) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function startCountdown(seconds = 5) {
    setCountdown(seconds);
    const interval = setInterval(() => {
      setCountdown((s) => {
        if (s === null) {
          clearInterval(interval);
          return null;
        }
        if (s <= 1) {
          clearInterval(interval);
          revealNow();
          return null;
        }
        return s - 1;
      });
    }, 1000);
  }

  function announceWinner(name: string) {
    const live = document.getElementById("winner-live-region");
    if (live) {
      live.textContent = `And the Employee of the Month is ${name}!`;
    }
  }

  /* -------------------------
     Confetti (canvas) — robust null checks
  ------------------------- */
  function startConfetti() {
    // Respect reduced motion
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const canvas = confettiCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // size canvas safely
    const dpr = window.devicePixelRatio || 1;
    const clientWidth = Math.max(1, canvas.clientWidth);
    const clientHeight = Math.max(1, canvas.clientHeight);
    canvas.width = Math.floor(clientWidth * dpr);
    canvas.height = Math.floor(clientHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // create particles
    confettiRef.current = [];
    const colors = ["#ffb703", "#fb8500", "#219ebc", "#8ecae6", "#ff006e", "#06d6a0"];
    for (let i = 0; i < 120; i++) {
      confettiRef.current.push({
        x: Math.random() * clientWidth,
        y: -Math.random() * 200,
        w: 6 + Math.random() * 10,
        h: 8 + Math.random() * 12,
        vx: -2 + Math.random() * 4,
        vy: 2 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: -0.1 + Math.random() * 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // animate with safe guards
    function step() {
      const canvasNow = confettiCanvasRef.current;
      if (!canvasNow) return;
      const ctxNow = canvasNow.getContext("2d");
      if (!ctxNow) return;

      // clear with safe dimensions
      const w = Math.max(1, canvasNow.clientWidth);
      const h = Math.max(1, canvasNow.clientHeight);
      ctxNow.clearRect(0, 0, w, h);

      confettiRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity
        p.rot += p.vr;
        ctxNow.save();
        ctxNow.translate(p.x, p.y);
        ctxNow.rotate(p.rot);
        ctxNow.fillStyle = p.color;
        ctxNow.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctxNow.restore();
      });

      const active = confettiRef.current.some((p) => p.y < h + 50);
      if (active) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        // final clear
        ctxNow.clearRect(0, 0, w, h);
        rafRef.current = null;
      }
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
  }

  // Small decorative spotlight style
  const spotlightStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: "8%",
    transform: "translateX(-50%)",
    width: 420,
    height: 420,
    borderRadius: "50%",
    background:
      "radial-gradient(circle at 50% 30%, rgba(255,255,230,0.95), rgba(255,255,230,0.6) 30%, rgba(255,255,230,0.15) 60%, transparent 70%)",
    pointerEvents: "none",
    filter: "blur(8px)",
  };

  return (
    <div className="max-w-5xl mx-auto p-6 relative">
      <div
        id="winner-live-region"
        aria-live="polite"
        style={{ position: "absolute", left: -9999, top: "auto", width: 1, height: 1, overflow: "hidden" }}
      />

      <header className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900">Employee of the Month</h1>
        <p className="text-sm text-slate-600 mt-1">
          Month:{" "}
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="ml-2 border rounded px-2 py-1"
            aria-label="Select month"
          />
        </p>
      </header>

      <div className="relative bg-white border rounded-lg p-6 shadow-md overflow-hidden" style={{ minHeight: 260 }}>
        {isRevealed && <div style={spotlightStyle} aria-hidden />}

        <canvas
          ref={confettiCanvasRef}
          style={{ position: "absolute", inset: 0, pointerEvents: "none", width: "100%", height: "100%" }}
          aria-hidden
        />

        {loading && <div className="text-sm text-slate-600">Loading…</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        {!winner && !loading && (
          <div className="py-12 text-center">
            <p className="text-lg font-medium">No winner has been finalised for {month}.</p>
            <p className="text-sm text-slate-600 mt-2">Start adjudication to determine the winner.</p>
          </div>
        )}

        {winner && !isRevealed && (
          <div className="py-12 text-center">
            <p className="text-xl font-semibold text-slate-800">Ready to reveal</p>
            <p className="text-sm text-slate-600 mt-2">When you are ready, reveal the Employee of the Month.</p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => startCountdown(5)} disabled={loading} className="px-4 py-2 bg-crgGold text-white rounded shadow">
                Reveal in 5s
              </button>

              <button onClick={revealNow} disabled={loading} className="px-4 py-2 bg-brandnavy text-white rounded shadow">
                Reveal now
              </button>
            </div>

            {countdown !== null && (
              <div className="mt-4 text-4xl font-extrabold text-slate-900" aria-live="polite">
                {countdown}
              </div>
            )}
          </div>
        )}

        {winner && isRevealed && (
          <div className="py-8 text-center">
            <div
              className="mx-auto w-48 h-48 rounded-full overflow-hidden border-4 border-white shadow-lg"
              style={{ background: "#fff" }}
            >
              {winner.photo_url ? (
                <img src={winner.photo_url} alt={winner.employee_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#f3f4f6" }}>
                  <span className="text-xl font-bold text-slate-700">{winner.employee_name.split(" ").map((n) => n[0]).join("")}</span>
                </div>
              )}
            </div>

            <h2 className="mt-6 text-4xl font-extrabold text-slate-900">{winner.employee_name}</h2>
            {winner.citation && <p className="mt-3 text-lg text-slate-700 max-w-2xl mx-auto">{winner.citation}</p>}

            <div className="mt-6">
              <p className="text-2xl font-semibold text-amber-600">🎉 Congratulations!</p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => {
            setIsRevealed(false);
            fetchWinner();
          }}
          className="px-3 py-2 border rounded"
        >
          Refresh
        </button>

        <button
          onClick={() => {
            setIsRevealed(false);
            setWinner(null);
            fetchWinner();
          }}
          className="px-3 py-2 border rounded"
        >
          Reload
        </button>
      </div>
    </div>
  );
}