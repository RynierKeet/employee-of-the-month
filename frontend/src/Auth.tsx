// src/auth.tsx
import React, { createContext, useContext, useEffect, useState } from "react";

export type Me = { id?: number; email?: string; must_change_password?: boolean; role?: string; roles?: string[] } | null;

type AuthContextShape = {
  me: Me;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextShape | undefined>(undefined);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void initAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function initAuth() {
    setLoading(true);
    try {
      const res = await fetch("/auth/me", { credentials: "include" });
      if (res.status === 401) {
        setMe(null);
        return;
      }
      const data = await res.json();
      setMe(data);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[auth] initAuth error", err);
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const res = await fetch("/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Login failed" }));
      throw new Error(err.error || "Login failed");
    }

    await initAuth();
  }

  async function logout() {
    try {
      await fetch("/auth/logout", { method: "POST", credentials: "include" });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[auth] logout error", err);
    } finally {
      setMe(null);
    }
  }

  const value: AuthContextShape = {
    me,
    loading,
    refresh: initAuth,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}