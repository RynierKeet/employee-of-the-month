// src/TestApp.tsx
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";

function LoginTest() {
  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "48px auto", background: "#fff" }}>
      <h2>TEST LOGIN PAGE</h2>
      <p>If you see this, the router can match <code>/login</code>.</p>
    </div>
  );
}

function RootTest() {
  return (
    <div style={{ padding: 24, maxWidth: 640, margin: "48px auto", background: "#fff" }}>
      <h2>TEST ROOT PAGE</h2>
      <p>If you see this, the router can match <code>/</code>.</p>
    </div>
  );
}

function DebugLocation() {
  const loc = useLocation();
  return (
    <div style={{ position: "fixed", right: 8, top: 8, background: "#fff", padding: 6, zIndex: 999, border: "1px solid #ddd" }}>
      <strong>location:</strong> {loc.pathname}
    </div>
  );
}

export default function TestApp() {
  return (
    <BrowserRouter>
      <DebugLocation />
      <div style={{ padding: 12 }}>
        <Link to="/login" style={{ marginRight: 12 }}>Go /login</Link>
        <Link to="/">Go /</Link>
      </div>

      <Routes>
        <Route path="/login" element={<LoginTest />} />
        <Route path="/" element={<RootTest />} />
        <Route path="*" element={<div style={{ padding: 24 }}>FALLBACK</div>} />
      </Routes>
    </BrowserRouter>
  );
}