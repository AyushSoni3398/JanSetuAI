// Complaint ids submitted from this browser. There is no auth in this build, so
// "my reports" is per-device. Every access is guarded: private windows and
// blocked site data make localStorage throw rather than return null.
const STORAGE_KEY = "jansetu.my-complaints";

export function loadMyComplaints() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMyComplaints(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* non-fatal: the report still exists on the server */
  }
}

export function addMyComplaint(id) {
  const ids = [id, ...loadMyComplaints().filter((existing) => existing !== id)];
  saveMyComplaints(ids);
  return ids;
}
