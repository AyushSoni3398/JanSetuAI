import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useData } from "../DataContext.jsx";

const NAV = [
  { to: "/", label: "Home", end: true },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/recommendations", label: "Projects" },
  { to: "/report", label: "Report an issue" },
  { to: "/my-reports", label: "My reports" },
];

function NavItem({ to, label, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `rounded px-3 py-1.5 text-xs font-medium transition-colors ${
          isActive
            ? "bg-slate-700 text-slate-50"
            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { health, error } = useData();
  const [scrolled, setScrolled] = useState(false);

  // The header gains a border and blur once the page moves, so it separates
  // from the content instead of floating on top of it.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const dbOk = health?.database === "connected";

  return (
    <div className="flex min-h-screen flex-col text-slate-100">
      <header
        className={`sticky top-0 z-[500] transition-all ${
          scrolled
            ? "border-b border-slate-700/80 bg-slate-900/85 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
          <NavLink to="/" className="group shrink-0">
            <h1 className="text-lg font-bold tracking-tight">
              Jan<span className="text-blue-400">Setu</span> AI
            </h1>
            <p className="text-[11px] text-slate-400 transition-colors group-hover:text-slate-300">
              Every voice, on the map
            </p>
          </NavLink>

          <nav className="flex flex-wrap rounded-lg border border-slate-700/70 bg-slate-800/50 p-1 backdrop-blur-sm">
            {NAV.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-3 w-full max-w-7xl rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error} &mdash; is the backend running on port 8000?
        </div>
      )}

      <div className="flex-1">
        <Outlet />
      </div>

      <footer className="mt-12 border-t border-slate-800 bg-slate-900/60">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-xs text-slate-500">
          <span className="font-medium text-slate-400">JanSetu AI</span>
          <span>An open Digital Public Good for citizen-led infrastructure planning</span>

          <div className="ml-auto flex flex-wrap items-center gap-4">
            <a
              href="https://github.com/AyushSoni3398/JanSetuAI"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-300"
            >
              MIT licensed &middot; source on GitHub
            </a>
            {/* Kept out of the header but not thrown away: the provider badge
                is how you tell at a glance whether the real model is running. */}
            <span
              className="flex items-center gap-1.5"
              title={`API ${health?.status ?? "down"} · database ${health?.database ?? "unknown"}`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  health && dbOk ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {health ? `AI: ${health.ai_provider}` : "offline"}
            </span>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-5 text-[11px] text-slate-600">
          Demonstration deployment. District figures and complaint history are
          synthetic; complaints submitted here are real and analysed live.
        </div>
      </footer>
    </div>
  );
}
