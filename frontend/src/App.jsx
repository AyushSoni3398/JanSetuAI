import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import CategoryChart from "./components/CategoryChart.jsx";
import CitizenView from "./components/CitizenView.jsx";
import ComplaintFeed from "./components/ComplaintFeed.jsx";
import DistrictMap from "./components/DistrictMap.jsx";
import PriorityTable from "./components/PriorityTable.jsx";
import ScoreExplanation from "./components/ScoreExplanation.jsx";
import StatCards from "./components/StatCards.jsx";

export default function App() {
  const [health, setHealth] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  // "policymaker" is the dashboard; "citizen" is the reporting side. Two
  // audiences, one deployment - a real system would split these.
  const [view, setView] = useState("policymaker");

  const load = useCallback(async () => {
    try {
      const [h, p, c] = await Promise.all([
        api.health(),
        api.priorities(),
        api.complaints(),
      ]);
      setHealth(h);
      setPriorities(p);
      setComplaints(c);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function runAnalysis() {
    setAnalyzing(true);
    try {
      await api.analyzePending();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAnalyzing(false);
    }
  }

  // Selecting a district filters the feed and the chart, but never the map or
  // the ranking - those are the context you are selecting *from*.
  const selected = priorities.find((p) => p.district.id === selectedId) ?? null;
  const visibleComplaints = useMemo(
    () =>
      selectedId === null
        ? complaints
        : complaints.filter((c) => c.district_id === selectedId),
    [complaints, selectedId]
  );

  const pending = complaints.filter((c) => c.category === null).length;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">JanSetu AI</h1>
            <p className="text-xs text-slate-400">
              Citizen complaints to policy priority signals
            </p>
          </div>

          <div className="ml-4 flex rounded border border-slate-600 p-0.5 text-xs">
            {[
              ["policymaker", "Dashboard"],
              ["citizen", "Report an issue"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={`rounded px-2.5 py-1 ${
                  view === key
                    ? "bg-slate-600 text-slate-100"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  health ? "bg-green-500" : "bg-red-500"
                }`}
              />
              API {health?.status ?? "down"}
            </span>
            <span className="text-slate-400">
              DB {health?.database ?? "unknown"}
            </span>
            <span className="rounded bg-slate-700 px-2 py-1 text-slate-300">
              AI: {health?.ai_provider ?? "-"}
            </span>

            {pending > 0 && (
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="rounded bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {analyzing ? "Analysing..." : `Analyse ${pending} pending`}
              </button>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-3 max-w-7xl rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error} - is the backend running on port 8000?
        </div>
      )}

      {view === "citizen" ? (
        <CitizenView />
      ) : (
      <main className="mx-auto max-w-7xl space-y-4 px-4 py-4">
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
              onClick={() => setSelectedId(null)}
              className="ml-auto rounded bg-slate-700 px-2 py-1 text-xs hover:bg-slate-600"
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
          {selected ? (
            <ScoreExplanation
              priority={selected}
              totalDistricts={priorities.length}
            />
          ) : (
            <CategoryChart
              complaints={visibleComplaints}
              districtName={selected?.district.name}
            />
          )}
          <ComplaintFeed
            complaints={visibleComplaints}
            districtName={selected?.district.name}
            onChanged={load}
          />
        </div>
      </main>
      )}
    </div>
  );
}
