// Pauses hebdomadaires des soumissions client et actions du jour.
// Les soumissions sont ouvertes en dehors des pauses ; la fin d'une pause est
// l'heure de réouverture au plus tard (« Rouvrir maintenant » avant).
// L'ouverture réelle est calculée par le serveur (submissionWindow) dans le
// fuseau du pays : ce composant l'affiche, il ne la recalcule pas.
import { useEffect, useState } from "react";
import { CalendarClock, Clock, Loader2, Plus, X } from "lucide-react";

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
const FULL_DAY = { start: "00:00", end: "24:00" };
const MAX_PAUSES = 4;
// Horaire type : pause de traitement en semaine, samedi fermé jusqu'à
// 17:00, dimanche fermé.
const SUGGESTED = {
  version: 2,
  days: {
    0: [FULL_DAY],
    1: [{ start: "15:00", end: "18:30" }],
    2: [{ start: "15:00", end: "18:30" }],
    3: [{ start: "15:00", end: "18:30" }],
    4: [{ start: "15:00", end: "18:30" }],
    5: [{ start: "15:00", end: "18:30" }],
    6: [{ start: "00:00", end: "17:00" }],
  },
};
const timeInputClass =
  "rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-[#FFC600]/20";

const isFullDay = (pauses) => pauses.length === 1 && pauses[0].start === "00:00" && pauses[0].end === "24:00";

function formatTime(iso, timeZone) {
  if (!iso) return "";
  return new Intl.DateTimeFormat("fr-FR", { timeZone, hour: "2-digit", minute: "2-digit" })
    .format(new Date(iso))
    .replace(":", "h");
}

// « HH:MM » locale d'un instant ; minuit pile devient 24:00 (fin de journée).
function localTime(iso, timeZone) {
  const value = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(iso),
  );
  return value === "00:00" ? "24:00" : value;
}

const dayKey = (date, timeZone) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);

function formatDay(iso, timeZone, now) {
  const day = dayKey(new Date(iso), timeZone);
  if (day === dayKey(now, timeZone)) return "aujourd’hui";
  if (day === dayKey(new Date(now.getTime() + 86400000), timeZone)) return "demain";
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

// Heure locale du pays + `minutes`, arrondie au quart d'heure, plafonnée à minuit.
function suggestedTime(timeZone, from, minutes) {
  const [h, m] = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(from)
    .split(":")
    .map(Number);
  const total = Math.min(24 * 60, Math.ceil((h * 60 + m + minutes) / 15) * 15);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const isToday = (iso, timeZone, now) => Boolean(iso) && dayKey(new Date(iso), timeZone) === dayKey(now, timeZone);

// Un champ <input type="time"> ne sait pas afficher 24:00 : minuit s'y lit 00:00.
const toInput = (value) => (value === "24:00" ? "00:00" : value);
const fromEndInput = (value) => (value === "00:00" ? "24:00" : value);

export function SubmissionScheduleEditor({ schedule, onChange, disabled, error }) {
  const setDay = (key, pauses) => onChange({ ...schedule, days: { ...schedule.days, [key]: pauses } });
  const monday = schedule.days["1"];
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        {SCHEDULE_DAYS.map(([key, label]) => {
          const pauses = schedule.days[key] || [];
          const closed = isFullDay(pauses);
          return (
            <div key={key} className="flex flex-wrap items-start gap-3 border-b border-gray-100 px-4 py-2.5 last:border-b-0">
              <div className="w-32 pt-1.5 text-sm font-medium text-gray-900">{label}</div>
              <div className="min-w-0 flex-1 space-y-2">
                <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={closed}
                    disabled={disabled}
                    onChange={(event) => setDay(key, event.target.checked ? [{ ...FULL_DAY }] : [])}
                    className="h-4 w-4 accent-gray-900"
                  />
                  Fermé toute la journée
                </label>
                {!closed ? (
                  <>
                    {pauses.length === 0 ? (
                      <p className="text-sm text-gray-500">Ouvert toute la journée</p>
                    ) : null}
                    {pauses.map((pause, index) => (
                      <div key={index} className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                        <span>Pause de</span>
                        <input
                          type="time"
                          aria-label={`${label} : début de la pause ${index + 1}`}
                          value={toInput(pause.start)}
                          disabled={disabled}
                          onChange={(event) =>
                            setDay(key, pauses.map((item, i) => (i === index ? { ...item, start: event.target.value } : item)))
                          }
                          className={timeInputClass}
                        />
                        <span>à</span>
                        <input
                          type="time"
                          aria-label={`${label} : fin de la pause ${index + 1} (réouverture au plus tard)`}
                          value={toInput(pause.end)}
                          disabled={disabled}
                          onChange={(event) =>
                            setDay(
                              key,
                              pauses.map((item, i) => (i === index ? { ...item, end: fromEndInput(event.target.value) } : item)),
                            )
                          }
                          className={timeInputClass}
                        />
                        <button
                          type="button"
                          aria-label={`Retirer la pause ${index + 1} du ${label.toLowerCase()}`}
                          disabled={disabled}
                          onClick={() => setDay(key, pauses.filter((_, i) => i !== index))}
                          className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {pauses.length < MAX_PAUSES ? (
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => setDay(key, [...pauses, { start: "15:00", end: "18:30" }])}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-gray-900 disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Ajouter une pause
                      </button>
                    ) : null}
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(structuredClone(SUGGESTED))}
          className="text-xs font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900 disabled:opacity-40"
        >
          Préremplir : pause 15h00–18h30 en semaine, samedi fermé jusqu’à 17h00, dimanche fermé
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onChange({
              ...schedule,
              days: { ...schedule.days, ...Object.fromEntries(["2", "3", "4", "5"].map((key) => [key, structuredClone(monday)])) },
            })
          }
          className="text-xs font-semibold text-gray-700 underline underline-offset-2 hover:text-gray-900 disabled:opacity-40"
        >
          Appliquer les pauses du lundi du mardi au vendredi
        </button>
      </div>
      <p className="text-xs text-gray-500">
        La fin d’une pause est l’heure de réouverture au plus tard : rouvrez plus tôt depuis « Soumissions aujourd’hui ».
        Une fin à 00:00 signifie minuit.
      </p>
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
  const [extendUntil, setExtendUntil] = useState("");
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

  let headline;
  let detail = "";
  if (suspended) {
    headline = "Fermées par la coupure générale";
    detail = "Aucune réouverture automatique tant que « Autoriser les nouvelles soumissions » est désactivé.";
  } else if (state.open) {
    headline = state.closesAt
      ? `Ouvertes · prochaine pause ${formatDay(state.closesAt, zone, now)} à ${formatTime(state.closesAt, zone)} (dans ${formatRemaining(state.closesAt, now)})`
      : "Ouvertes · aucune pause prévue";
  } else {
    headline = state.opensAt
      ? `Fermées · réouverture ${formatDay(state.opensAt, zone, now)} à ${formatTime(state.opensAt, zone)}${state.reopenIsLatest ? " au plus tard" : ""}`
      : "Fermées";
    if (state.graceUntil && new Date(state.graceUntil) > now)
      detail = `Les paniers commencés avant la fermeture peuvent encore être envoyés jusqu’à ${formatTime(state.graceUntil, zone)}.`;
  }
  const override = state.override
    ? `Exception en cours : ${state.override.mode === "CLOSED" ? "fermé" : "ouvert"} jusqu’à ${formatTime(state.override.until, zone)}`
    : "";

  // Actions : rouvrir ou prolonger la pause quand c'est fermé ; fermer ou
  // prolonger l'ouverture avant une pause quand c'est ouvert.
  const reopenUntil = state.opensAt && isToday(state.opensAt, zone, now) ? localTime(state.opensAt, zone) : "24:00";
  const defaultExtend = state.open
    ? state.closesAt && isToday(state.closesAt, zone, now)
      ? suggestedTime(zone, new Date(state.closesAt), 30)
      : suggestedTime(zone, now, 120)
    : suggestedTime(zone, state.opensAt && isToday(state.opensAt, zone, now) ? new Date(state.opensAt) : now, 30);
  const extendValue = extendUntil || defaultExtend;
  const disabled = !canWrite || busy || Boolean(blockedReason);
  const secondary =
    "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-40";
  return (
    <div className={`rounded-xl border p-4 ${state.open ? "border-emerald-200 bg-emerald-50" : "border-[#f0cf57] bg-[#fffbeb]"}`}>
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
            {!state.open ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onOverride("OPEN", reopenUntil)}
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Rouvrir maintenant
              </button>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <Clock className="h-4 w-4" />
              {state.open ? "Jusqu’à" : "Prolonger la pause jusqu’à"}
              <input
                type="time"
                value={toInput(extendValue)}
                disabled={disabled}
                onChange={(event) => setExtendUntil(fromEndInput(event.target.value))}
                className={timeInputClass}
              />
            </label>
            {state.open ? (
              <>
                <button type="button" disabled={disabled || !extendValue} onClick={() => onOverride("CLOSED", extendValue)} className={secondary}>
                  Fermer maintenant
                </button>
                {state.closesAt && isToday(state.closesAt, zone, now) ? (
                  <button type="button" disabled={disabled || !extendValue} onClick={() => onOverride("OPEN", extendValue)} className={secondary}>
                    Retarder la pause
                  </button>
                ) : null}
              </>
            ) : (
              <button type="button" disabled={disabled || !extendValue} onClick={() => onOverride("CLOSED", extendValue)} className={secondary}>
                Prolonger la pause
              </button>
            )}
            {state.override ? (
              <button type="button" disabled={disabled} onClick={() => onOverride(null)} className={secondary}>
                Revenir à l’horaire normal
              </button>
            ) : null}
          </div>
          <p className="text-xs text-gray-500">
            Heure du pays. Une exception s’arrête d’elle-même à son heure de fin ; ensuite l’horaire normal reprend.
          </p>
        </div>
      ) : null}
    </div>
  );
}
