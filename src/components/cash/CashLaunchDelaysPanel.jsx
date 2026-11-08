// admin-app/src/components/cash/CashLaunchDelaysPanel.jsx
// Onglet « Lancements » de la Supervision caisse : délai entre la
// confirmation du paiement et le lancement de la préparation.
//  - En attente maintenant : colis payés pas encore lancés, plus anciens
//    d'abord ; au-delà de 2 × le seuil, l'agent a déjà été rappelé et c'est
//    au responsable de comptoir de prendre le relais ;
//  - par agent de vente et par jour sur la période, pour suivre l'effet des
//    rappels (délai médian, dépassements). Les colis payés la veille (Wave du
//    soir, lancés à l'ouverture) sont comptés à part, hors délais.

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { reportsService } from "../../services/reportsService";
import { formatWait } from "../../lib/launchReminders";

const REFRESH_MS = 60_000;

const LEVELS = {
  escalated: { label: "À relancer", tone: "bg-rose-100 text-rose-800" },
  overdue: { label: "Agent rappelé", tone: "bg-amber-100 text-amber-800" },
  warn: { label: "Bientôt", tone: "bg-amber-50 text-amber-700" },
  fresh: { label: "Récent", tone: "bg-gray-100 text-gray-600" },
};

function minutes(value) {
  return value === null || value === undefined ? "—" : formatWait(value);
}

function share(part, total) {
  if (!total) return "";
  return ` (${Math.round((part / total) * 100)} %)`;
}

function dayLabel(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function CashLaunchDelaysPanel({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const report = await reportsService.getCashLaunchDelays(params);
        setData(report);
        setError("");
      } catch (e) {
        if (!silent) setError(e?.response?.data?.message || "Impossible de charger les délais de lancement.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [params],
  );

  useEffect(() => {
    const first = setTimeout(() => load(), 0);
    const timer = setInterval(() => load({ silent: true }), REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [load]);

  const settings = data?.settings;
  const totals = data?.totals;
  const pending = data?.pending || [];
  const byAgent = data?.byAgent || [];
  const byDay = data?.byDay || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Délai compté depuis la confirmation du paiement, sur les colis payés et lancés le même jour.
          {settings
            ? ` L’agent est rappelé à ${minutes(settings.alertAfterMinutes)} ; au-delà de ${minutes(settings.escalateAfterMinutes)}, le colis vous est signalé.`
            : ""}
        </p>
        <button
          type="button"
          onClick={() => load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Rafraîchir
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {loading && !data ? <p className="text-sm text-gray-500">Chargement…</p> : null}

      {data ? (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-baseline justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">En attente maintenant</h2>
              <span className="text-xs text-gray-500">
                {totals.pendingNow} colis
                {totals.escalatedNow ? ` · ${totals.escalatedNow} à relancer` : ""}
              </span>
            </div>
            {pending.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Aucun colis payé en attente de lancement.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Colis</th>
                      <th className="px-4 py-2">Client</th>
                      <th className="px-4 py-2">Agent de vente</th>
                      <th className="px-4 py-2">Payé il y a</th>
                      <th className="px-4 py-2">État</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((row) => {
                      const level = LEVELS[row.level] || LEVELS.fresh;
                      return (
                        <tr key={row.id} className={`border-t border-gray-100 ${row.level === "escalated" ? "bg-rose-50/60" : ""}`}>
                          <td className="px-4 py-2">
                            <div className="font-semibold text-gray-900">{row.label}</div>
                            {row.factureReference ? (
                              <div className="text-xs text-gray-500">AS400 {row.factureReference}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 text-gray-700">{row.fboNomComplet || "—"}</td>
                          <td className="px-4 py-2 font-medium text-gray-900">{row.agent?.label || "Non attribué"}</td>
                          <td className="px-4 py-2 text-gray-700">{minutes(row.waitedMinutes)}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${level.tone}`}>
                              {level.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-baseline justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Par agent de vente · {data.period?.label}</h2>
              <span className="text-xs text-gray-500">
                {totals.launched} lancé{totals.launched > 1 ? "s" : ""} · médiane {minutes(totals.medianMinutes)}
              </span>
            </div>
            {byAgent.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Aucun lancement sur la période.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Agent</th>
                      <th className="px-4 py-2 text-right">Lancés</th>
                      <th className="px-4 py-2 text-right">Délai médian</th>
                      <th className="px-4 py-2 text-right" title="9 colis sur 10 lancés en moins de">9 sur 10 en moins de</th>
                      <th className="px-4 py-2 text-right">Au-delà de {minutes(settings.alertAfterMinutes)}</th>
                      <th className="px-4 py-2 text-right">Au-delà de {minutes(settings.escalateAfterMinutes)}</th>
                      <th className="px-4 py-2 text-right" title="Payés un jour précédent, lancés à l’ouverture : hors délais">Payés la veille</th>
                      <th className="px-4 py-2 text-right">En attente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byAgent.map((agent) => (
                      <tr key={agent.key} className="border-t border-gray-100">
                        <td className="px-4 py-2 font-medium text-gray-900">{agent.label}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{agent.launched}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{minutes(agent.medianMinutes)}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{minutes(agent.p90Minutes)}</td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {agent.overAlert}
                          <span className="text-xs text-gray-500">{share(agent.overAlert, agent.launchedSameDay)}</span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-700">{agent.overEscalation}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{agent.paidPreviousDay}</td>
                        <td className="px-4 py-2 text-right">
                          {agent.pendingNow ? (
                            <span className={agent.escalatedNow ? "font-semibold text-rose-700" : "text-gray-700"}>
                              {agent.pendingNow}
                              {agent.oldestPendingMinutes !== null ? (
                                <span className="text-xs font-normal"> · {minutes(agent.oldestPendingMinutes)}</span>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {byDay.length > 1 ? (
            <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-900">Évolution par jour</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-2">Jour</th>
                      <th className="px-4 py-2 text-right">Lancés</th>
                      <th className="px-4 py-2 text-right">Délai médian</th>
                      <th className="px-4 py-2 text-right">Au-delà de {minutes(settings.alertAfterMinutes)}</th>
                      <th className="px-4 py-2 text-right">Payés la veille</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byDay.map((day) => (
                      <tr key={day.date} className="border-t border-gray-100">
                        <td className="px-4 py-2 text-gray-900">{dayLabel(day.date)}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{day.launched}</td>
                        <td className="px-4 py-2 text-right text-gray-700">{minutes(day.medianMinutes)}</td>
                        <td className="px-4 py-2 text-right text-gray-700">
                          {day.overAlert}
                          <span className="text-xs text-gray-500">{share(day.overAlert, day.launchedSameDay)}</span>
                        </td>
                        <td className="px-4 py-2 text-right text-gray-500">{day.paidPreviousDay}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
