// admin-app/src/components/cash/CashClosuresPanel.jsx
// Onglet « Clôtures » de la Supervision caisse : sur la période, pour chaque
// caissier et chaque jour, ce qu'il a encaissé (paiements qu'il a validés),
// ce qu'il a déclaré à la clôture et l'écart ; les clôtures manquantes ou à
// valider ; l'état des caisses. La saisie et la validation des clôtures
// restent sur la page Clôture caisse.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { reportsService } from "../../services/reportsService";
import { formatFcfa, formatDateTime } from "../../lib/format";

const STATES = {
  MISSING: { label: "Non clôturée", tone: "bg-red-50 text-red-700" },
  DRAFT: { label: "Brouillon", tone: "bg-amber-50 text-amber-800" },
  SUBMITTED: { label: "À valider", tone: "bg-blue-50 text-blue-700" },
  APPROVED: { label: "Validée", tone: "bg-emerald-50 text-emerald-700" },
  REJECTED: { label: "Rejetée", tone: "bg-red-50 text-red-700" },
};

function dayLabel(dateKey) {
  return new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

function Card({ label, value, sub, tone = "border-gray-200" }) {
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tone}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-sm text-gray-600">{sub}</div> : null}
    </div>
  );
}

export default function CashClosuresPanel({ params }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await reportsService.getCashClosuresOverview(params));
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les clôtures.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  }
  if (!data) {
    return <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">Chargement…</div>;
  }

  const { summary, rows, registers } = data;

  return (
    <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        {registers.map((register) => (
          <span
            key={register.label}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              register.isOpen ? "bg-emerald-50 text-emerald-800" : "bg-gray-100 text-gray-700"
            }`}
            title={
              register.isOpen
                ? register.reopenedAt
                  ? `Ouverte depuis ${formatDateTime(register.reopenedAt)}`
                  : "Ouverte"
                : `Fermée le ${formatDateTime(register.closedAt)}`
            }
          >
            <span
              className={`h-2 w-2 rounded-full ${register.isOpen ? "bg-emerald-500" : "bg-gray-400"}`}
              aria-hidden="true"
            />
            {register.label} : {register.isOpen ? "ouverte" : "fermée"}
          </span>
        ))}
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Actualiser
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          label="Encaissé par les caissiers"
          value={formatFcfa(summary.expectedFcfa)}
          sub="Paiements validés à la caisse sur la période"
        />
        <Card
          label="Déclaré aux clôtures"
          value={formatFcfa(summary.declaredFcfa)}
          sub="Clôtures soumises, validées ou rejetées"
        />
        <Card
          label="Écart déclaré"
          value={formatFcfa(summary.discrepancyFcfa)}
          sub={`${summary.withDiscrepancy} clôture(s) avec écart`}
          tone={summary.discrepancyFcfa ? "border-amber-300 bg-amber-50" : "border-gray-200"}
        />
        <Card
          label="Clôtures manquantes"
          value={summary.missing}
          sub={`${summary.toReview} clôture(s) à valider`}
          tone={summary.missing ? "border-red-200" : "border-emerald-200"}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-1 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Clôtures par caissier et par jour</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Une journée « non clôturée » est une journée où le caissier a validé des paiements sans soumettre sa
              clôture.
            </p>
          </div>
          <Link to="/cash-closures" className="text-sm font-medium text-blue-700 hover:underline">
            Ouvrir la clôture caisse
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Jour</th>
                <th className="px-4 py-2 font-medium">Caissier</th>
                <th className="px-4 py-2 text-right font-medium">Encaissé</th>
                <th className="px-4 py-2 text-right font-medium">Déclaré</th>
                <th className="px-4 py-2 text-right font-medium">Écart</th>
                <th className="px-4 py-2 font-medium">Clôture</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const state = STATES[row.state] || STATES.MISSING;
                const discrepancy = row.closure && row.state !== "DRAFT" ? row.closure.discrepancyFcfa : null;
                return (
                  <tr key={row.key} className="border-t border-gray-100 align-top">
                    <td className="whitespace-nowrap px-4 py-2 text-gray-800">{dayLabel(row.dateKey)}</td>
                    <td className="px-4 py-2 text-gray-800">{row.cashier?.label || "—"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {formatFcfa(row.expectedFcfa)}
                      <div className="text-xs text-gray-500">{row.transactionCount} paiement(s)</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {row.closure && row.state !== "DRAFT" ? formatFcfa(row.closure.declaredFcfa) : "—"}
                    </td>
                    <td
                      className={`px-4 py-2 text-right tabular-nums ${
                        discrepancy ? "font-semibold text-red-700" : "text-gray-500"
                      }`}
                    >
                      {discrepancy === null ? "—" : formatFcfa(discrepancy)}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${state.tone}`}>
                        {state.label}
                      </span>
                      {row.closure?.reviewedBy ? (
                        <div className="mt-0.5 text-xs text-gray-500">par {row.closure.reviewedBy.label}</div>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Aucun encaissement en caisse sur la période.</p>
        ) : null}
      </div>
    </div>
  );
}
