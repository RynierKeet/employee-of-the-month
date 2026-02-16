// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../App";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Let the app shell decide final routing (it will redirect to change-password if required).
      // Still navigate to root so protected routes / RequireAuth can take over.
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err && typeof (err as any).message === "string"
          ? (err as any).message
          : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "48px auto", padding: 16 }}>
      <h2>Sign in</h2>

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            required
            autoFocus
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            required
          />
        </div>

        {error && (
          <div role="alert" aria-live="assertive" style={{ color: "crimson", marginBottom: 12 }}>
            {error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "8px 16px",
              background: "#1a2238",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}