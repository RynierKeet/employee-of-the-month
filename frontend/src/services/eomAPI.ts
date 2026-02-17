// src/eomAPI.ts
// Lightweight API client for the EOM backend.
// Uses relative URLs so Vite dev server proxy can forward requests.

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

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  data?: T;
  [key: string]: any;
}

type HttpMethod = "GET" | "POST";

async function requestJson<T = any>(path: string, method: HttpMethod = "GET", body?: any): Promise<T> {
  const opts: RequestInit = {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  };

  if (method === "POST") {
    opts.headers = {
      ...(opts.headers || {}),
      "Content-Type": "application/json",
    };
    opts.body = JSON.stringify(body ?? {});
  }

  const res = await fetch(path, opts);

  // 401/403 -> treat as unauthenticated/forbidden
  if (res.status === 401 || res.status === 403) {
    throw new Error(`Unauthorized (${res.status})`);
  }

  // If no content, return null-ish value
  if (res.status === 204) {
    return null as unknown as T;
  }

  const text = await res.text().catch(() => "");
  if (!text) {
    throw new Error(`Empty response from ${path}`);
  }

  try {
    const json = JSON.parse(text) as T;
    return json;
  } catch (err) {
    throw new Error(`Invalid JSON from ${path}`);
  }
}

/* ---------------------------
   EMPLOYEES
   --------------------------- */
export async function getEmployees(): Promise<Employee[]> {
  try {
    // Assumes backend exposes /api/employees or /employees proxied to backend
    const json = await requestJson<ApiResponse<Employee[]>>("/api/employees");
    // Support both { data: [...] } and direct array responses
    if (Array.isArray((json as any).data)) return (json as any).data;
    if (Array.isArray(json as any)) return json as unknown as Employee[];
    return [];
  } catch (err) {
    // Log and return empty array for callers that expect a list
    // eslint-disable-next-line no-console
    console.error("getEmployees error:", err);
    return [];
  }
}

/* ---------------------------
   REFLECTIONS
   --------------------------- */
export async function submitReflection(payload: ReflectionPayload): Promise<ApiResponse> {
  return requestJson<ApiResponse>("/api/reflections", "POST", payload);
}

export async function getReflections(month_key: string): Promise<ApiResponse> {
  const q = `/api/reflections?month=${encodeURIComponent(month_key)}`;
  return requestJson<ApiResponse>(q);
}

/* ---------------------------
   VOTING
   --------------------------- */
export async function submitVotes(payload: VotePayload): Promise<ApiResponse> {
  return requestJson<ApiResponse>("/api/votes", "POST", payload);
}

export async function getResults(month_key: string): Promise<ApiResponse> {
  const q = `/api/results?month=${encodeURIComponent(month_key)}`;
  return requestJson<ApiResponse>(q);
}

/* ---------------------------
   ADMIN
   --------------------------- */
export async function resetMonth(): Promise<ApiResponse> {
  return requestJson<ApiResponse>("/api/admin/reset", "POST", {});
}