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
        `rounded px-2.5 py-1 text-xs transition-colors ${
          isActive
            ? "bg-slate-600 text-slate-100"
            : "text-slate-400 hover:text-slate-200"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Layout() {
  const { health, error } = useData();

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="border-b border-slate-700 bg-slate-800">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <NavLink to="/" className="shrink-0">
            <h1 className="text-lg font-bold">JanSetu AI</h1>
            <p className="text-xs text-slate-400">
              Citizen complaints to policy priority signals
            </p>
          </NavLink>

          <nav className="ml-4 flex rounded border border-slate-600 p-0.5">
            {NAV.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  health ? "bg-green-500" : "bg-red-500"
                }`}
              />
              API {health?.status ?? "down"}
            </span>
            <span className="text-slate-400">DB {health?.database ?? "unknown"}</span>
            <span className="rounded bg-slate-700 px-2 py-1 text-slate-300">
              AI: {health?.ai_provider ?? "-"}
            </span>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto mt-3 max-w-7xl rounded border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
          {error} - is the backend running on port 8000?
        </div>
      )}

      <Outlet />

      <footer className="mt-8 border-t border-slate-800 py-5 text-center text-xs text-slate-600">
        JanSetu AI &middot; hackathon build &middot; synthetic data
      </footer>
    </div>
  );
}
