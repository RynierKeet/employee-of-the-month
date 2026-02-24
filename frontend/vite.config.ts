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
    // Allow overriding port via environment, default to 5175
    port: Number(process.env.PORT ?? 5175),

    // Expose on local network (useful for testing on devices)
    host: true,

    // Proxy backend routes to Express on port 3000
    proxy: {
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      "/employees": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/reflections": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/votes": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/results": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/results-final": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/admin": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/adjudication": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },

      // Proxy voting endpoints (important: your frontend calls /voting/...)
      "/voting": {
        target: "http://localhost:3000",
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