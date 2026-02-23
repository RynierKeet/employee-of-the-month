// src/auth.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * AuthUser
 * Matches your backend's /auth/me response shape.
 */
export type AuthUser = {
  id: number;
  email: string;
  name?: string;
  role: string;
  must_change_password?: boolean;
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

  /**
   * Fetch the current authenticated user.
   * If 401 → user is logged out.
   */
  const fetchMe = useCallback(async () => {
    try {
      const res = await fetch("/auth/me", { credentials: "include" });

      if (!res.ok) {
        setMe(null);
        console.debug("[auth] fetchMe -> 401 or error, set me = null");
        return;
      }

      const text = await res.text();
      if (!text) {
        setMe(null);
        console.debug("[auth] fetchMe -> empty body, set me = null");
        return;
      }

      const data = JSON.parse(text);
      const user = data.user ?? data ?? null;

      setMe(user);
      console.debug("[auth] fetchMe -> me:", user);
    } catch (err) {
      console.error("[auth] fetchMe error", err);
      setMe(null);
    }
  }, []);

  /**
   * Public refresh() API
   */
  const refresh = useCallback(async () => {
    await fetchMe();
  }, [fetchMe]);

  /**
   * Load session on mount
   */
  useEffect(() => {
    (async () => {
      await fetchMe();
      setLoading(false);
    })();
  }, [fetchMe]);

  /**
   * Login
   */
  async function login(email: string, password: string) {
    const res = await fetch("/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      try {
        const parsed = errBody ? JSON.parse(errBody) : null;
        throw new Error(
          parsed?.error || parsed?.message || res.statusText || "Login failed"
        );
      } catch {
        throw new Error(errBody || res.statusText || "Login failed");
      }
    }

    // Refresh user state after login
    await refresh();
  }

  /**
   * Logout
   * - Backend destroys session
   * - Frontend clears local state
   */
  async function logout() {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("[auth] logout error", err);
    } finally {
      setMe(null); // <-- critical fix
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