function toneClasses(tone = "indigo") {
  const tones = {
    amber: {
      shell: "border-amber-300 bg-amber-50 text-amber-950 shadow-amber-200/60",
      badge: "bg-amber-100 text-amber-800",
      accent: "bg-amber-500",
      button: "border-amber-300 bg-white text-amber-800 hover:bg-amber-100",
    },
    emerald: {
      shell: "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-emerald-200/60",
      badge: "bg-emerald-100 text-emerald-800",
      accent: "bg-emerald-500",
      button: "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-100",
    },
    blue: {
      shell: "border-blue-300 bg-blue-50 text-blue-950 shadow-blue-200/60",
      badge: "bg-blue-100 text-blue-800",
      accent: "bg-blue-500",
      button: "border-blue-300 bg-white text-blue-800 hover:bg-blue-100",
    },
    indigo: {
      shell: "border-indigo-300 bg-indigo-50 text-indigo-950 shadow-indigo-200/60",
      badge: "bg-indigo-100 text-indigo-800",
      accent: "bg-indigo-500",
      button: "border-indigo-300 bg-white text-indigo-800 hover:bg-indigo-100",
    },
  };
  return tones[tone] || tones.indigo;
}

export default function WorkspaceAttentionAlert({
  alert,
  sound,
  onReplay,
  onDismiss,
}) {
  if (!alert) return null;

  const tone = toneClasses(alert.tone);

  return (
    <div className="fixed inset-x-4 top-20 z-50 sm:left-auto sm:right-6 sm:w-full sm:max-w-md">
      <div
        className={`overflow-hidden rounded-2xl border shadow-2xl backdrop-blur ${tone.shell}`}
      >
        <div className="flex items-start gap-3 p-4">
          <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80">
            <span className={`absolute inline-flex h-full w-full rounded-full opacity-25 animate-ping ${tone.accent}`} />
            <svg
              className="relative h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
              <path d="M9 17a3 3 0 0 0 6 0" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.badge}`}>
                Alerte
              </span>
              <span className="text-[11px] font-medium uppercase tracking-[0.16em] opacity-75">
                {alert.source === "realtime" ? "Temps réel" : "Rafraîchissement"}
              </span>
            </div>
            <div className="mt-2 text-sm font-semibold">{alert.title}</div>
            <div className="mt-1 text-sm opacity-90">{alert.message}</div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1.5 text-current/70 transition hover:bg-white/70 hover:text-current"
            aria-label="Masquer l'alerte"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m18 6-12 12" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-black/5 bg-white/50 px-4 py-3">
          {!sound?.unlocked ? (
            <button
              type="button"
              onClick={sound.unlockSound}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${tone.button}`}
            >
              Activer le son
            </button>
          ) : null}
          <button
            type="button"
            onClick={onReplay}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${tone.button}`}
          >
            Rejouer
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Masquer
          </button>
        </div>

        <div className="h-1 w-full overflow-hidden bg-black/5">
          <div className={`h-full w-1/3 animate-pulse ${tone.accent}`} />
        </div>
      </div>
    </div>
  );
}
