import { useCallback, useEffect, useState } from "react";
import { api } from "../api.js";

// Complaint ids the citizen submitted from this browser. There is no auth in
// this build, so "my reports" is per-device rather than per-account.
const STORAGE_KEY = "jansetu.my-complaints";

function loadMine() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return []; // private window, cleared storage, or storage blocked
  }
}

function saveMine(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* non-fatal: the report still exists on the server */
  }
}

const SAMPLES = [
  "Sadak par bada gaddha hai, roz accident ho rahe hain.",
  "Rastyavar khadde padle aahet, durchakki chalavane ashakya jhale aahe.",
  "Amader elakay pray protidin bidyut chole jay, jol o thake na.",
  "Do hafte se nal me paani nahi aaya. Poora mohalla pareshan hai.",
];

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
    <div className="mt-2 flex items-center gap-1">
      {STATUS_ORDER.map((s, i) => (
        <div key={s} className="flex flex-1 items-center gap-1">
          <div
            className={`h-1.5 flex-1 rounded ${
              i <= current ? "bg-blue-500" : "bg-slate-700"
            }`}
            title={s}
          />
          {i === STATUS_ORDER.length - 1 && (
            <span className="ml-1 whitespace-nowrap text-[10px] text-slate-500">
              {status}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function AnalysisCard({ result }) {
  const { complaint, provider, duplicate_of: duplicateOf } = result;
  return (
    <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-semibold text-slate-100">
          Report #{complaint.id} received
        </h3>
        <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
          analysed by {provider}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {[
          ["Language", complaint.language ?? "-"],
          ["Category", complaint.category ?? "-"],
          ["Severity", complaint.severity ? `${complaint.severity} / 5` : "-"],
          ["Urgency", complaint.urgency ? `${complaint.urgency} / 5` : "-"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>

      {complaint.ai_summary && (
        <p className="mt-3 text-sm text-slate-300">{complaint.ai_summary}</p>
      )}

      {duplicateOf && (
        <p className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
          This looks like the same issue as report #{duplicateOf}, so it has been
          grouped with it. Repeat reports strengthen the case rather than
          creating a duplicate entry.
        </p>
      )}

      <p className="mt-3 text-xs text-slate-500">
        Track it under &ldquo;My reports&rdquo; below.
      </p>
    </div>
  );
}

export default function CitizenView() {
  const [districts, setDistricts] = useState([]);
  const [text, setText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [mine, setMine] = useState([]);

  const refreshMine = useCallback(async () => {
    const ids = loadMine();
    if (!ids.length) {
      setMine([]);
      return;
    }
    // A report can vanish if the database is reseeded, so a failed lookup
    // drops that id rather than breaking the whole list.
    const rows = await Promise.all(
      ids.map((id) => api.complaint(id).catch(() => null))
    );
    const found = rows.filter(Boolean);
    setMine(found);
    if (found.length !== ids.length) saveMine(found.map((c) => c.id));
  }, []);

  useEffect(() => {
    api.districts().then(setDistricts).catch(() => setDistricts([]));
    refreshMine();
  }, [refreshMine]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const created = await api.createComplaint({
        text: text.trim(),
        location_text: locationText.trim() || null,
        district_id: districtId ? Number(districtId) : null,
      });

      // Submission and analysis are separate endpoints by design (M3). The
      // citizen form chains them so the reporter sees the classification
      // immediately, but a failure here still leaves a stored complaint.
      let analysis;
      try {
        analysis = await api.analyze(created.id);
      } catch {
        analysis = { complaint: created, provider: "not analysed yet", duplicate_of: null };
      }

      setResult(analysis);
      setText("");
      setLocationText("");

      const ids = [created.id, ...loadMine().filter((id) => id !== created.id)];
      saveMine(ids);
      await refreshMine();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verify(id, confirmed) {
    try {
      await api.verify(id, confirmed);
      await refreshMine();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <form onSubmit={submit} className="rounded-lg border border-slate-700 bg-slate-800 p-5">
        <h2 className="text-base font-semibold text-slate-100">Report an issue</h2>
        <p className="mt-1 text-xs text-slate-400">
          Write in any language &mdash; Hindi, Marathi, Tamil, Bengali or English.
          The language is detected automatically.
        </p>

        <label className="mt-4 block text-xs uppercase tracking-wide text-slate-400">
          What is the problem?
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          minLength={5}
          maxLength={5000}
          rows={4}
          placeholder="Sadak par bada gaddha hai..."
          className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
        />

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">Try:</span>
          {SAMPLES.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => setText(s)}
              className="rounded border border-slate-600 px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-700"
            >
              sample {i + 1}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              Location (optional)
            </label>
            <input
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              maxLength={255}
              placeholder="Ward 7, Main Bazaar Road"
              className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              District
            </label>
            <select
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Not sure</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}, {d.state}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || text.trim().length < 5}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {result && <AnalysisCard result={result} />}
      </form>

      <div className="rounded-lg border border-slate-700 bg-slate-800">
        <div className="border-b border-slate-700 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-200">My reports</h2>
          <p className="text-xs text-slate-500">
            Stored in this browser &mdash; there are no accounts in this build.
          </p>
        </div>

        {mine.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-slate-500">
            Nothing submitted from this device yet.
          </p>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {mine.map((c) => (
              <div key={c.id} className="px-5 py-3">
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

                <p className="mt-1 text-sm text-slate-200">{c.text}</p>
                <StatusTrack status={c.status} />

                {c.status === "Resolved" && c.citizen_verified === null && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
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
      </div>
    </div>
  );
}
