import { useState } from "react";
import { api } from "../api.js";

const SEVERITY_STYLES = {
  5: "bg-red-500/15 text-red-300 border-red-500/30",
  4: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  3: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  2: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  1: "bg-green-500/15 text-green-300 border-green-500/30",
};

const STATUS_STYLES = {
  Received: "bg-slate-700 text-slate-300",
  "Under Review": "bg-blue-500/20 text-blue-300",
  Funded: "bg-violet-500/20 text-violet-300",
  Resolved: "bg-green-500/20 text-green-300",
};

// Mirrors workflow_service.STATUS_ORDER. The server is still the authority -
// it re-validates every transition and returns 409 with a reason - but knowing
// the order here means we only render buttons that can actually succeed.
const STATUS_ORDER = ["Received", "Under Review", "Funded", "Resolved"];

// Where the complaint came in from. Shown so the multi-channel intake is
// visible rather than only asserted.
const SOURCE_LABELS = {
  whatsapp: "WhatsApp",
  voice: "Voice",
  web: "Web",
};

function allowedTransitions(status) {
  const index = STATUS_ORDER.indexOf(status);
  if (index === -1) return STATUS_ORDER;
  if (status === "Resolved") return ["Under Review"];
  return STATUS_ORDER.slice(index + 1);
}

// The mock analyser cannot translate and returns "[auto] " + the original.
// Strip that marker first, then decide whether what remains actually differs
// from the source text - otherwise the same sentence renders twice.
function translationOf(complaint) {
  if (!complaint.translated_text) return null;
  const cleaned = complaint.translated_text.replace(/^\[auto\]\s*/, "").trim();
  return cleaned && cleaned !== complaint.text.trim() ? cleaned : null;
}

function VerificationBadge({ complaint }) {
  if (complaint.citizen_verified === true) {
    return (
      <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-300">
        Citizen confirmed
      </span>
    );
  }
  if (complaint.citizen_verified === false) {
    return (
      <span className="rounded bg-red-500/20 px-1.5 py-0.5 text-xs text-red-300">
        Citizen disputed
      </span>
    );
  }
  if (complaint.status === "Resolved") {
    return (
      <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">
        Awaiting citizen confirmation
      </span>
    );
  }
  return null;
}

function Row({ complaint, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const translation = translationOf(complaint);
  const transitions = allowedTransitions(complaint.status);

  async function run(action) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-1.5 py-0.5 text-xs font-medium ${
            SEVERITY_STYLES[complaint.severity] ??
            "border-slate-600 bg-slate-700 text-slate-400"
          }`}
        >
          {complaint.severity ? `S${complaint.severity}` : "unrated"}
        </span>
        <span className="text-xs font-medium text-slate-300">
          {complaint.category ?? "unclassified"}
        </span>
        {complaint.language && (
          <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs uppercase text-slate-400">
            {complaint.language}
          </span>
        )}
        {complaint.source && (
          <span className="rounded border border-slate-600 px-1.5 py-0.5 text-xs text-slate-400">
            {SOURCE_LABELS[complaint.source] ?? complaint.source}
          </span>
        )}
        <span
          className={`ml-auto rounded px-1.5 py-0.5 text-xs ${
            STATUS_STYLES[complaint.status] ?? "bg-slate-700 text-slate-300"
          }`}
        >
          {complaint.status}
        </span>
      </div>

      <p className="mt-1.5 text-sm text-slate-200">{complaint.text}</p>

      {/* Only shown when the translation actually differs from the original. */}
      {translation && (
        <p className="mt-1 text-xs italic text-slate-400">{translation}</p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        {complaint.location_text && <span>{complaint.location_text}</span>}
        <span>{new Date(complaint.timestamp).toLocaleDateString()}</span>
        {complaint.duplicate_count > 0 && (
          <span className="text-amber-500/80">
            +{complaint.duplicate_count} repeat report
            {complaint.duplicate_count > 1 ? "s" : ""}
          </span>
        )}
        <VerificationBadge complaint={complaint} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {transitions.map((next) => (
          <button
            key={next}
            disabled={busy}
            onClick={() => run(() => api.setStatus(complaint.id, next))}
            className="rounded border border-slate-600 bg-slate-700/60 px-2 py-0.5 text-xs text-slate-200 hover:bg-slate-600 disabled:opacity-40"
          >
            {complaint.status === "Resolved" ? "Reopen" : `Mark ${next}`}
          </button>
        ))}

        {/* Citizen actions appear only on a claimed fix with no verdict yet. */}
        {complaint.status === "Resolved" && complaint.citizen_verified === null && (
          <>
            <span className="ml-1 text-xs text-slate-500">Citizen:</span>
            <button
              disabled={busy}
              onClick={() => run(() => api.verify(complaint.id, true))}
              className="rounded border border-green-600/50 bg-green-600/20 px-2 py-0.5 text-xs text-green-300 hover:bg-green-600/30 disabled:opacity-40"
            >
              Confirm fixed
            </button>
            <button
              disabled={busy}
              onClick={() => run(() => api.verify(complaint.id, false))}
              className="rounded border border-red-600/50 bg-red-600/20 px-2 py-0.5 text-xs text-red-300 hover:bg-red-600/30 disabled:opacity-40"
            >
              Still broken
            </button>
          </>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function ComplaintFeed({ complaints, districtName, onChanged }) {
  // Most severe first, then newest - a policymaker scanning this wants the
  // worst thing at the top, not the most recent trivial one.
  const rows = [...complaints]
    .filter((c) => c.duplicate_of === null)
    .sort(
      (a, b) =>
        (b.severity ?? 0) - (a.severity ?? 0) ||
        new Date(b.timestamp) - new Date(a.timestamp)
    )
    .slice(0, 40);

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">
          Complaints
          {districtName && <span className="text-slate-400"> - {districtName}</span>}
        </h2>
        <p className="text-xs text-slate-500">
          Most severe first &middot; showing {rows.length} of {complaints.length}
        </p>
      </div>

      <div className="max-h-[520px] divide-y divide-slate-700/50 overflow-y-auto">
        {rows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No complaints for this selection
          </div>
        )}
        {rows.map((c) => (
          <Row key={c.id} complaint={c} onChanged={onChanged} />
        ))}
      </div>
    </div>
  );
}
