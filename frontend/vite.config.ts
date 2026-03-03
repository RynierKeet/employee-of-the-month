// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  server: {
    // Dynamic port
    port: Number(process.env.PORT ?? 5175),

    // Expose on local network
    host: true,

    // Backend handles CORS
    cors: false,

    // Proxy backend routes to HTTP backend
    proxy: {
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
        ws: true,
      },
      "/employees": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/reflections": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/votes": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/results": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/results-final": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/adjudication": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/voting": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },

  preview: {
    port: Number(process.env.PREVIEW_PORT ?? 5175),
    host: true,
  },
});