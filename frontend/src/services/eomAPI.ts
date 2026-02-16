// ---------------------------------------------
// BASE URL FOR YOUR NODE BACKEND
// ---------------------------------------------
const API_BASE = "http://localhost:3000";

// ---------------------------------------------
// TYPES
// ---------------------------------------------
export interface ReflectionPayload {
  month_key: string;
  reflection_text: string;
}

export interface VotePayload {
  votes: Record<string, number>;
}

export interface Employee {
  id: number;
  name: string;
  email: string;
}

// Generic API response
export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

// ---------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------
async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });

  return res.json();
}

async function postJson<T>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  return res.json();
}

// ---------------------------------------------
// EMPLOYEES
// ---------------------------------------------
export async function getEmployees(): Promise<Employee[]> {
  try {
    const data = await getJson<Employee[]>("/employees");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("getEmployees error:", err);
    return [];
  }
}

// ---------------------------------------------
// REFLECTIONS
// ---------------------------------------------
export async function submitReflection(payload: ReflectionPayload) {
  return postJson("/reflections", payload);
}

export async function getReflections(month_key: string) {
  return getJson(`/reflections?month=${encodeURIComponent(month_key)}`);
}

// ---------------------------------------------
// VOTING
// ---------------------------------------------
export async function submitVotes(payload: VotePayload) {
  return postJson("/votes", payload);
}

export async function getResults(month_key: string) {
  return getJson(`/results?month=${encodeURIComponent(month_key)}`);
}

// ---------------------------------------------
// ADMIN
// ---------------------------------------------
export async function resetMonth() {
  return postJson("/admin/reset", {});
}