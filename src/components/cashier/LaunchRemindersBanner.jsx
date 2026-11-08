// Bandeau « colis payés à lancer », affiché en haut de toutes les pages de
// l'agent de vente dès qu'un colis dépasse l'alerte visuelle. Ton neutre :
// jamais « retard » ni « oubli », pas de clignotement ni de rouge vif.

import { Link, useLocation } from "react-router-dom";
import { PackageCheck } from "lucide-react";
import { formatWait } from "../../lib/launchReminders";
import { useLaunchReminders } from "../../hooks/useLaunchReminders";

function formatClock(ms) {
  return new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function LaunchRemindersBanner() {
  const reminders = useLaunchReminders();
  const { pathname } = useLocation();
  const { summary } = reminders;

  if (!reminders.enabled) return null;

  // Responsable de comptoir : seulement les colis qui attendent depuis plus
  // de 2 × le seuil (l'agent a déjà été rappelé), sans son.
  if (reminders.escalateToUser) {
    if (!summary.escalated) return null;
    const m = summary.escalated;
    return (
      <div
        role="status"
        className="mb-4 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <PackageCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="font-semibold">
            {m} colis payé{m > 1 ? "s" : ""} attend{m > 1 ? "ent" : ""} le lancement depuis plus de{" "}
            {formatWait(reminders.settings.escalateAfterMinutes)}
            {summary.oldestMinutes !== null ? (
              <span className="font-normal"> · le plus ancien depuis {formatWait(summary.oldestMinutes)}</span>
            ) : null}
          </div>
        </div>
        {pathname !== "/cash-supervision" ? (
          <Link
            to="/cash-supervision?tab=launches"
            className="self-start rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 sm:self-auto"
          >
            Voir qui doit les lancer
          </Link>
        ) : null}
      </div>
    );
  }

  if (!reminders.remindUser || summary.attention === 0) return null;

  const strong = summary.overdue > 0;
  const n = summary.total;
  const onCashier = pathname === "/cashier";

  return (
    <div
      role="status"
      className={`mb-4 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
        strong ? "border-amber-300 bg-amber-100 text-amber-950" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <PackageCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <div className="font-semibold">
            {n} colis payé{n > 1 ? "s" : ""} à certifier et lancer
            {summary.oldestMinutes !== null ? (
              <span className="font-normal"> · le plus ancien attend depuis {formatWait(summary.oldestMinutes)}</span>
            ) : null}
          </div>
          {reminders.pausedUntil ? (
            <div className="mt-0.5 text-xs">Rappels sonores en pause jusqu’à {formatClock(reminders.pausedUntil)}.</div>
          ) : !reminders.registerOpen ? (
            <div className="mt-0.5 text-xs">Caisse fermée : aucun rappel sonore.</div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {reminders.notifPermission === "default" ? (
          <button
            type="button"
            onClick={reminders.requestNotifications}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
          >
            Recevoir les rappels dans Windows
          </button>
        ) : null}
        {strong && reminders.registerOpen ? (
          reminders.pausedUntil ? (
            <button
              type="button"
              onClick={reminders.resume}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
            >
              Reprendre les rappels
            </button>
          ) : (
            <button
              type="button"
              onClick={reminders.pause}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-50"
            >
              Pause 15 min
            </button>
          )
        ) : null}
        {!onCashier ? (
          <Link
            to="/cashier"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
          >
            Ouvrir l’espace caisse
          </Link>
        ) : null}
      </div>
    </div>
  );
}
