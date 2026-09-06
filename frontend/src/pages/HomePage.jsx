import { Link } from "react-router-dom";
import { useData } from "../DataContext.jsx";
import { scoreColor } from "../components/DistrictMap.jsx";
import WhatsAppCta from "../components/WhatsAppCta.jsx";

function Stat({ value, label }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-center">
      <div className="text-2xl font-semibold text-slate-100">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

export default function HomePage() {
  const { complaints, priorities, loading } = useData();

  const languages = new Set(complaints.map((c) => c.language).filter(Boolean));
  const distinct = complaints.filter((c) => c.duplicate_of === null).length;
  const top = priorities.slice(0, 3);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="text-center">
        <h2 className="text-3xl font-bold text-slate-50">
          Every complaint counted. Every priority explained.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-slate-400">
          Citizens report infrastructure problems in their own language &mdash; in
          native script or typed in Roman letters. JanSetu detects the language,
          classifies the problem, groups repeat reports, and turns the result into
          a district priority ranking that shows its working.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/report"
            className="rounded bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Report an issue
          </Link>
          <WhatsAppCta variant="inline" />
          <Link
            to="/dashboard"
            className="rounded border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
          >
            Open the dashboard
          </Link>
        </div>
      </section>

      {!loading && (
        <>
          <section className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={complaints.length} label="complaints" />
            <Stat value={distinct} label="distinct issues" />
            <Stat value={priorities.length} label="districts" />
            <Stat value={languages.size} label="languages" />
          </section>

          <section className="mt-10">
            <h3 className="text-sm font-semibold text-slate-200">
              Highest priority right now
            </h3>
            <p className="text-xs text-slate-500">
              Click a district to see exactly why it ranks where it does
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {top.map((p) => (
                <Link
                  key={p.district.id}
                  to={`/districts/${p.district.id}`}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-4 transition-colors hover:border-slate-500"
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-500">#{p.rank}</span>
                    <span
                      className="rounded px-2 py-0.5 text-xs font-semibold text-slate-900"
                      style={{ background: scoreColor(p.priority_score) }}
                    >
                      {p.priority_score.toFixed(1)}
                    </span>
                  </div>
                  <div className="mt-1 font-medium text-slate-100">
                    {p.district.name}
                  </div>
                  <div className="text-xs text-slate-500">{p.district.state}</div>
                  <div className="mt-2 text-xs text-slate-400">
                    {p.complaint_count} issues &middot; avg severity{" "}
                    {p.average_severity.toFixed(2)}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}

      <section className="mt-12">
        <WhatsAppCta />
      </section>

      <section className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          [
            "Any language, any script",
            "Native Devanagari, Bengali and Tamil, or the same words typed in Roman letters. Both are detected, and Hindi is told apart from Marathi.",
          ],
          [
            "Repeat reports are evidence",
            "Ten reports of one pothole are one problem, not ten. Duplicates are grouped and counted as corroboration so a loud issue cannot outrank a needy district.",
          ],
          [
            "The score shows its working",
            "Every ranking breaks down into five weighted factors with the raw numbers behind them, so a department can challenge it rather than take it on faith.",
          ],
        ].map(([title, body]) => (
          <div key={title} className="rounded-lg border border-slate-700 bg-slate-800 p-4">
            <h4 className="text-sm font-semibold text-slate-100">{title}</h4>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
