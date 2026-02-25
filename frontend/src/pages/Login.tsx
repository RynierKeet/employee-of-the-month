// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Login page with two-phase flow:
 * 1. Credentials → POST /auth/login
 * 2. Role selection → POST /auth/select-role
 *
 * Fully compatible with your existing session polling logic.
 */

type Role = "Admin" | "Adjudicator" | "Employee";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  // Phase control
  const [phase, setPhase] = useState<"credentials" | "role">("credentials");

  // Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Role selection
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | "">("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Poll /auth/me until session cookie is active */
  async function pollForSession(maxAttempts = 12, delayMs = 300) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const meRes = await fetch("/auth/me", { credentials: "include" });
        if (meRes.ok) {
          return { ok: true, json: await meRes.json().catch(() => null) };
        }
      } catch {}
      await new Promise((r) => setTimeout(r, delayMs));
    }
    return { ok: false, json: null };
  }

  /** Phase 1: Submit credentials */
  async function handleCredentialsSubmit(e: React.FormEvent) {
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
      const res = await fetch("/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      let body: any = null;
      try {
        body = await res.json();
      } catch {}

      if (!res.ok) {
        const msg = body?.error ?? body?.message ?? `Login failed (${res.status})`;
        setError(msg);
        setSubmitting(false);
        return;
      }

      // Must change password?
      if (body?.mustChangePassword || body?.must_change_password) {
        navigate("/change-password", { replace: true, state: { from } });
        return;
      }

      // NEW: Role selection phase
      const roles = body?.availableRoles ?? [];
      if (!Array.isArray(roles) || roles.length === 0) {
        setError("No roles available for this user.");
        setSubmitting(false);
        return;
      }

      setAvailableRoles(roles);
      setSelectedRole(roles[0]);
      setPhase("role");
      setSubmitting(false);
      return;
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
      setSubmitting(false);
    }
  }

  /** Phase 2: Submit selected role */
  async function handleRoleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/auth/select-role", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: selectedRole }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        const msg = body?.error ?? "Failed to select role";
        setError(msg);
        setSubmitting(false);
        return;
      }

      // After selecting role, poll session to ensure override is active
      const poll = await pollForSession(12, 300);
      if (!poll.ok) {
        setError("Role selected but session not established. Try again.");
        setSubmitting(false);
        return;
      }

      // Redirect based on role
      if (selectedRole === "Adjudicator") {
        window.location.href = "/app/adjudication";
        return;
      }
      if (selectedRole === "Admin") {
        window.location.href = "/app/admin";
        return;
      }

      // Employee
      window.location.href = "/app/submit-reflection";
    } catch (err: any) {
      setError(err?.message ?? "Failed to select role");
    } finally {
      setSubmitting(false);
    }
  }

  // ---------------------------
  // Phase 2 UI: Role selection
  // ---------------------------
  if (phase === "role") {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-4">Select your role</h2>

        {error && (
          <div className="mb-4 rounded px-3 py-2 text-white bg-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleRoleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              className="w-full border px-3 py-2 rounded"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as Role)}
              disabled={submitting}
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-crgBlue text-white px-4 py-2 rounded disabled:opacity-60"
          >
            {submitting ? "Continuing…" : "Continue"}
          </button>
        </form>
      </div>
    );
  }

  // ---------------------------
  // Phase 1 UI: Credentials
  // ---------------------------
  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-4">Sign in</h2>

      <p className="text-sm text-slate-600 mb-4">
        Enter the email address stored in the employee directory and your password.
        First-time users: the temporary password is <strong>Temp1234!</strong>
      </p>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded px-3 py-2 text-white bg-red-600"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleCredentialsSubmit}
        className="space-y-4"
        aria-describedby={error ? "login-error" : undefined}
      >
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