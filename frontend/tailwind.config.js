/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        crgBlue: "#1a2238",     // Deep CRG navy
        crgGold: "#d4af37",     // CRG gold
        crgSilver: "#cfcfcf",   // Silver accent
        gold: "#e6c98b",        // Your champagne gold
        brandnavy: "#0f172a",   // Your deep navy
      },
      fontFamily: {
        crg: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        crg: "0.5rem",
        card: "6px",
      },
      boxShadow: {
        card: "0 2px 6px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};