import { Link } from "react-router-dom";

const SECTOR_COLORS = {
  Roads: "#f59e0b",
  Water: "#3b82f6",
  Sanitation: "#84cc16",
  Power: "#eab308",
  Transport: "#a855f7",
  Health: "#ef4444",
  Drainage: "#14b8a6",
  Lighting: "#f97316",
  Assessment: "#64748b",
};

export default function RecommendationList({ items, showDistrict = true }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-sm text-slate-500">
        No project recommendations yet. Categories need at least two distinct
        complaints before they count as a pattern worth funding.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((r, index) => (
        <div
          key={`${r.district.id}-${r.category}`}
          className="rounded-lg border border-slate-700 bg-slate-800 p-4"
        >
          <div className="flex flex-wrap items-start gap-2">
            <span className="mt-0.5 text-xs text-slate-600">#{index + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-900"
                  style={{ background: SECTOR_COLORS[r.sector] ?? "#64748b" }}
                >
                  {r.sector}
                </span>
                <h3 className="text-sm font-semibold text-slate-100">
                  {r.project}
                </h3>
              </div>

              {showDistrict && (
                <Link
                  to={`/districts/${r.district.id}`}
                  className="mt-0.5 inline-block text-xs text-slate-400 hover:text-blue-400"
                >
                  {r.district.name}, {r.district.state} &middot; district rank #
                  {r.district_rank}
                </Link>
              )}

              <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
                {r.rationale}
              </p>
            </div>

            <div className="text-right">
              <div className="text-lg font-bold text-slate-100">
                {r.score.toFixed(1)}
              </div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                priority
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-700/60 pt-2 text-xs text-slate-500">
            <span>
              <span className="text-slate-300">{r.issue_count}</span> distinct issues
            </span>
            {r.repeat_reports > 0 && (
              <span>
                <span className="text-slate-300">{r.repeat_reports}</span> repeat
                reports
              </span>
            )}
            <span>
              severity <span className="text-slate-300">{r.average_severity.toFixed(1)}</span>/5
            </span>
            <span>
              ~<span className="text-slate-300">{r.people_affected.toLocaleString()}</span>{" "}
              people
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
