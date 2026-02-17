// src/auth.tsx
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * AuthUser
 * - id is optional because the backend may return null when unauthenticated
 * - must_change_password is optional and may be present when the user must change password
 */
export type AuthUser = {
  id?: number;
  email?: string;
  name?: string;
  must_change_password?: boolean;
  role?: string;
  roles?: string[];
} | null;

type AuthContextShape = {
  me: AuthUser;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export function useAuth(): AuthContextShape {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AuthUser>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMe = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const res = await fetch("/auth/me", { credentials: "include", signal });
      if (res.status === 401) {
        setMe(null);
        console.debug("[auth] fetchMe -> 401, set me = null");
        return;
      }

      // Some backends may return empty body for 204; guard against that
      const text = await res.text();
      if (!text) {
        setMe(null);
        console.debug("[auth] fetchMe -> empty body, set me = null");
        return;
      }

      const data = JSON.parse(text);
      // Support both { user: {...} } and direct user object responses
      const user = (data && (data.user ?? data)) ?? null;
      setMe(user);
      console.debug("[auth] fetchMe -> me:", user);
    } catch (err: any) {
      // If aborted, just return silently
      if (err?.name === "AbortError") return;
      // eslint-disable-next-line no-console
      console.error("[auth] fetchMe error", err);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // refresh is a stable function callers can use
  const refresh = useCallback(async () => {
    const controller = new AbortController();
    try {
      await fetchMe(controller.signal);
    } finally {
      controller.abort();
    }
  }, [fetchMe]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchMe(controller.signal);
    return () => {
      controller.abort();
    };
  }, [fetchMe]);

  async function login(email: string, password: string) {
    const res = await fetch("/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      // Try to parse JSON error body, fallback to status text
      const errBody = await res.text().catch(() => "");
      try {
        const parsed = errBody ? JSON.parse(errBody) : null;
        throw new Error(parsed?.error || parsed?.message || res.statusText || "Login failed");
      } catch {
        throw new Error(errBody || res.statusText || "Login failed");
      }
    }

    // Refresh local user state after successful login
    await refresh();
  }

  async function logout() {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[auth] logout error", err);
    } finally {
      setMe(null);
      console.debug("[auth] logout -> set me = null");
    }
  }

  const value: AuthContextShape = {
    me,
    loading,
    refresh,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}