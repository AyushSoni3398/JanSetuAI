import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import RecommendationList from "../components/RecommendationList.jsx";
import { useData } from "../DataContext.jsx";
import CategoryChart from "../components/CategoryChart.jsx";
import ComplaintFeed from "../components/ComplaintFeed.jsx";
import ScoreExplanation from "../components/ScoreExplanation.jsx";
import NotFoundPage from "./NotFoundPage.jsx";

export default function DistrictPage() {
  const { districtId } = useParams();
  const { complaints, priorities, loading, reload } = useData();
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    api
      .districtRecommendations(districtId)
      .then(setRecommendations)
      .catch(() => setRecommendations([]));
  }, [districtId]);

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center text-slate-400">
        Loading district...
      </main>
    );
  }

  const id = Number(districtId);
  const priority = priorities.find((p) => p.district.id === id);
  if (!priority) return <NotFoundPage />;

  const { district, rank } = priority;
  const mine = complaints.filter((c) => c.district_id === id);

  // Ranking is comparative, so the neighbours either side give the score
  // context that a single number cannot.
  const above = priorities.find((p) => p.rank === rank - 1);
  const below = priorities.find((p) => p.rank === rank + 1);

  return (
    <main className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <nav className="text-xs text-slate-500">
        <Link to="/dashboard" className="hover:text-slate-300">
          Dashboard
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-400">{district.name}</span>
      </nav>

      <header className="flex flex-wrap items-end gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-50">{district.name}</h2>
          <p className="text-sm text-slate-400">{district.state}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-4 text-sm">
          {[
            ["Rank", `#${rank} of ${priorities.length}`],
            ["Priority score", priority.priority_score.toFixed(1)],
            ["Distinct issues", priority.complaint_count],
            ["Repeat reports", priority.duplicate_reports],
            ["Population", district.population.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-xs uppercase tracking-wide text-slate-500">
                {label}
              </div>
              <div className="text-slate-100">{value}</div>
            </div>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-2 text-xs">
        {above && (
          <Link
            to={`/districts/${above.district.id}`}
            className="rounded border border-slate-700 px-2.5 py-1 text-slate-400 hover:bg-slate-800"
          >
            &larr; #{above.rank} {above.district.name} ({above.priority_score.toFixed(1)})
          </Link>
        )}
        {below && (
          <Link
            to={`/districts/${below.district.id}`}
            className="rounded border border-slate-700 px-2.5 py-1 text-slate-400 hover:bg-slate-800"
          >
            #{below.rank} {below.district.name} ({below.priority_score.toFixed(1)}) &rarr;
          </Link>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreExplanation priority={priority} totalDistricts={priorities.length} />
        <CategoryChart complaints={mine} districtName={district.name} />
      </div>

      <section>
        <h3 className="text-sm font-semibold text-slate-200">
          Recommended projects for {district.name}
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          What the complaint pattern here implies should be built
        </p>
        <RecommendationList items={recommendations} showDistrict={false} />
      </section>

      <ComplaintFeed
        complaints={mine}
        districtName={district.name}
        onChanged={reload}
      />
    </main>
  );
}
