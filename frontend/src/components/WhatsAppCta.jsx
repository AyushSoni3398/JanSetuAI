import { WHATSAPP_JOIN_CODE, WHATSAPP_NUMBER, whatsappLink } from "../config.js";

const BRAND = "#25D366";

export function WhatsAppIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.13h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.25-4.36c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.21-8.26 8.21z" />
    </svg>
  );
}

/**
 * Entry point for reporting over WhatsApp.
 *
 * `variant="card"` is the full block with the sandbox join step spelled out.
 * `variant="inline"` is a single button for use beside other actions.
 */
export default function WhatsAppCta({ variant = "card", message = "" }) {
  const displayNumber = `+${WHATSAPP_NUMBER}`;
  const needsJoin = Boolean(WHATSAPP_JOIN_CODE);

  if (variant === "inline") {
    return (
      <a
        href={whatsappLink(needsJoin ? WHATSAPP_JOIN_CODE : message)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-slate-900 transition-opacity hover:opacity-90"
        style={{ background: BRAND }}
      >
        <WhatsAppIcon className="h-4 w-4" />
        Report on WhatsApp
      </a>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-900"
          style={{ background: BRAND }}
        >
          <WhatsAppIcon />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-100">
            No app, no form &mdash; just WhatsApp
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Send your complaint as a normal WhatsApp message, in any language.
            You get a report number back straight away, and can reply{" "}
            <span className="font-mono text-slate-300">STATUS &lt;number&gt;</span>{" "}
            any time to check progress.
          </p>
        </div>
      </div>

      {needsJoin && (
        <ol className="mt-4 space-y-2 text-xs text-slate-400">
          <li className="flex gap-2">
            <span className="text-slate-600">1.</span>
            <span>
              First message{" "}
              <span className="font-mono text-slate-200">{WHATSAPP_JOIN_CODE}</span>{" "}
              to <span className="font-mono text-slate-200">{displayNumber}</span>{" "}
              &mdash; a one-time step required by the testing sandbox.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-slate-600">2.</span>
            <span>Then send your complaint to the same number.</span>
          </li>
        </ol>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={whatsappLink(needsJoin ? WHATSAPP_JOIN_CODE : message)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium text-slate-900 transition-opacity hover:opacity-90"
          style={{ background: BRAND }}
        >
          <WhatsAppIcon className="h-4 w-4" />
          {needsJoin ? "Open WhatsApp and join" : "Report on WhatsApp"}
        </a>
        <span className="text-xs text-slate-500">{displayNumber}</span>
      </div>

      {needsJoin && (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-600">
          Running on Twilio&apos;s WhatsApp sandbox, so only numbers that have sent
          the join code can message it. A production deployment would use an
          approved WhatsApp Business number with no join step.
        </p>
      )}
    </div>
  );
}
