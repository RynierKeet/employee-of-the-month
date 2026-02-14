const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwxm5lnwWv2sHID_FVePIKef8uADGJ263b0CPPBH-vnRkvR6-M9cSNnNRKfYKs8omh7dg/exec";
// -----------------------------
// TYPES
// -----------------------------
export interface ReflectionPayload {
  /** optional now — server derives identity from Session.getActiveUser() */
  employeeId?: string;
  month: string;
  reflectionText: string;
}

export interface VotePayload {
  /** optional now — server derives voterId from Session.getActiveUser() */
  voterId?: string;
  /** shape: { [employeeId]: count } or an array is also accepted by server */
  votes: Record<string, number> | Array<{ voteForId: string; motivation?: string }>;
}

export interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  validation?: boolean;
  errors?: Record<string, string>;
  data?: T;
  [key: string]: any;
}

// -----------------------------
// INTERNAL HELPERS
// -----------------------------
/**
 * Perform a POST to Apps Script using a "simple" content type to avoid CORS preflight.
 * Apps Script doPost will receive the JSON string in e.postData.contents.
 */
async function postSimple<T = any>(payload: object): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "cors",
      credentials: "include",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    try {
      return JSON.parse(text) as ApiResponse<T>;
    } catch {
      return { success: res.ok, data: text } as ApiResponse<T>;
    }
  } catch (err: any) {
    console.error("postSimple fetch error:", err);
    return { success: false, error: "Network error" };
  }
}

/**
 * Perform a GET and parse JSON safely.
 */
async function getJson<T = any>(url: string): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    const text = await res.text();
    try {
      return JSON.parse(text) as ApiResponse<T>;
    } catch {
      return { success: res.ok, data: text } as ApiResponse<T>;
    }
  } catch (err: any) {
    console.error("getJson fetch error:", err);
    return { success: false, error: "Network error" };
  }
}

// -----------------------------
// REFLECTIONS
// -----------------------------
export async function submitReflection(
  payload: ReflectionPayload
): Promise<ApiResponse> {
  // payload.employeeId is optional; server will derive identity from the signed-in session
  return postSimple({
    action: "submitReflection",
    ...payload,
  });
}

export async function getReflections(month: string): Promise<ApiResponse<{ reflections: any[] }>> {
  return getJson<{ reflections: any[] }>(
    `${APPS_SCRIPT_URL}?action=getReflections&month=${encodeURIComponent(month)}`
  );
}

// -----------------------------
// VOTING
// -----------------------------
export async function submitVotes(
  payload: VotePayload
): Promise<ApiResponse> {
  // payload.voterId is optional; server will derive voterId from the signed-in session
  return postSimple({
    action: "submitVotes",
    ...payload,
  });
}

export async function getResults(month: string): Promise<ApiResponse<{ results: Record<string, { votes: number; motivations: string[] }> }>> {
  return getJson<{ results: Record<string, { votes: number; motivations: string[] }> }>(
    `${APPS_SCRIPT_URL}?action=getResults&month=${encodeURIComponent(month)}`
  );
}

// -----------------------------
// ADMIN
// -----------------------------
export async function resetMonth(): Promise<ApiResponse> {
  return postSimple({ action: "resetMonth" });
}

// -----------------------------
// EMPLOYEES
// -----------------------------
export interface Employee {
  employeeId: string; // normalized to string for consistent use in <select>
  name: string;
  email: string;
}

/**
 * Fetch the full employee list.
 * Returns an empty array on any error.
 */
export async function getEmployees(): Promise<Employee[]> {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getEmployees`, {
      method: "GET",
      mode: "cors",
      credentials: "omit",
      headers: {
        Accept: "application/json",
      },
    });

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      const employeesRaw = data.employees ?? data.data?.employees ?? [];
      return (employeesRaw || []).map((e: any) => ({
        employeeId: String(e.employeeId ?? e.id ?? ""),
        name: String(e.name ?? ""),
        email: String(e.email ?? ""),
      }));
    } catch (parseErr) {
      console.error("getEmployees: response not JSON", { status: res.status, text });
      return [];
    }
  } catch (err) {
    console.error("getEmployees fetch error:", err);
    return [];
  }
}

/**
 * Fetch a single employee by email.
 * Returns null when not found or on error.
 */
export async function getEmployeeByEmail(email: string): Promise<Employee | null> {
  if (!email) return null;

  try {
    const res = await fetch(
      `${APPS_SCRIPT_URL}?action=getEmployeeByEmail&email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        mode: "cors",
        credentials: "omit",
        headers: {
          Accept: "application/json",
        },
      }
    );

    const text = await res.text();
    try {
      const data = JSON.parse(text);
      const empRaw = data.employee ?? data.data?.employee ?? null;
      if (!empRaw) return null;
      return {
        employeeId: String(empRaw.employeeId ?? empRaw.id ?? ""),
        name: String(empRaw.name ?? ""),
        email: String(empRaw.email ?? ""),
      };
    } catch (parseErr) {
      console.error("getEmployeeByEmail: response not JSON", { status: res.status, text });
      return null;
    }
  } catch (err) {
    console.error("getEmployeeByEmail fetch error:", err);
    return null;
  }
}