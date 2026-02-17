// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Login page
 *
 * Flow:
 * 1. Ensure employee record exists by POST /employees (creates if missing).
 * 2. POST /auth/login with credentials included so the server can set a session cookie.
 * 3. Poll /auth/me until the session is recognized (works around cookie race).
 * 4. If server indicates first-time user (must_change_password), redirect to /change-password.
 * 5. On success, navigate to the original destination.
 *
 * Notes:
 * - This component assumes your backend exposes POST /employees to create an employee
 *   and POST /auth/login + GET /auth/me for authentication.
 * - All fetches use credentials: "include" so HttpOnly session cookies are accepted/sent.
 */

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll /auth/me until server recognizes the session (or timeout)
  async function pollForSession(maxAttempts = 12, delayMs = 300) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const meRes = await fetch("/auth/me", { credentials: "include" });
        if (meRes.ok) {
          return { ok: true, json: await meRes.json().catch(() => null) };
        }
      } catch {
        // ignore and retry
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return { ok: false, json: null };
  }

  // Ensure employee exists in the employees table (backend should create if missing)
  async function ensureEmployee(emailAddress: string) {
    try {
      // POST /employees should create an employee when given minimal data.
      // Adjust payload to match your backend's create employee contract.
      const res = await fetch("/employees", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress }),
      });

      // If backend returns 409 or similar for existing employee, treat as success.
      if (res.ok || res.status === 409) {
        return true;
      }

      // If backend returns validation error, surface it.
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Failed to ensure employee (${res.status})`);
    } catch (err) {
      // Non-fatal: we still attempt login, but surface a warning to the user.
      console.warn("ensureEmployee failed:", err);
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setSubmitting(true);

    try {
      // 1) Ensure employee exists (best-effort)
      await ensureEmployee(trimmedEmail);

      // 2) Attempt login
      const res = await fetch("/auth/login", {
        method: "POST",
        credentials: "include", // critical so browser accepts/sends session cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      let body: any = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      if (!res.ok) {
        const msg = body?.error ?? body?.message ?? `Login failed (${res.status})`;
        setError(msg);
        setSubmitting(false);
        return;
      }

      // If backend indicates the user must change password immediately, redirect.
      if (body?.mustChangePassword || body?.must_change_password) {
        navigate("/change-password", { replace: true, state: { from } });
        return;
      }

      // 3) Poll /auth/me until session is usable
      const poll = await pollForSession(12, 300);
      if (poll.ok) {
        // Full reload ensures cookie is attached and app boots authenticated.
        // Use navigate if you prefer SPA navigation, but reload is more robust for cookie races.
        window.location.href = from;
        return;
      }

      setError(
        "Login succeeded but session was not established. Try again or contact an administrator."
      );
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-4">Sign in</h2>

      <p className="text-sm text-slate-600 mb-4">
        Enter the email address stored in the employee directory and your password.
        First-time users: the temporary password is <strong>Temp1234!</strong>
      </p>

      {error && (
        <div role="alert" className="mb-4 rounded px-3 py-2 text-white bg-red-600" aria-live="assertive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? "login-error" : undefined}>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
            disabled={submitting}
            className="w-full border px-3 py-2 rounded"
            placeholder="you@company.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={submitting}
            className="w-full border px-3 py-2 rounded"
            placeholder="Enter your password"
          />
        </div>

        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={submitting}
            className="bg-crgBlue text-white px-4 py-2 rounded disabled:opacity-60"
            aria-disabled={submitting}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </div>
  );
}