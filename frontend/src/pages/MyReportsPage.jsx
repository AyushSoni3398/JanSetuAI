import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { loadMyComplaints, saveMyComplaints } from "../myReports.js";

const STATUS_STYLES = {
  Received: "bg-slate-700 text-slate-300",
  "Under Review": "bg-blue-500/20 text-blue-300",
  Funded: "bg-violet-500/20 text-violet-300",
  Resolved: "bg-green-500/20 text-green-300",
};

const STATUS_ORDER = ["Received", "Under Review", "Funded", "Resolved"];

function StatusTrack({ status }) {
  const current = STATUS_ORDER.indexOf(status);
  return (
    <div className="mt-2 flex items-center gap-2">
      {STATUS_ORDER.map((s, i) => (
        <div key={s} className="flex-1">
          <div
            className={`h-1.5 rounded ${i <= current ? "bg-blue-500" : "bg-slate-700"}`}
          />
          <div
            className={`mt-1 text-[10px] ${
              i === current ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {s}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MyReportsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    const ids = loadMyComplaints();
    if (!ids.length) {
      setRows([]);
      setLoading(false);
      return;
    }
    // A report can vanish if the database is reseeded, so a failed lookup drops
    // that id rather than breaking the whole list.
    const found = (
      await Promise.all(ids.map((id) => api.complaint(id).catch(() => null)))
    ).filter(Boolean);
    setRows(found);
    if (found.length !== ids.length) saveMyComplaints(found.map((c) => c.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function verify(id, confirmed) {
    try {
      await api.verify(id, confirmed);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h2 className="text-base font-semibold text-slate-100">My reports</h2>
      <p className="mt-1 text-xs text-slate-400">
        Stored in this browser &mdash; there are no accounts in this build.
      </p>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {loading ? (
        <p className="mt-8 text-center text-sm text-slate-500">Loading...</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-slate-700 px-4 py-10 text-center">
          <p className="text-sm text-slate-500">
            Nothing submitted from this device yet.
          </p>
          <Link
            to="/report"
            className="mt-3 inline-block rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Report an issue
          </Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-slate-500">#{c.id}</span>
                <span className="font-medium text-slate-300">
                  {c.category ?? "unclassified"}
                </span>
                {c.severity && (
                  <span className="text-slate-400">severity {c.severity}/5</span>
                )}
                <span
                  className={`ml-auto rounded px-1.5 py-0.5 ${
                    STATUS_STYLES[c.status] ?? "bg-slate-700 text-slate-300"
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <p className="mt-1.5 text-sm text-slate-200">{c.text}</p>
              <StatusTrack status={c.status} />

              {c.status === "Resolved" && c.citizen_verified === null && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">
                    The department says this is fixed. Is it?
                  </span>
                  <button
                    onClick={() => verify(c.id, true)}
                    className="rounded border border-green-600/50 bg-green-600/20 px-2 py-0.5 text-xs text-green-300 hover:bg-green-600/30"
                  >
                    Yes, it is fixed
                  </button>
                  <button
                    onClick={() => verify(c.id, false)}
                    className="rounded border border-red-600/50 bg-red-600/20 px-2 py-0.5 text-xs text-red-300 hover:bg-red-600/30"
                  >
                    No, still broken
                  </button>
                </div>
              )}

              {c.citizen_verified === true && (
                <p className="mt-2 text-xs text-green-400">You confirmed this fix.</p>
              )}
              {c.citizen_verified === false && (
                <p className="mt-2 text-xs text-red-400">
                  You reported this as still broken &mdash; it has been reopened.
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
