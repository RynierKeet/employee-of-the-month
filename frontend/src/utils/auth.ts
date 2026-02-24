// src/utils/auth.ts

export interface AuthUser {
  id?: number;
  name?: string;
  email?: string;
  role?: "Admin" | "Adjudicator" | "Employee";
  roles?: string[];
  must_change_password?: boolean;

  // ⭐ Derived convenience flags
  is_adjudicator?: boolean;
  is_admin?: boolean;
  is_employee?: boolean;
}

/**
 * fetchCurrentUser
 *
 * - Uses a relative URL so the Vite dev server proxy can forward requests to the backend.
 * - Returns the normalized user object or null on 401 / network error / unexpected response.
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("/auth/me", {
      credentials: "include",
    });

    if (res.status === 401) return null;
    if (!res.ok) return null;

    const text = await res.text().catch(() => "");
    if (!text) return null;

    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("application/json")) return null;

    try {
      const json = JSON.parse(text);

      // Support both { user: {...} } and direct user object responses
      const user = (json && (json.user ?? json)) as AuthUser | undefined;
      if (!user) return null;

      // ⭐ Add derived flags based on role
      user.is_adjudicator = user.role === "Adjudicator";
      user.is_admin = user.role === "Admin";
      user.is_employee = user.role === "Employee";

      if (import.meta.env.DEV) {
        console.debug("[utils/auth] fetchCurrentUser ->", {
          status: res.status,
          user,
        });
      }

      return user;
    } catch {
      return null;
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.debug("[utils/auth] fetchCurrentUser error", err);
    }
    return null;
  }
}

/**
 * logout
 *
 * - Calls the backend logout endpoint and ignores network errors (client-side state should still clear).
 */
export async function logout(): Promise<void> {
  try {
    await fetch("/auth/logout", {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // swallow network errors
  }
}