// src/pages/ChangePassword.tsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth";

export default function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from?.pathname ?? "/";

  function validatePassword(pw: string) {
    if (!pw || pw.length < 8) {
      return "Password must be at least 8 characters.";
    }
    if (!/[A-Z]/.test(pw)) {
      return "Password must include at least one uppercase letter.";
    }
    if (!/[a-z]/.test(pw)) {
      return "Password must include at least one lowercase letter.";
    }
    if (!/[0-9]/.test(pw)) {
      return "Password must include at least one number.";
    }
    if (!/[!@#$%^&*()_\-+=[\]{};:'"\\|,.<>/?]/.test(pw)) {
      return "Password must include at least one special character.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords must match.");
      return;
    }

    const validationError = validatePassword(password);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: undefined, // endpoint expects currentPassword for some flows; backend accepts session user
          newPassword: password,
          confirmPassword: confirm,
        }),
      });

      if (!res.ok) {
        // try to parse JSON error, fallback to text
        let msg = "Failed to change password";
        try {
          const json = await res.json();
          msg = json?.error ?? json?.message ?? msg;
        } catch {
          const txt = await res.text().catch(() => "");
          if (txt) msg = txt;
        }
        throw new Error(msg);
      }

      // Refresh auth state so must_change_password clears
      try {
        await refresh();
      } catch (refreshErr) {
        // non-fatal: continue to navigate even if refresh fails
        console.warn("Failed to refresh auth after password change", refreshErr);
      }

      // Navigate to original destination (or root)
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <h2 className="text-2xl font-semibold mb-4">Change Password</h2>

      <form onSubmit={handleSubmit} className="space-y-4" aria-describedby={error ? "change-password-error" : undefined}>
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium mb-1">
            New password
          </label>
          <input
            id="new-password"
            name="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            autoComplete="new-password"
            disabled={saving}
            aria-required
          />
        </div>

        <div>
          <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirm-password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            autoComplete="new-password"
            disabled={saving}
            aria-required
          />
        </div>

        <div className="text-sm text-gray-600">
          Password must be at least 8 characters and include uppercase, lowercase, number, and special character.
        </div>

        {error && (
          <div id="change-password-error" role="alert" className="text-red-600">
            {error}
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={saving}
            className="bg-crgBlue text-white px-4 py-2 rounded disabled:opacity-60"
            aria-disabled={saving}
          >
            {saving ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </div>
  );
}