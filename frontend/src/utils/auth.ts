export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "Admin" | "Adjudicator" | "Employee";
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch("http://localhost:3000/auth/me", {
      credentials: "include",
    });

    if (!res.ok) return null;

    const json = await res.json();
    return json.user as AuthUser;
  } catch {
    return null;
  }
}

export async function logout() {
  await fetch("http://localhost:3000/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}