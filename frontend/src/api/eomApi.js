// src/lib/eomAPI.js
const BASE_URL = import.meta.env.VITE_API_BASE || ""; // set VITE_API_BASE in your .env (e.g. "http://localhost:3000")

/**
 * Build a query string from an object
 * @param {Object} params
 * @returns {string}
 */
function toQueryString(params = {}) {
  const esc = encodeURIComponent;
  return Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .map((k) => `${esc(k)}=${esc(params[k])}`)
    .join("&");
}

/**
 * Helper for GET requests
 * - includes credentials so cookies are sent
 */
async function apiGet(params = {}) {
  const qs = toQueryString(params);
  const url = qs ? `${BASE_URL}?${qs}` : BASE_URL;
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Accept": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET ${url} failed: ${res.status} ${res.statusText} ${text}`);
  }

  return res.json();
}

/**
 * Helper for POST requests
 * - includes credentials so cookies are sent
 */
async function apiPost(body = {}) {
  const url = BASE_URL;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`POST ${url} failed: ${res.status} ${res.statusText} ${text}`);
  }

  return res.json();
}

/* Exported API functions */
export async function submitReflection(employeeId, month, reflectionText) {
  return apiPost({
    action: "submitReflection",
    employeeId,
    month,
    reflectionText,
  });
}

export async function getReflections(month) {
  return apiGet({
    action: "getReflections",
    month,
  });
}

export async function submitVotes(voterId, month, votes) {
  return apiPost({
    action: "submitVotes",
    voterId,
    month,
    votes,
  });
}

export async function getResults(month) {
  return apiGet({
    action: "getResults",
    month,
  });
}

export async function resetMonth() {
  return apiPost({
    action: "resetMonth",
  });
}