const BASE_URL = "YOUR_WEB_APP_URL_HERE";

// Helper for GET requests
async function apiGet(params) {
  const url = ${BASE_URL}?;
  const res = await fetch(url);
  return res.json();
}

// Helper for POST requests
async function apiPost(body) {
  const res = await fetch(BASE_URL, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" }
  });
  return res.json();
}

export async function submitReflection(employeeId, month, reflectionText) {
  return apiPost({
    action: "submitReflection",
    employeeId,
    month,
    reflectionText
  });
}

export async function getReflections(month) {
  return apiGet({
    action: "getReflections",
    month
  });
}

export async function submitVotes(voterId, month, votes) {
  return apiPost({
    action: "submitVotes",
    voterId,
    month,
    votes
  });
}

export async function getResults(month) {
  return apiGet({
    action: "getResults",
    month
  });
}

export async function resetMonth() {
  return apiPost({
    action: "resetMonth"
  });
}
