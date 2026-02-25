// src/hooks/useSound.ts
import { useCallback } from "react";

export default function useSound(src: string, volume = 1) {
  const play = useCallback(() => {
    const audio = new Audio(src);
    audio.volume = volume;
    audio.play().catch(() => {
      // Ignore autoplay restrictions or user gesture errors
    });
  }, [src, volume]);

  return play;
}