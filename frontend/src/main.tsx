// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import { AuthProvider } from "./auth.tsx";   // <-- ADD THIS
import "./index.css";

const rootEl = document.getElementById("root")!;
createRoot(rootEl).render(
  <React.StrictMode>
    <AuthProvider>               {/* <-- WRAP EVERYTHING */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);