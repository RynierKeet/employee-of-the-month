// src/components/ShuffleWall.tsx
import { useEffect, useState } from "react";

type Candidate = {
  employee_id: number;
  name: string;
  photo_url?: string;
};

type Winner = {
  employee_id: number;
  employee_name: string;
  photo_url?: string | null;
};

export default function ShuffleWall({
  nominees,
  winner,
  onComplete,
}: {
  nominees: Candidate[];
  winner: Winner;
  onComplete: () => void;
}) {
  const [order, setOrder] = useState<number[]>([]);
  const [fadeOut, setFadeOut] = useState(false);

  // Shuffle every 120ms, slow down over time
  useEffect(() => {
    if (!nominees.length) return;

    // initial order
    setOrder(nominees.map((_, i) => i));

    let shuffleSpeed = 120;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += shuffleSpeed;

      // random shuffle
      setOrder((prev) => [...prev].sort(() => Math.random() - 0.5));

      // slow down gradually
      shuffleSpeed += 40;

      if (elapsed >= 6000) {
        clearInterval(interval);
        setFadeOut(true);

        // allow fade-out animation to finish
        setTimeout(() => onComplete(), 1500);
      }
    }, shuffleSpeed);

    return () => clearInterval(interval);
  }, [nominees, onComplete]);

  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
          width: "90%",
          maxWidth: "1200px",
        }}
      >
        {order.map((i) => {
          const n = nominees[i];
          const isWinner = n.employee_id === winner.employee_id;

          return (
            <div
              key={n.employee_id}
              className={`
                rounded-lg overflow-hidden shadow-lg transition-all duration-700
                ${fadeOut && !isWinner ? "opacity-0 scale-75" : "opacity-100"}
                ${isWinner && fadeOut ? "scale-110" : ""}
              `}
            >
              <img
                src={n.photo_url}
                alt={n.name}
                className="w-full h-32 object-cover"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}