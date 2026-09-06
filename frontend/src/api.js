const API_BASE = "http://localhost:8000";

async function get(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} on ${path}`);
  return res.json();
}

async function send(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    // The workflow endpoints return 409 with a human-readable reason; surface
    // that instead of a bare status code.
    let detail = `${res.status} ${res.statusText}`;
    try {
      const data = await res.json();
      if (data?.detail) detail = data.detail;
    } catch {
      /* response had no JSON body */
    }
    throw new Error(detail);
  }
  return res.json();
}

const post = (path, body) => send("POST", path, body);

export const api = {
  health: () => get("/health"),
  priorities: () => get("/districts/priority"),
  // 200 is the server-side cap; the seeded set is well under it.
  complaints: () => get("/complaints?limit=200"),
  analyzePending: () => post("/complaints/analyze-pending?limit=200"),
  districts: () => get("/districts"),
  recommendations: () => get("/recommendations?limit=200"),
  districtRecommendations: (id) => get(`/districts/${id}/recommendations`),
  complaint: (id) => get(`/complaints/${id}`),
  createComplaint: (payload) => post("/complaints", payload),
  analyze: (id) => post(`/complaints/${id}/analyze`),
  setStatus: (id, status) => send("PATCH", `/complaints/${id}/status`, { status }),
  verify: (id, confirmed) => post(`/complaints/${id}/verify`, { confirmed }),
};

export { API_BASE };
