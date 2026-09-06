import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { useData } from "../DataContext.jsx";
import VoiceInput from "../components/VoiceInput.jsx";
import WhatsAppCta from "../components/WhatsAppCta.jsx";
import { addMyComplaint } from "../myReports.js";

const SAMPLES = [
  ["romanised Hindi", "Sadak par bada gaddha hai, roz accident ho rahe hain."],
  ["native Hindi", "नाली का गंदा पानी सड़क पर बह रहा है, बीमारी फैल रही है।"],
  ["romanised Marathi", "Rastyavar khadde padle aahet, durchakki chalavane ashakya jhale aahe."],
  ["native Bengali", "হাসপাতালে ডাক্তার নেই, রোগীদের অনেক দূর যেতে হচ্ছে।"],
  ["native Tamil", "எங்கள் பள்ளிக்கூடம் அருகில் குப்பை குவியல் உள்ளது."],
];

function AnalysisCard({ result }) {
  const { complaint, provider, duplicate_of: duplicateOf } = result;
  const translated =
    complaint.translated_text &&
    complaint.translated_text.replace(/^\[auto\]\s*/, "").trim() !==
      complaint.text.trim()
      ? complaint.translated_text.replace(/^\[auto\]\s*/, "")
      : null;

  return (
    <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-semibold text-slate-100">
          Report #{complaint.id} received
        </h3>
        <span className="rounded bg-slate-700 px-1.5 py-0.5 text-xs text-slate-300">
          analysed by {provider}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
        {[
          ["Language", complaint.language ?? "-"],
          ["Category", complaint.category ?? "-"],
          ["Severity", complaint.severity ? `${complaint.severity} / 5` : "-"],
          ["Urgency", complaint.urgency ? `${complaint.urgency} / 5` : "-"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="text-slate-100">{value}</dd>
          </div>
        ))}
      </dl>

      {translated && (
        <div className="mt-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            English translation
          </div>
          <p className="text-sm text-slate-200">{translated}</p>
        </div>
      )}

      {complaint.ai_summary && (
        <p className="mt-3 text-sm text-slate-300">{complaint.ai_summary}</p>
      )}

      {duplicateOf && (
        <p className="mt-2 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
          This matches report #{duplicateOf}, so it has been grouped with it.
          Repeat reports strengthen the case rather than creating a duplicate entry.
        </p>
      )}

      <Link
        to="/my-reports"
        className="mt-3 inline-block text-xs text-blue-400 hover:text-blue-300"
      >
        Track this in My reports &rarr;
      </Link>
    </div>
  );
}

export default function ReportPage() {
  const { reload } = useData();
  const [districts, setDistricts] = useState([]);
  const [text, setText] = useState("");
  const [locationText, setLocationText] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.districts().then(setDistricts).catch(() => setDistricts([]));
  }, []);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const created = await api.createComplaint({
        text: text.trim(),
        location_text: locationText.trim() || null,
        district_id: districtId ? Number(districtId) : null,
      });

      // Submission and analysis are separate endpoints by design. Chaining them
      // here shows the reporter their classification immediately, but a failure
      // in analysis still leaves the complaint safely stored.
      let analysis;
      try {
        analysis = await api.analyze(created.id);
      } catch {
        analysis = {
          complaint: created,
          provider: "not analysed yet",
          duplicate_of: null,
        };
      }

      setResult(analysis);
      setText("");
      setLocationText("");
      addMyComplaint(created.id);
      await reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <form onSubmit={submit} className="rounded-lg border border-slate-700 bg-slate-800 p-5">
        <h2 className="text-base font-semibold text-slate-100">Report an issue</h2>
        <p className="mt-1 text-xs text-slate-400">
          Write in any language, in its own script or typed in Roman letters. The
          language is detected automatically.
        </p>

        <label className="mt-4 block text-xs uppercase tracking-wide text-slate-400">
          What is the problem?
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
          minLength={5}
          maxLength={5000}
          rows={4}
          placeholder="Sadak par bada gaddha hai..."
          className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
        />

        {/* Speech lands in the same textarea, so the citizen can correct it
            before submitting and the rest of the pipeline is unchanged. */}
        <VoiceInput
          onTranscript={(spoken) =>
            setText((current) => (current ? current + " " + spoken : spoken))
          }
        />

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-slate-500">Try:</span>
          {SAMPLES.map(([label, sample]) => (
            <button
              key={label}
              type="button"
              onClick={() => setText(sample)}
              className="rounded border border-slate-600 px-1.5 py-0.5 text-xs text-slate-400 hover:bg-slate-700"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              Location (optional)
            </label>
            <input
              value={locationText}
              onChange={(e) => setLocationText(e.target.value)}
              maxLength={255}
              placeholder="Ward 7, Main Bazaar Road"
              className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-400">
              District
            </label>
            <select
              value={districtId}
              onChange={(e) => setDistrictId(e.target.value)}
              className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Not sure</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}, {d.state}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || text.trim().length < 5}
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-40"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>

        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {result && <AnalysisCard result={result} />}
      </form>

      <div className="mt-6">
        <p className="mb-3 text-center text-xs uppercase tracking-wide text-slate-500">
          or report without opening this site
        </p>
        <WhatsAppCta />
      </div>
    </main>
  );
}
