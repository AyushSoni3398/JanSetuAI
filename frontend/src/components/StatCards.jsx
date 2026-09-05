function Card({ label, value, sub, tone = "slate" }) {
  const tones = {
    slate: "text-slate-100",
    red: "text-red-400",
    amber: "text-amber-400",
    green: "text-green-400",
  };
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${tones[tone]}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export default function StatCards({ complaints, priorities }) {
  const total = complaints.length;
  const canonical = complaints.filter((c) => c.duplicate_of === null).length;
  const unanalyzed = complaints.filter((c) => c.category === null).length;

  const severities = complaints
    .filter((c) => c.severity !== null && c.duplicate_of === null)
    .map((c) => c.severity);
  const avgSeverity = severities.length
    ? (severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(2)
    : "-";

  const critical = priorities.filter((p) => p.priority_score >= 70).length;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Card
        label="Complaints"
        value={total}
        sub={`${canonical} distinct, ${total - canonical} duplicates`}
      />
      <Card label="Districts" value={priorities.length} sub="under monitoring" />
      <Card
        label="Avg severity"
        value={avgSeverity}
        sub="of distinct issues, out of 5"
        tone={avgSeverity >= 4 ? "red" : avgSeverity >= 3 ? "amber" : "slate"}
      />
      <Card
        label="High priority"
        value={critical}
        sub="districts scoring 70+"
        tone={critical > 0 ? "red" : "green"}
      />
      <Card
        label="Awaiting analysis"
        value={unanalyzed}
        sub={unanalyzed ? "queued for the AI pass" : "queue is clear"}
        tone={unanalyzed > 0 ? "amber" : "green"}
      />
    </div>
  );
}
