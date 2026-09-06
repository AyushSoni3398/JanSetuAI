import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import RecommendationList from "../components/RecommendationList.jsx";

export default function RecommendationsPage() {
  const [items, setItems] = useState([]);
  const [sector, setSector] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .recommendations()
      .then(setItems)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const sectors = useMemo(
    () => [...new Set(items.map((r) => r.sector))].sort(),
    [items]
  );
  const visible = sector ? items.filter((r) => r.sector === sector) : items;

  const people = visible.reduce((sum, r) => sum + r.people_affected, 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h2 className="text-xl font-bold text-slate-50">
        Recommended development projects
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-400">
        Derived from clustered citizen complaints, weighted by severity, how many
        distinct issues were reported, and how badly the district needs
        investment. Every recommendation carries the evidence behind it.
      </p>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {!loading && items.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSector("")}
            className={`rounded px-2.5 py-1 text-xs ${
              sector === "" ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            All sectors
          </button>
          {sectors.map((s) => (
            <button
              key={s}
              onClick={() => setSector(s)}
              className={`rounded px-2.5 py-1 text-xs ${
                sector === s ? "bg-slate-600 text-slate-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {s}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-500">
            {visible.length} projects &middot; ~{people.toLocaleString()} people affected
          </span>
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading...</p>
        ) : (
          <RecommendationList items={visible} />
        )}
      </div>
    </main>
  );
}
