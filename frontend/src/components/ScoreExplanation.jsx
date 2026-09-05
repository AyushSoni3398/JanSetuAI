const FACTOR_COLORS = {
  severity: "#ef4444",
  volume: "#f59e0b",
  infrastructure_deficit: "#8b5cf6",
  population: "#3b82f6",
  investment_gap: "#14b8a6",
};

// Each factor is measured in its own unit. Showing a bare number would make
// "71.6" and "4,801,062" look comparable, so every factor formats itself.
function formatRaw(name, value, district) {
  switch (name) {
    case "severity":
      return `${value.toFixed(2)} out of 5`;
    case "volume":
      return `${value.toFixed(0)} distinct issues`;
    case "infrastructure_deficit":
      return `${value.toFixed(1)} below full provision (index ${district.infrastructure_index.toFixed(1)}/100)`;
    case "population":
      return `${value.toLocaleString()} residents`;
    case "investment_gap":
      return `${value.toFixed(2)} per person committed`;
    default:
      return String(value);
  }
}

const PLAIN_LANGUAGE = {
  severity: "the problems reported here are more dangerous than elsewhere",
  volume: "more separate problems have been reported here than elsewhere",
  infrastructure_deficit: "existing infrastructure is further below full provision than elsewhere",
  population: "more people are affected than in other districts",
  investment_gap: "less public money has been committed per person than elsewhere",
};

export default function ScoreExplanation({ priority, totalDistricts }) {
  if (!priority) {
    return (
      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 px-4 py-6 text-center text-sm text-slate-500">
        Select a district on the map or in the ranking to see why it scores as it does.
      </div>
    );
  }

  const { district, factors, priority_score, rank } = priority;
  const ordered = [...factors].sort((a, b) => b.contribution - a.contribution);
  const top = ordered[0];
  const maxContribution = Math.max(...ordered.map((f) => f.contribution), 0.0001);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800">
      <div className="border-b border-slate-700 px-4 py-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-semibold text-slate-200">
            Why {district.name} ranks #{rank} of {totalDistricts}
          </h2>
          <span className="ml-auto text-2xl font-bold text-slate-100">
            {priority_score.toFixed(1)}
            <span className="ml-1 text-sm font-normal text-slate-500">/ 100</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Largest driver: <span className="text-slate-200">{top.label.toLowerCase()}</span>,
          contributing {top.contribution.toFixed(1)} of the {priority_score.toFixed(1)} points
          &mdash; {PLAIN_LANGUAGE[top.name]}.
        </p>
      </div>

      <div className="space-y-3 px-4 py-4">
        {ordered.map((f) => {
          const share = (f.contribution / priority_score) * 100;
          return (
            <div key={f.name}>
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-medium text-slate-200">{f.label}</span>
                <span className="text-xs text-slate-500">
                  weight {(f.weight * 100).toFixed(0)}%
                </span>
                <span className="ml-auto tabular-nums text-slate-300">
                  {f.contribution.toFixed(1)} pts
                </span>
                <span className="w-12 text-right text-xs tabular-nums text-slate-500">
                  {Number.isFinite(share) ? `${share.toFixed(0)}%` : "-"}
                </span>
              </div>

              {/* Bar length is the points contributed, scaled to the largest
                  factor - so the eye compares drivers, not raw units. */}
              <div className="mt-1 h-2 overflow-hidden rounded bg-slate-700">
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${(f.contribution / maxContribution) * 100}%`,
                    background: FACTOR_COLORS[f.name] ?? "#64748b",
                  }}
                />
              </div>

              <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate-500">
                <span>{formatRaw(f.name, f.raw_value, district)}</span>
                <span className="text-slate-600">
                  ranks {(f.normalized * 100).toFixed(0)}% of the way to the worst in the set
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-700 px-4 py-2 text-xs text-slate-500">
        Scores are <span className="text-slate-400">comparative</span>: each factor is scaled
        against the other {totalDistricts - 1} districts, so this ranks relative need rather
        than measuring need on an absolute scale.
      </div>
    </div>
  );
}
