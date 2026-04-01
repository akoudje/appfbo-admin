import { useMemo } from "react";

function formatMuteRemaining(mutedUntil) {
  const target = Number(mutedUntil || 0);
  if (!target || target <= Date.now()) return null;
  const ms = target - Date.now();
  const min = Math.max(1, Math.ceil(ms / 60000));
  return `${min} min`;
}

export default function SoundAlertControls({
  title = "Alertes sonores",
  description = "",
  sound,
}) {
  const mutedLeft = useMemo(
    () => formatMuteRemaining(sound?.mutedUntil),
    [sound?.mutedUntil],
  );

  if (!sound) return null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {description ? (
            <div className="mt-1 text-xs text-gray-500">{description}</div>
          ) : null}
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
          <span className="text-xs text-gray-500">Actif</span>
          <button
            type="button"
            onClick={() => sound.setEnabled(!sound.enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
              sound.enabled ? "bg-emerald-500" : "bg-gray-300"
            }`}
            aria-pressed={sound.enabled}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                sound.enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
        <label className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Volume</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={sound.volume}
            onChange={(e) => sound.setVolume(Number(e.target.value || 0))}
            className="w-full"
          />
          <span className="w-10 text-right text-xs font-medium text-gray-700">
            {Math.round((Number(sound.volume || 0) || 0) * 100)}%
          </span>
        </label>

        {!sound.unlocked ? (
          <button
            type="button"
            onClick={sound.unlockSound}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            Activer son
          </button>
        ) : null}

        <button
          type="button"
          onClick={sound.testSound}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
        >
          Tester
        </button>

        {mutedLeft ? (
          <button
            type="button"
            onClick={sound.clearMute}
            className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
          >
            Muet ({mutedLeft})
          </button>
        ) : (
          <button
            type="button"
            onClick={() => sound.muteForMinutes(15)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Muet 15 min
          </button>
        )}
      </div>
    </div>
  );
}

