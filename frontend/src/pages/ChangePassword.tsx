// src/pages/ChangePassword.tsx
import React, { useState } from "react";

type Props = {
  onDone?: () => void;
};

export default function ChangePassword({ onDone }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/auth/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({ error: "Failed to change password" }));
        setError(payload.error || "Failed to change password");
        return;
      }

      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Give the server a moment to update session flags, then notify parent to refresh auth state
      setTimeout(() => {
        if (onDone) onDone();
      }, 250);
    } catch (err) {
      setError("Network error while changing password.");
      // eslint-disable-next-line no-console
      console.error("ChangePassword error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: "24px auto", padding: 16 }}>
      <h2>Change Password</h2>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            required
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ display: "block", marginBottom: 6 }}>Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            required
          />
        </div>

        {error && (
          <div style={{ color: "crimson", marginBottom: 12 }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ color: "green", marginBottom: 12 }}>
            {success}
          </div>
        )}

        <div>
          <button type="submit" disabled={loading} style={{ padding: "8px 16px" }}>
            {loading ? "Saving…" : "Save new password"}
          </button>
        </div>
      </form>
    </div>
  );
}