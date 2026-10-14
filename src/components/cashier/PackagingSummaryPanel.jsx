// src/components/cashier/PackagingSummaryPanel.jsx
// Bilan des emballages sur une période (jour / mois / année) : totaux, détail
// (par commande pour un jour, par jour pour un mois, par mois pour une année)
// et export CSV. Utilisé dans l'espace caisse et sur le rapport des ventes ;
// `service` fournit getPackagingSummary(params) et exportPackagingSummary(params).

import { useCallback, useEffect, useState } from "react";

const PERIOD_OPTIONS = [
  { value: "day", label: "Jour" },
  { value: "month", label: "Mois" },
  { value: "year", label: "Année" },
];

const PAYMENT_MODE_LABELS = {
  ESPECES: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  BANK_TRANSFER: "Virement bancaire",
  ECOBANK_PAY: "Ecobank Pay",
  PI_SPI: "PI SPI",
};

// Valeur par défaut de la période : aujourd'hui / ce mois / cette année (UTC = Abidjan).
function defaultDateFor(type) {
  const today = new Date().toISOString().slice(0, 10);
  if (type === "month") return today.slice(0, 7);
  if (type === "year") return today.slice(0, 4);
  return today;
}

function formatFcfa(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function formatBucketLabel(key, type) {
  if (type === "year") {
    const [year, month] = key.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  return new Date(`${key}T00:00:00Z`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
}

function formatTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
}

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

export default function PackagingSummaryPanel({ service, title = "Bilan des emballages" }) {
  const [periodType, setPeriodType] = useState("day");
  const [periodDate, setPeriodDate] = useState(defaultDateFor("day"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!periodDate) return;
    setLoading(true);
    setError("");
    try {
      setData(await service.getPackagingSummary({ period: periodType, date: periodDate }));
    } catch (e) {
      setData(null);
      setError(e?.response?.data?.message || "Impossible de charger le bilan des emballages.");
    } finally {
      setLoading(false);
    }
  }, [service, periodType, periodDate]);

  useEffect(() => {
    load();
  }, [load]);

  const changePeriodType = (type) => {
    setPeriodType(type);
    setPeriodDate(defaultDateFor(type));
  };

  const exportCsv = async () => {
    setExporting(true);
    setError("");
    try {
      const response = await service.exportPackagingSummary({ period: periodType, date: periodDate });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bilan-emballages-${periodDate}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Impossible de générer l'export du bilan des emballages.");
    } finally {
      setExporting(false);
    }
  };

  const period = data?.period || null;
  const currentFee = data?.currentPackagingFeeFcfa;

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">
            Frais d'emballage des précommandes payées sur la période (date de paiement).
            {currentFee != null ? ` Frais actuel : ${formatFcfa(currentFee)} par précommande.` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="inline-flex rounded-xl border border-gray-300 bg-white p-0.5">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => changePeriodType(option.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                  periodType === option.value ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {periodType === "year" ? (
            <input
              type="number"
              min="2020"
              max="2100"
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
              className="w-24 rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm"
              aria-label="Année"
            />
          ) : (
            <input
              type={periodType === "month" ? "month" : "date"}
              value={periodDate}
              onChange={(e) => setPeriodDate(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm"
              aria-label={periodType === "month" ? "Mois" : "Jour"}
            />
          )}
          <button
            type="button"
            onClick={exportCsv}
            disabled={exporting || loading || !period}
            className="rounded-xl border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {exporting ? "Export…" : "Exporter (Excel/CSV)"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {loading && !period ? (
        <div className="py-8 text-center text-sm text-gray-500">Chargement du bilan…</div>
      ) : period ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Total emballages" value={formatFcfa(period.totalEmballageFcfa)} />
            <StatCard label="Précommandes payées" value={Number(period.paidOrdersCount || 0).toLocaleString("fr-FR")} />
            <StatCard
              label="Dont sans frais d'emballage"
              value={Number(period.zeroFeeOrdersCount || 0).toLocaleString("fr-FR")}
              hint={period.zeroFeeOrdersCount ? "Frais à 0 FCFA au moment de la facturation." : null}
            />
          </div>

          {period.type === "day" ? (
            period.orders.length ? (
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs text-gray-500">
                    <tr>
                      <th className="px-3 py-2">Heure</th>
                      <th className="px-3 py-2">Précommande</th>
                      <th className="px-3 py-2">Client</th>
                      <th className="px-3 py-2">Paiement</th>
                      <th className="px-3 py-2 text-right">Commande</th>
                      <th className="px-3 py-2 text-right">Emballage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {period.orders.map((order) => (
                      <tr key={order.preorderNumber}>
                        <td className="px-3 py-2 whitespace-nowrap">{formatTime(order.paidAt)}</td>
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">{order.preorderNumber}</td>
                        <td className="px-3 py-2">{order.fboNomComplet}</td>
                        <td className="px-3 py-2">{PAYMENT_MODE_LABELS[order.paymentMode] || order.paymentMode || "—"}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">{formatFcfa(order.totalFcfa)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap font-semibold">{formatFcfa(order.emballageFcfa)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
                Aucune précommande payée ce jour-là.
              </div>
            )
          ) : period.breakdown.length ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th className="px-3 py-2">{period.type === "year" ? "Mois" : "Jour"}</th>
                    <th className="px-3 py-2 text-right">Précommandes payées</th>
                    <th className="px-3 py-2 text-right">Sans frais</th>
                    <th className="px-3 py-2 text-right">Total emballages</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {period.breakdown.map((bucket) => (
                    <tr key={bucket.key}>
                      <td className="px-3 py-2 capitalize">{formatBucketLabel(bucket.key, period.type)}</td>
                      <td className="px-3 py-2 text-right">{bucket.paidOrdersCount}</td>
                      <td className="px-3 py-2 text-right">{bucket.zeroFeeOrdersCount}</td>
                      <td className="px-3 py-2 text-right font-semibold">{formatFcfa(bucket.totalEmballageFcfa)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white py-6 text-center text-sm text-gray-500">
              Aucune précommande payée sur cette période.
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
