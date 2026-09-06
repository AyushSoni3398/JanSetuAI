import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { scoreColor } from "./DistrictMap.jsx";

const COLUMNS = [
  { key: "rank", label: "#", align: "left", value: (p) => p.rank, asc: true },
  { key: "name", label: "District", align: "left", value: (p) => p.district.name, asc: true },
  { key: "issues", label: "Issues", align: "right", value: (p) => p.complaint_count },
  { key: "severity", label: "Severity", align: "right", value: (p) => p.average_severity },
  { key: "score", label: "Score", align: "right", value: (p) => p.priority_score },
];

export default function PriorityTable({ priorities, selectedId, onSelect }) {
  const [sortKey, setSortKey] = useState("rank");
  const [ascending, setAscending] = useState(true);

  const sorted = useMemo(() => {
    const column = COLUMNS.find((c) => c.key === sortKey) ?? COLUMNS[0];
    const rows = [...priorities].sort((a, b) => {
      const av = column.value(a);
      const bv = column.value(b);
      if (typeof av === "string") return av.localeCompare(bv);
      return av - bv;
    });
    return ascending ? rows : rows.reverse();
  }, [priorities, sortKey, ascending]);

  function toggle(column) {
    if (column.key === sortKey) {
      setAscending((v) => !v);
    } else {
      setSortKey(column.key);
      // Text sorts read better A-Z; numbers read better highest-first.
      setAscending(Boolean(column.asc));
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
      <div className="border-b border-slate-700 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-200">District priority ranking</h2>
        <p className="text-xs text-slate-500">
          Weighted: severity 30%, volume 25%, infrastructure 20%, population 15%, investment 10%
        </p>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-800 text-xs uppercase tracking-wide text-slate-500">
            <tr className="border-b border-slate-700">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  onClick={() => toggle(column)}
                  title={`Sort by ${column.label}`}
                  className={`cursor-pointer select-none px-3 py-2 font-medium hover:text-slate-300 ${
                    column.align === "right" ? "text-right" : "text-left"
                  } ${sortKey === column.key ? "text-slate-300" : ""}`}
                >
                  {column.label}
                  <span className="ml-1 text-[9px]">
                    {sortKey === column.key ? (ascending ? "▲" : "▼") : "⇅"}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => {
              const selected = p.district.id === selectedId;
              return (
                <tr
                  key={p.district.id}
                  onClick={() => onSelect(p.district.id)}
                  className={`cursor-pointer border-b border-slate-700/50 transition-colors ${
                    selected ? "bg-slate-700" : "hover:bg-slate-700/40"
                  }`}
                >
                  <td className="px-3 py-2 text-slate-500">{p.rank}</td>
                  <td className="px-3 py-2">
                    {/* Stops the row click so the name opens the district page
                        rather than only filtering the dashboard. */}
                    <Link
                      to={`/districts/${p.district.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-slate-100 hover:text-blue-400 hover:underline"
                    >
                      {p.district.name}
                    </Link>
                    <div className="text-xs text-slate-500">{p.district.state}</div>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {p.complaint_count}
                    {p.duplicate_reports > 0 && (
                      <span className="ml-1 text-xs text-slate-500">
                        +{p.duplicate_reports}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-slate-300">
                    {p.average_severity.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className="inline-block min-w-[3rem] rounded px-2 py-0.5 text-right text-xs font-semibold text-slate-900"
                      style={{ background: scoreColor(p.priority_score) }}
                    >
                      {p.priority_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-700 px-4 py-2 text-xs text-slate-500">
        Issues counts distinct problems; +n is repeat reports of the same issue.
      </div>
    </div>
  );
}
