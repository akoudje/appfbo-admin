// admin-app/src/pages/billing/BillingSupervisionPage.jsx
// Supervision de la facturation (responsable facturation, directeur
// commercial, admins) : état de la file et une ligne par facturier
// (connexion, charge, dernière activité, bilan de la période).

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { ordersService } from "../../services/ordersService";
import { formatFcfa, formatDateTime } from "../../lib/format";

const PRESETS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "custom", label: "Période" },
];

// Connecté mais sans action tracée depuis ce délai : signalé comme inactif.
const IDLE_MINUTES = 30;
const REFRESH_MS = 30000;

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

function minutesSince(value) {
  if (!value) return null;
  return Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
}

function formatAgo(value) {
  const minutes = minutesSince(value);
  if (minutes === null) return "Aucune activité récente";
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h ${String(minutes % 60).padStart(2, "0")}`;
  return formatDateTime(value);
}

function SummaryCard({ label, value, sub, tone = "gray" }) {
  const tones = {
    gray: "border-gray-200",
    amber: "border-amber-300 bg-amber-50",
    red: "border-red-300 bg-red-50",
    emerald: "border-emerald-200",
    blue: "border-blue-200",
  };
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-sm tabular-nums text-gray-600">{sub}</div> : null}
    </div>
  );
}

function PresenceBadge({ row }) {
  if (!row.connected) {
    return <span className="inline-flex items-center gap-1 text-xs text-gray-500">○ Hors ligne</span>;
  }
  const idle = minutesSince(row.lastActivityAt);
  if (idle === null || idle >= IDLE_MINUTES) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
        ● Connecté, inactif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      ● Connecté
    </span>
  );
}

function LoadBar({ load, maxActive }) {
  const ratio = maxActive ? Math.min(1, load / maxActive) : 0;
  return (
    <div className="min-w-[6rem]">
      <div className="text-sm tabular-nums text-gray-900">
        {load} / {maxActive}
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full ${ratio >= 1 ? "bg-amber-500" : "bg-blue-500"}`}
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingSupervisionPage() {
  const [preset, setPreset] = useState("today");
  const [range, setRange] = useState(() => presetRange("today"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        setData(await ordersService.getBillingSupervision({ from: range.from, to: range.to }));
      } catch (e) {
        setError(e?.response?.data?.message || "Impossible de charger la supervision.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [range.from, range.to],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Connexions et charges bougent en continu : rafraîchissement discret.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [load]);

  const choosePreset = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };

  const queue = data?.queue;
  const totals = data?.totals;
  const oldestWait = minutesSince(queue?.oldestSubmittedAt);
  const reportLink = (row) => `/billing/report?invoicerId=${row.id}&from=${range.from}&to=${range.to}`;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Supervision de la facturation</h1>
            <p className="mt-1 text-sm text-gray-500">
              Activité des facturiers. Connexions et charges se mettent à jour toutes les 30 secondes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 self-start rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Rafraîchir
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label="En file, non attribués"
              value={queue.unassigned}
              sub={
                queue.unassigned
                  ? `Le plus ancien attend depuis ${formatAgo(queue.oldestSubmittedAt).replace("il y a ", "")}`
                  : "Aucun dossier en attente"
              }
              tone={queue.unassigned && oldestWait >= 30 ? "amber" : "gray"}
            />
            <SummaryCard
              label="Urgences / contentieux"
              value={queue.escalated}
              tone={queue.escalated ? "red" : "gray"}
            />
            <SummaryCard
              label="Facturiers connectés"
              value={`${totals.connected} / ${data.invoicers.length}`}
              sub={`${totals.load} dossier${totals.load > 1 ? "s" : ""} à facturer en cours`}
              tone="blue"
            />
            <SummaryCard
              label="Facturés sur la période"
              value={totals.invoiced.count}
              sub={formatFcfa(totals.invoiced.amountFcfa)}
            />
            <SummaryCard
              label="Payés sur la période"
              value={totals.paid.count}
              sub={`${formatFcfa(totals.paid.amountFcfa)} · comptoir ${formatFcfa(totals.counter.amountFcfa)}`}
              tone="emerald"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Facturier</th>
                    <th className="px-4 py-3 font-medium">Présence</th>
                    <th className="px-4 py-3 font-medium">À facturer</th>
                    <th className="px-4 py-3 text-right font-medium">Reçus</th>
                    <th className="px-4 py-3 text-right font-medium">Facturés</th>
                    <th className="px-4 py-3 text-right font-medium">Payés</th>
                    <th className="px-4 py-3 text-right font-medium">Comptoir</th>
                    <th className="px-4 py-3 text-right font-medium">Préparation</th>
                    <th className="px-4 py-3 text-right font-medium">Attente paiement</th>
                    <th className="px-4 py-3 text-right font-medium">Annulés</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {data.invoicers.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100 align-top">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.fullName || row.email}</div>
                        <div className="text-xs text-gray-500">
                          {row.autoDispatch ? "Facturier caissier" : "Facturier"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <PresenceBadge row={row} />
                        <div className="mt-1 text-xs text-gray-500">{formatAgo(row.lastActivityAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <LoadBar load={row.load} maxActive={row.maxActive} />
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.received}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div>{row.invoiced.count}</div>
                        <div className="text-xs text-gray-500">{formatFcfa(row.invoiced.amountFcfa)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div>{row.paid.count}</div>
                        <div className="text-xs text-gray-500">{formatFcfa(row.paid.amountFcfa)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div>{formatFcfa(row.counter.amountFcfa)}</div>
                        <div className="text-xs text-gray-500">{row.counter.count} enc.</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{row.preparationLaunched}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div>{row.waitingPayment.count}</div>
                        <div className="text-xs text-gray-500">{formatFcfa(row.waitingPayment.amountFcfa)}</div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <div>{row.cancelled.count}</div>
                        {row.cancelled.expiredCount ? (
                          <div className="text-xs text-amber-700">dont {row.cancelled.expiredCount} expirés</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={reportLink(row)}
                          className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Voir le bilan
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.invoicers.length ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Aucun facturier actif dans ce pays.</p>
            ) : null}
          </div>
          <p className="text-xs text-gray-500">
            Les dossiers se réattribuent depuis la page Facturation (menu « Attribuer à… » sur chaque dossier).
          </p>
        </div>
      ) : null}
    </div>
  );
}
