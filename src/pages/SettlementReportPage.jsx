// admin-app/src/pages/SettlementReportPage.jsx
// Rapport des commandes réglées par une autre filiale FLP (ex. FLP Burkina),
// à transmettre à la filiale : jour, semaine, mois ou période libre. Montant
// dû = commandes facturées (payées par la filiale) non annulées.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, RefreshCw } from "lucide-react";
import { ordersService } from "../services/ordersService";
import { formatFcfa, formatDateTime } from "../lib/format";

const PRESETS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "custom", label: "Période" },
];

const STAGES = {
  A_FACTURER: { label: "À facturer", tone: "bg-gray-100 text-gray-700" },
  FACTUREE: { label: "Facturée", tone: "bg-blue-50 text-blue-700" },
  EN_PREPARATION: { label: "En préparation", tone: "bg-indigo-50 text-indigo-700" },
  PRETE: { label: "Prête", tone: "bg-amber-50 text-amber-800" },
  REMISE: { label: "Remise", tone: "bg-emerald-50 text-emerald-700" },
  ANNULEE: { label: "Annulée", tone: "bg-red-50 text-red-700" },
};

function isoDay(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function presetRange(key) {
  const today = new Date();
  if (key === "week") {
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return { from: isoDay(monday), to: isoDay(today) };
  }
  if (key === "month") {
    return { from: isoDay(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoDay(today) };
  }
  return { from: isoDay(today), to: isoDay(today) };
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[;"\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvDate(value) {
  return value ? formatDateTime(value) : "";
}

function buildCsv(data) {
  const head = [
    "Précommande",
    "FBO",
    "N° FBO",
    "Réf. AS400",
    "Montant (FCFA)",
    "Statut",
    "Réf. comptabilité",
    "Marquée le",
    "Facturée le",
    "Préparation lancée le",
    "Remise le",
    "Retirée par",
    "Facturier",
  ];
  const lines = [head.join(";")];
  for (const row of data.rows) {
    lines.push(
      [
        row.preorderNumber,
        row.fboNomComplet,
        row.fboNumero,
        row.factureReference,
        row.amountFcfa,
        STAGES[row.stage]?.label || row.stage,
        row.settlementReference,
        csvDate(row.settlementMarkedAt),
        csvDate(row.paidAt),
        csvDate(row.preparationLaunchedAt),
        csvDate(row.fulfilledAt),
        row.pickupRecipientName,
        row.invoicedBy,
      ]
        .map(csvCell)
        .join(";"),
    );
  }
  lines.push("");
  lines.push(["Total dû", "", "", "", data.totals.due.amountFcfa, `${data.totals.due.count} commande(s)`].map(csvCell).join(";"));
  return lines.join("\r\n");
}

function SummaryCard({ label, value, sub, tone = "gray" }) {
  const tones = {
    gray: "border-gray-200",
    emerald: "border-emerald-200",
    amber: "border-amber-300 bg-amber-50",
  };
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-sm tabular-nums text-gray-600">{sub}</div> : null}
    </div>
  );
}

export default function SettlementReportPage() {
  const [entities, setEntities] = useState([]);
  const [entity, setEntity] = useState("");
  const [preset, setPreset] = useState("today");
  const [range, setRange] = useState(() => presetRange("today"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    ordersService
      .listSettlementEntities()
      .then((res) => {
        setEntities(res.entities || []);
        setEntity((current) => current || res.entities?.[0]?.code || "");
      })
      .catch(() => setError("Impossible de charger les filiales."));
  }, []);

  const load = useCallback(async () => {
    if (!entity) return;
    setLoading(true);
    setError("");
    try {
      setData(await ordersService.getSettlementReport({ entity, from: range.from, to: range.to }));
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le rapport.");
    } finally {
      setLoading(false);
    }
  }, [entity, range.from, range.to]);

  useEffect(() => {
    load();
  }, [load]);

  const choosePreset = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };

  const exportCsv = () => {
    if (!data) return;
    const blob = new Blob(["﻿" + buildCsv(data)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const span = data.period.from === data.period.to ? data.period.from : `${data.period.from}_${data.period.to}`;
    link.download = `rapport-${(data.entity?.code || "filiale").toLowerCase()}-${span}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const totals = data?.totals;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Rapport {data?.entity?.label || entities.find((item) => item.code === entity)?.label || "filiale"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Commandes réglées au siège de la filiale, traitées et retirées ici. Montant dû : commandes facturées
              non annulées.
            </p>
          </div>
          <div className="flex gap-2 self-start">
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Rafraîchir
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={!data?.rows?.length}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Exporter (Excel)
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {entities.length > 1 ? (
            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
              aria-label="Filiale"
            >
              {entities.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          ) : null}
          {PRESETS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => choosePreset(item.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                preset === item.key
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          {preset === "custom" ? (
            <>
              <input
                type="date"
                value={range.from}
                onChange={(e) => e.target.value && setRange((r) => ({ ...r, from: e.target.value }))}
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                aria-label="Début de période"
              />
              <input
                type="date"
                value={range.to}
                min={range.from}
                onChange={(e) => e.target.value && setRange((r) => ({ ...r, to: e.target.value }))}
                className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
                aria-label="Fin de période"
              />
            </>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading && !data ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">Chargement…</div>
      ) : null}

      {data ? (
        <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              label="Montant dû par la filiale"
              value={formatFcfa(totals.due.amountFcfa)}
              sub={`${totals.due.count} commande(s) facturée(s)`}
              tone="emerald"
            />
            <SummaryCard
              label="Reçues, à facturer"
              value={totals.toInvoice.count}
              sub={formatFcfa(totals.toInvoice.amountFcfa)}
              tone={totals.toInvoice.count ? "amber" : "gray"}
            />
            <SummaryCard
              label="Préparation / prêtes"
              value={totals.byStage.EN_PREPARATION + totals.byStage.PRETE}
              sub={`${totals.byStage.REMISE} remise(s) au représentant`}
            />
            <SummaryCard label="Annulées" value={totals.byStage.ANNULEE} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Précommande</th>
                    <th className="px-4 py-3 font-medium">FBO</th>
                    <th className="px-4 py-3 font-medium">Réf. AS400</th>
                    <th className="px-4 py-3 text-right font-medium">Montant</th>
                    <th className="px-4 py-3 font-medium">Statut</th>
                    <th className="px-4 py-3 font-medium">Facturée le</th>
                    <th className="px-4 py-3 font-medium">Remise</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3 font-mono text-xs">
                        <Link to={`/orders/${row.id}`} className="text-blue-700 hover:underline">
                          {row.preorderNumber}
                        </Link>
                        {row.settlementReference ? (
                          <div className="mt-0.5 font-sans text-gray-500">Réf. {row.settlementReference}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {row.fboNomComplet}
                        <div className="text-xs text-gray-500">{row.fboNumero}</div>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{row.factureReference || "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatFcfa(row.amountFcfa)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            STAGES[row.stage]?.tone || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {STAGES[row.stage]?.label || row.stage}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.paidAt ? formatDateTime(row.paidAt) : "—"}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.fulfilledAt ? formatDateTime(row.fulfilledAt) : "—"}
                        {row.pickupRecipientName ? (
                          <div className="text-xs text-gray-500">{row.pickupRecipientName}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.rows.length ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Aucune commande sur la période.</p>
            ) : null}
          </div>
          {data.toInvoiceNow ? (
            <p className="text-xs text-gray-500">
              En ce moment, {data.toInvoiceNow} commande(s) marquée(s) attendent d'être facturées (toutes périodes).
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
