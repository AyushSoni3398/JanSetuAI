import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { useData } from "../DataContext.jsx";
import CategoryChart from "../components/CategoryChart.jsx";
import ComplaintFeed from "../components/ComplaintFeed.jsx";
import DistrictMap from "../components/DistrictMap.jsx";
import PriorityTable from "../components/PriorityTable.jsx";
import StatCards from "../components/StatCards.jsx";

export default function DashboardPage() {
  const { complaints, priorities, loading, reload } = useData();
  const [selectedId, setSelectedId] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const navigate = useNavigate();

  // Selecting filters in place; the "full explanation" link goes to the
  // district's own page, which is shareable.
  const selected = priorities.find((p) => p.district.id === selectedId) ?? null;
  const visible = useMemo(
    () =>
      selectedId === null
        ? complaints
        : complaints.filter((c) => c.district_id === selectedId),
    [complaints, selectedId]
  );

  const pending = complaints.filter((c) => c.category === null).length;

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      await api.analyzePending();
      await reload();
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading dashboard...
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-slate-100">
          Policymaker dashboard
        </h2>
        {pending > 0 && (
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="ml-auto rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {analyzing ? "Analysing..." : `Analyse ${pending} pending`}
          </button>
        )}
      </div>

      <StatCards complaints={complaints} priorities={priorities} />

      {selected && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm">
          <span className="text-slate-400">Filtered to</span>
          <span className="font-semibold text-slate-100">
            {selected.district.name}, {selected.district.state}
          </span>
          <span className="text-slate-400">
            rank #{selected.rank} &middot; score {selected.priority_score.toFixed(1)}
          </span>
          <button
            onClick={() => navigate(`/districts/${selected.district.id}`)}
            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500"
          >
            Full explanation
          </button>
          <button
            onClick={() => setSelectedId(null)}
            className="rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
          >
            Clear filter
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <DistrictMap
          priorities={priorities}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
        <PriorityTable
          priorities={priorities}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryChart complaints={visible} districtName={selected?.district.name} />
        <ComplaintFeed
          complaints={visible}
          districtName={selected?.district.name}
          onChanged={reload}
        />
      </div>
    </main>
  );
}
