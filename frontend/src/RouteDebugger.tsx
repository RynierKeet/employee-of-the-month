// src/RouteDebugger.tsx
import { useEffect } from "react";
import { useLocation, useMatches } from "react-router-dom";

export default function RouteDebugger(): null {
  const loc = useLocation();
  const matches = useMatches();

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.debug(
      "[RouteDebugger] pathname:",
      loc.pathname,
      "matches:",
      matches.map((m) => m.pathname ?? m.id ?? "(no-path)")
    );
  }, [loc, matches]);

  return null;
}