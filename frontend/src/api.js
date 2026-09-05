const API_BASE = "http://localhost:8000";

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json();
}

async function post(path) {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST" });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json();
}

export const api = {
  health: () => get("/health"),
  priorities: () => get("/districts/priority"),
  // 200 is the server-side cap; the seeded set is well under it.
  complaints: () => get("/complaints?limit=200"),
  analyzePending: () => post("/complaints/analyze-pending?limit=200"),
};

export { API_BASE };
