// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    // Keep your dynamic port logic
    port: Number(process.env.PORT ?? 5175),

    // Expose on local network (unchanged)
    host: true,

    // ⭐ Enable HTTPS using mkcert certificates
    https: {
      key: fs.readFileSync(path.join(__dirname, "certs", "localhost-key.pem")),
      cert: fs.readFileSync(path.join(__dirname, "certs", "localhost.pem")),
    },

    // ⭐ Disable Vite’s own CORS — backend handles it
    cors: false,

    // ⭐ Proxy backend routes to your HTTPS backend
    proxy: {
      "/auth": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/employees": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/reflections": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/votes": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/results": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/results-final": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/admin": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/adjudication": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/voting": {
        target: "https://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    port: Number(process.env.PREVIEW_PORT ?? 5175),
    host: true,
  },
});