// append to src/lib/eomAPI.js

// Helper that accepts a path
async function request(path, opts = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Accept": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  const text = await res.text().catch(() => "");
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  if (!res.ok) throw { status: res.status, body: json ?? text };
  return json;
}

export async function listEmployees() {
  return request("/employees", { method: "GET" });
}

export async function createEmployee(payload) {
  return request("/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteEmployee(id) {
  return request(`/employees/${id}`, { method: "DELETE" });
}