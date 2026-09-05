import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Severity-driven colour, so a tall bar of trivial complaints does not read the
// same as a short bar of dangerous ones.
function severityColor(avg) {
  if (avg >= 4) return "#ef4444";
  if (avg >= 3) return "#f59e0b";
  return "#22c55e";
}

export default function CategoryChart({ complaints, districtName }) {
  // Duplicates are excluded so the chart counts problems, not reports - the
  // same rule the priority score uses.
  const rows = {};
  for (const c of complaints) {
    if (!c.category || c.duplicate_of !== null) continue;
    const r = (rows[c.category] ||= { category: c.category, count: 0, sevSum: 0 });
    r.count += 1;
    r.sevSum += c.severity ?? 0;
  }

  const data = Object.values(rows)
    .map((r) => ({
      category: r.category,
      count: r.count,
      avgSeverity: r.count ? +(r.sevSum / r.count).toFixed(2) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <h2 className="text-sm font-semibold text-slate-200">
        Issues by category
        {districtName && <span className="text-slate-400"> - {districtName}</span>}
      </h2>
      <p className="mb-3 text-xs text-slate-500">
        Bar height is issue count; colour is average severity
      </p>

      {data.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-sm text-slate-500">
          No analysed complaints yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 46, left: -18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis
              dataKey="category"
              angle={-35}
              textAnchor="end"
              interval={0}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              stroke="#475569"
            />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              stroke="#475569"
            />
            <Tooltip
              cursor={{ fill: "#1e293b" }}
              contentStyle={{
                background: "#0f172a",
                border: "1px solid #334155",
                borderRadius: 6,
                fontSize: 12,
                color: "#e2e8f0",
              }}
              formatter={(value, name) =>
                name === "count" ? [value, "Issues"] : [value, name]
              }
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.category} fill={severityColor(d.avgSeverity)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
