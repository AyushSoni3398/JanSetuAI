// Where the API lives. Defaults to the local backend so `npm run dev` works
// with no configuration; a deployment sets VITE_API_BASE at build time.
// An empty string means "same origin", which is what the bundled build uses
// when FastAPI serves the frontend itself - hence ?? rather than ||.
//
// Render supplies a bare hostname ("jansetu-api.onrender.com"), so a value
// with no scheme is assumed to be https rather than treated as a relative
// path, which would silently point every call back at the frontend.
const RAW_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";
function resolveBase(value) {
  if (!value) return value; // empty string means same-origin
  if (/^https?:\/\//.test(value)) return value;
  // A bare name with no dot is a Render service name, not a host.
  const host = value.includes(".") ? value : `${value}.onrender.com`;
  return `https://${host}`;
}
const API_BASE = resolveBase(RAW_BASE);

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
  // 5000 is the server-side cap; the seeded corpus sits well under it, so the
  // dashboard sees every complaint rather than an arbitrary first page.
  complaints: () => get("/complaints?limit=5000"),
  analyzePending: () => post("/complaints/analyze-pending?limit=50"),
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
