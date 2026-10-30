// Horaire hebdomadaire des soumissions client et actions du jour.
// L'ouverture réelle est calculée par le serveur (submissionWindow) dans le
// fuseau du pays : ce composant l'affiche, il ne la recalcule pas.
import { useEffect, useState } from "react";
import { CalendarClock, Clock, Loader2 } from "lucide-react";

// Lundi en premier ; les clés suivent Date#getDay (0 = dimanche).
const SCHEDULE_DAYS = [
  ["1", "Lundi"],
  ["2", "Mardi"],
  ["3", "Mercredi"],
  ["4", "Jeudi"],
  ["5", "Vendredi"],
  ["6", "Samedi"],
  ["0", "Dimanche"],
];
const DEFAULT_DAY = { open: "08:00", close: "15:00" };

function formatTime(iso, timeZone) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso))
    .replace(":", "h");
}

function formatDay(iso, timeZone, now) {
  const key = (date) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
  const day = key(new Date(iso));
  if (day === key(now)) return "aujourd’hui";
  if (day === key(new Date(now.getTime() + 86400000))) return "demain";
  return new Intl.DateTimeFormat("fr-FR", { timeZone, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(iso),
  );
}

function formatRemaining(iso, now) {
  const minutes = Math.max(0, Math.ceil((new Date(iso).getTime() - now.getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return minutes % 60 ? `${hours} h ${String(minutes % 60).padStart(2, "0")}` : `${hours} h`;
}

// Heure locale du pays + `hours`, arrondie au quart d'heure, plafonnée à 23:45.
function suggestedUntil(timeZone, from, hours) {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(from)
    .split(":")
    .map(Number);
  const minutes = Math.min(23 * 60 + 45, Math.ceil((parts[0] * 60 + parts[1] + hours * 60) / 15) * 15);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function SubmissionScheduleEditor({ schedule, onChange, disabled, error }) {
  const setDay = (key, value) => onChange({ ...schedule, [key]: value });
  const monday = schedule["1"];
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        {SCHEDULE_DAYS.map(([key, label]) => {
          const day = schedule[key];
          return (
            <div
              key={key}
              className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-2.5 last:border-b-0"
            >
              <label className="flex w-32 cursor-pointer items-center gap-2 text-sm font-medium text-gray-900">
                <input
                  type="checkbox"
                  checked={Boolean(day)}
                  disabled={disabled}
                  onChange={(event) => setDay(key, event.target.checked ? { ...(monday || DEFAULT_DAY) } : null)}
                  className="h-4 w-4 accent-gray-900"
                />
                {label}
              </label>
              {day ? (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <span>de</span>
                  <input
                    type="time"
                    aria-label={`${label} : heure d’ouverture`}
                    value={day.open}
                    disabled={disabled}
                    onChange={(event) => setDay(key, { ...day, open: event.target.value })}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-[#FFC600]/20"
                  />
                  <span>à</span>
                  <input
                    type="time"
                    aria-label={`${label} : heure de fermeture`}
                    value={day.close}
                    disabled={disabled}
                    onChange={(event) => setDay(key, { ...day, close: event.target.value })}
                    className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-[#FFC600]/20"
                  />
                </div>
              ) : (
                <span className="text-sm text-gray-500">Fermé toute la journée</span>
              )}
            </div>
          );
        })}
      </div>
      {monday ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange({ ...schedule, 2: { ...monday }, 3: { ...monday }, 4: { ...monday }, 5: { ...monday } })
          }
          className="text-xs font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900 disabled:opacity-40"
        >
          Appliquer l’horaire du lundi du mardi au vendredi
        </button>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmissionTodayPanel({ window: state, canWrite, blockedReason, busy, onOverride }) {
  const [now, setNow] = useState(() => new Date());
  const [until, setUntil] = useState("");
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  if (!state) return null;
  const zone = state.timeZone;
  const suspended = state.reason === "SUSPENDED";
  // Le serveur a calculé l'état au chargement ; il peut avoir changé depuis.
  const stale =
    (state.open && state.closesAt && new Date(state.closesAt) <= now) ||
    (!state.open && state.opensAt && new Date(state.opensAt) <= now);
  const untilValue = until || suggestedUntil(zone, state.closesAt ? new Date(state.closesAt) : now, state.open ? 1 : 2);

  let headline;
  let detail = "";
  if (suspended) {
    headline = "Fermées par la coupure générale";
    detail = "Aucune réouverture automatique tant que « Autoriser les nouvelles soumissions » est désactivé.";
  } else if (state.open) {
    headline = state.closesAt
      ? `Ouvertes · fermeture à ${formatTime(state.closesAt, zone)} (dans ${formatRemaining(state.closesAt, now)})`
      : "Ouvertes · pas d’heure de fermeture aujourd’hui";
  } else {
    headline = state.opensAt
      ? `Fermées · réouverture ${formatDay(state.opensAt, zone, now)} à ${formatTime(state.opensAt, zone)}`
      : "Fermées pour aujourd’hui";
    if (state.graceUntil && new Date(state.graceUntil) > now)
      detail = `Les paniers commencés avant la fermeture peuvent encore être envoyés jusqu’à ${formatTime(state.graceUntil, zone)}.`;
  }
  const override = state.override
    ? state.override.mode === "CLOSED"
      ? "Exception du jour : fermeture manuelle"
      : `Exception du jour : ouvert jusqu’à ${state.override.until.replace(":", "h")}`
    : "";

  const disabled = !canWrite || busy || Boolean(blockedReason);
  return (
    <div
      className={`rounded-xl border p-4 ${
        state.open ? "border-emerald-200 bg-emerald-50" : "border-[#f0cf57] bg-[#fffbeb]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-white/70 p-2">
          <CalendarClock className="h-5 w-5 text-gray-900" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="text-xs uppercase tracking-wider text-gray-500">Soumissions aujourd’hui</div>
          <div className="text-base font-bold text-gray-900" role="status">
            {headline}
          </div>
          {detail ? <p className="text-sm text-gray-700">{detail}</p> : null}
          {override ? (
            <p className="text-sm text-gray-700">
              {override}
              {state.override.actorLabel ? ` · par ${state.override.actorLabel}` : ""}
            </p>
          ) : null}
          {stale ? (
            <p className="text-xs text-gray-600">L’état a pu changer depuis le chargement de la page. Actualisez pour le voir.</p>
          ) : null}
        </div>
      </div>

      {canWrite && !suspended ? (
        <div className="mt-4 space-y-3 border-t border-black/5 pt-3">
          {blockedReason ? <p className="text-xs text-gray-600">{blockedReason}</p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="h-4 w-4" />
              {state.open ? "Prolonger jusqu’à" : "Rouvrir jusqu’à"}
              <input
                type="time"
                value={untilValue}
                disabled={disabled}
                onChange={(event) => setUntil(event.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-[#FFC600]/20"
              />
            </label>
            <button
              type="button"
              disabled={disabled || !untilValue}
              onClick={() => onOverride("OPEN", untilValue)}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {state.open ? "Prolonger" : "Rouvrir"}
            </button>
            {state.open ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onOverride("CLOSED")}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-40"
              >
                Fermer maintenant
              </button>
            ) : null}
            {state.override ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onOverride(null)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-40"
              >
                Revenir à l’horaire normal
              </button>
            ) : null}
          </div>
          <p className="text-xs text-gray-500">
            Ces actions ne valent que pour aujourd’hui (heure du pays) et s’annulent d’elles-mêmes à minuit.
          </p>
        </div>
      ) : null}
    </div>
  );
}
