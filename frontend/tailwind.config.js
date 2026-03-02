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
        gold: "#e6c98b",        // Champagne gold
        brandnavy: "#0f172a",   // Deep navy
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
        "gold-glow": "0 0 20px rgba(212, 175, 55, 0.4)",
      },

      backgroundImage: {
        "radial-spot":
          "radial-gradient(circle at center, rgba(255,255,255,0.12), transparent 70%)",
      },

      animation: {
        fadeIn: "fadeIn 0.8s ease-out",
        slowFade: "fadeIn 1.6s ease-out",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};