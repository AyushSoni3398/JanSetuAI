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

// The mock analyser cannot translate and returns "[auto] " + the original.
// Strip that marker first, then decide whether what remains actually differs
// from the source text - otherwise the same sentence renders twice.
function translationOf(complaint) {
  if (!complaint.translated_text) return null;
  const cleaned = complaint.translated_text.replace(/^\[auto\]\s*/, "").trim();
  return cleaned && cleaned !== complaint.text.trim() ? cleaned : null;
}

export default function ComplaintFeed({ complaints, districtName }) {
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

        {rows.map((c) => {
          const translation = translationOf(c);
          return (
            <div key={c.id} className="px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 text-xs font-medium ${
                  SEVERITY_STYLES[c.severity] ?? "border-slate-600 bg-slate-700 text-slate-400"
                }`}
              >
                {c.severity ? `S${c.severity}` : "unrated"}
              </span>
              <span className="text-xs font-medium text-slate-300">
                {c.category ?? "unclassified"}
              </span>
              {c.language && (
                <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs uppercase text-slate-400">
                  {c.language}
                </span>
              )}
              <span
                className={`ml-auto rounded px-1.5 py-0.5 text-xs ${
                  STATUS_STYLES[c.status] ?? "bg-slate-700 text-slate-300"
                }`}
              >
                {c.status}
              </span>
            </div>

            <p className="mt-1.5 text-sm text-slate-200">{c.text}</p>

            {/* Only show the translation when it adds something. The mock
                analyser cannot translate and returns "[auto] " + original, so
                the marker has to be stripped BEFORE comparing - otherwise the
                same sentence is printed twice. */}
            {translation && (
              <p className="mt-1 text-xs italic text-slate-400">{translation}</p>
            )}

            <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
              {c.location_text && <span>{c.location_text}</span>}
              <span>{new Date(c.timestamp).toLocaleDateString()}</span>
              {c.duplicate_count > 0 && (
                <span className="text-amber-500/80">
                  +{c.duplicate_count} repeat report
                  {c.duplicate_count > 1 ? "s" : ""}
                </span>
              )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
