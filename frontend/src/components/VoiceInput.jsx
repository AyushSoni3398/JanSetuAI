import { useEffect, useState } from "react";
import { isBraveBrowser, useSpeechRecognition } from "../useSpeechRecognition.js";

// Recognition needs to be told which language to expect - it cannot detect that
// before it listens. The citizen picks once; everything after is automatic.
// These BCP-47 tags return NATIVE script for the Indic languages.
const LANGUAGES = [
  { tag: "hi-IN", label: "हिन्दी", english: "Hindi" },
  { tag: "mr-IN", label: "मराठी", english: "Marathi" },
  { tag: "bn-IN", label: "বাংলা", english: "Bengali" },
  { tag: "ta-IN", label: "தமிழ்", english: "Tamil" },
  { tag: "en-IN", label: "English", english: "English" },
];

function MicIcon({ active }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 ${active ? "animate-pulse" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </svg>
  );
}

export default function VoiceInput({ onTranscript }) {
  const [language, setLanguage] = useState("hi-IN");
  const [isBrave, setIsBrave] = useState(false);
  const { supported, listening, interim, error, start, stop } =
    useSpeechRecognition(language);

  useEffect(() => {
    isBraveBrowser().then(setIsBrave);
  }, []);

  // Not supported in Firefox or Safari. Render nothing rather than a button
  // that cannot work - typing is always available.
  if (!supported) return null;

  // Brave exposes the API but blocks the service behind it. Say so up front
  // instead of letting the user click and get a confusing network error.
  if (isBrave) {
    return (
      <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="text-xs font-medium text-amber-300">
          Voice input is not available in Brave
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
          Brave blocks the browser speech service for privacy, so recognition
          always fails here. Open this page in Chrome or Edge to speak a
          complaint. Typing works exactly the same in every browser.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded border border-slate-700 bg-slate-900/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => (listening ? stop() : start(onTranscript))}
          className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
            listening
              ? "bg-red-600 text-white hover:bg-red-500"
              : "bg-slate-700 text-slate-100 hover:bg-slate-600"
          }`}
        >
          <MicIcon active={listening} />
          {listening ? "Stop recording" : "Speak your complaint"}
        </button>

        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={listening}
          className="rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200 disabled:opacity-50"
        >
          {LANGUAGES.map((l) => (
            <option key={l.tag} value={l.tag}>
              {l.label} ({l.english})
            </option>
          ))}
        </select>

        {listening && (
          <span className="flex items-center gap-1.5 text-xs text-red-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Listening...
          </span>
        )}
      </div>

      {interim && (
        <p className="mt-2 text-sm italic text-slate-500">{interim}</p>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
        Uses your browser&apos;s built-in speech recognition, so it needs an
        internet connection and works in Chrome or Edge. Indian languages are
        transcribed into their own script. You can edit the text before sending.
      </p>
    </div>
  );
}
