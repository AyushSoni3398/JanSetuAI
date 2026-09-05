import { useEffect, useState } from "react";

const API_BASE = "http://localhost:8000";

export default function App() {
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  const dbOk = health?.database === "connected";

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl bg-slate-800 p-8 shadow-lg">
        <h1 className="text-2xl font-bold">JanSetu AI</h1>
        <p className="mt-1 text-sm text-slate-400">
          Citizen complaints into policy signals
        </p>

        <div className="mt-6 space-y-3 text-sm">
          <Row
            label="Backend API"
            ok={Boolean(health)}
            value={health ? health.status : error ? "unreachable" : "checking..."}
          />
          <Row
            label="Database"
            ok={dbOk}
            value={health ? health.database : error ? "unknown" : "checking..."}
          />
        </div>

        {error && (
          <p className="mt-4 text-xs text-red-400">
            {error} - is the backend running on port 8000?
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, ok, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
      <span className="text-slate-300">{label}</span>
      <span className={ok ? "text-green-400" : "text-amber-400"}>{value}</span>
    </div>
  );
}
