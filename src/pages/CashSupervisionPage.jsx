// admin-app/src/pages/CashSupervisionPage.jsx
// Supervision caisse (responsable caisse) : point de caisse de tous les
// encaissements de la plateforme — précommandes, billets d'événement, liens
// hors précommande et frais d'expédition — par jour, semaine, mois ou
// période, par moyen de paiement et par facturier. Un encaissement de
// précommande est attribué au facturier qui l'a facturée (règle validée par
// la direction), quel que soit le moyen de paiement.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, RefreshCw } from "lucide-react";
import { reportsService } from "../services/reportsService";
import { formatFcfa, formatDateTime } from "../lib/format";

const PERIODS = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "custom", label: "Période" },
];

const SOURCES = [
  { key: "", label: "Toutes les sources" },
  { key: "PREORDER", label: "Précommandes" },
  { key: "TICKET", label: "Billets d'événement" },
  { key: "EXTERNAL_LINK", label: "Liens hors précommande" },
  { key: "SHIPPING", label: "Frais d'expédition" },
];

const SOURCE_LABELS = Object.fromEntries(SOURCES.map((item) => [item.key, item.label]));

const PAYMENT_MODES = {
  ESPECES: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  BANK_TRANSFER: "Virement bancaire",
  ECOBANK_PAY: "Ecobank Pay",
  PI_SPI: "PI SPI",
  TPE_CARD: "TPE / Carte bancaire",
};

// Le journal peut compter plusieurs milliers de lignes sur un mois : on en
// affiche une page à la fois, l'export contient tout.
const JOURNAL_PAGE = 200;
// Rafraîchissement automatique du point du jour (encaissements Wave en continu).
const LIVE_REFRESH_MS = 60_000;

function isoDay(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function deltaText(current, previous) {
  if (!previous) return null;
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent >= 0 ? "+" : ""}${percent} % vs période précédente (${formatFcfa(previous)})`;
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

function BreakdownTable({ title, groups, total, note, onSelect, selectedKey }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {note ? <p className="mt-0.5 text-xs text-gray-500">{note}</p> : null}
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th className="px-4 py-2 font-medium" />
            <th className="px-4 py-2 text-right font-medium">Nb</th>
            <th className="px-4 py-2 text-right font-medium">Encaissé</th>
            <th className="px-4 py-2 text-right font-medium">Part</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr
              key={group.key}
              className={`border-t border-gray-100 ${onSelect ? "cursor-pointer hover:bg-gray-50" : ""} ${
                selectedKey === group.key ? "bg-blue-50" : ""
              }`}
              onClick={onSelect ? () => onSelect(group.key) : undefined}
            >
              <td className="px-4 py-2 text-gray-800">{group.label}</td>
              <td className="px-4 py-2 text-right tabular-nums">{group.count}</td>
              <td className="px-4 py-2 text-right tabular-nums">
                {formatFcfa(group.amountFcfa)}
                {group.serviceFeeFcfa ? (
                  <div className="text-xs text-gray-500">dont frais {formatFcfa(group.serviceFeeFcfa)}</div>
                ) : null}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-gray-500">
                {total ? `${Math.round((group.amountFcfa / total) * 100)} %` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!groups.length ? <p className="px-4 py-4 text-center text-sm text-gray-500">Aucun encaissement.</p> : null}
    </div>
  );
}

function RowLink({ row }) {
  if (row.source === "PREORDER") {
    return (
      <Link to={`/orders/${row.id}`} className="text-blue-700 hover:underline">
        {row.reference}
      </Link>
    );
  }
  return row.reference || "—";
}

export default function CashSupervisionPage() {
  const [period, setPeriod] = useState("day");
  const [date, setDate] = useState(() => isoDay(new Date()));
  const [range, setRange] = useState(() => ({ from: isoDay(new Date()), to: isoDay(new Date()) }));
  const [filters, setFilters] = useState({ source: "", paymentMode: "", invoicerId: "" });
  const [invoicers, setInvoicers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(JOURNAL_PAGE);

  const params = useMemo(() => {
    const base = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    return period === "custom"
      ? { ...base, period, dateFrom: range.from, dateTo: range.to }
      : { ...base, period, date };
  }, [period, date, range.from, range.to, filters]);

  const isLive = period === "day" && date === isoDay(new Date());

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      setError("");
      try {
        const report = await reportsService.getCashSupervision(params);
        setData(report);
        // Liste des facturiers mémorisée tant qu'aucun filtre facturier n'est
        // posé, pour ne pas la réduire au seul facturier sélectionné.
        if (!params.invoicerId) {
          setInvoicers(
            report.byInvoicer
              .filter((group) => group.key !== "UNASSIGNED")
              .map((group) => ({ id: group.key, label: group.label })),
          );
        }
      } catch (e) {
        setError(e?.response?.data?.message || "Impossible de charger le point de caisse.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [params],
  );

  useEffect(() => {
    setVisible(JOURNAL_PAGE);
    load();
  }, [load]);

  useEffect(() => {
    if (!isLive) return undefined;
    const timer = setInterval(() => load({ silent: true }), LIVE_REFRESH_MS);
    return () => clearInterval(timer);
  }, [isLive, load]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const toggleFilter = (key, value) =>
    setFilters((current) => ({ ...current, [key]: current[key] === value ? "" : value }));

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await reportsService.exportCashSupervision(params);
      const disposition = String(response.headers?.["content-disposition"] || "");
      const fileName = disposition.match(/filename="([^"]+)"/)?.[1] || "point-de-caisse.csv";
      const url = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Impossible de générer l'export du point de caisse.");
    } finally {
      setExporting(false);
    }
  };

  const journal = useMemo(() => {
    const rows = data?.rows || [];
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.reference, row.customer, row.detail, row.invoicer?.label, row.cashier?.label]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [data, search]);

  const totals = data?.totals;
  const bySource = Object.fromEntries((data?.bySource || []).map((group) => [group.key, group]));
  const modeOptions = useMemo(() => {
    const keys = new Set([...Object.keys(PAYMENT_MODES), ...(data?.byPaymentMode || []).map((g) => g.key)]);
    if (filters.paymentMode) keys.add(filters.paymentMode);
    return [...keys];
  }, [data, filters.paymentMode]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Supervision caisse</h1>
            <p className="mt-1 text-sm text-gray-500">
              Point de caisse de tous les encaissements : précommandes, billets, liens hors précommande et frais
              d'expédition. Une précommande est comptée au facturier qui l'a facturée.
            </p>
          </div>
          <div className="flex gap-2 self-start">
            <button
              type="button"
              onClick={() => load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Rafraîchir
            </button>
            <button
              type="button"
              onClick={exportCsv}
              disabled={exporting || !data?.rows?.length}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {exporting ? "Export…" : "Exporter (Excel)"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {PERIODS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setPeriod(item.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                period === item.key
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          {period === "custom" ? (
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
          ) : (
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
              aria-label="Date de référence"
            />
          )}
          {data?.period?.label ? (
            <span className="text-xs text-gray-500">
              {isLive ? "Aujourd'hui · mise à jour automatique chaque minute" : data.period.label}
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={filters.source}
            onChange={(e) => setFilter("source", e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
            aria-label="Source"
          >
            {SOURCES.map((item) => (
              <option key={item.key} value={item.key}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={filters.paymentMode}
            onChange={(e) => setFilter("paymentMode", e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
            aria-label="Moyen de paiement"
          >
            <option value="">Tous les moyens de paiement</option>
            {modeOptions.map((key) => (
              <option key={key} value={key}>
                {PAYMENT_MODES[key] || key}
              </option>
            ))}
          </select>
          <select
            value={filters.invoicerId}
            onChange={(e) => setFilter("invoicerId", e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-1.5 text-sm"
            aria-label="Facturier"
          >
            <option value="">Tous les facturiers</option>
            {invoicers.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          {filters.source || filters.paymentMode || filters.invoicerId ? (
            <button
              type="button"
              onClick={() => setFilters({ source: "", paymentMode: "", invoicerId: "" })}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Effacer les filtres
            </button>
          ) : null}
        </div>
        {filters.invoicerId ? (
          <p className="mt-2 text-xs text-gray-500">
            Filtre facturier : billets et paiements QR exclus (ils n'ont pas de facturier).
          </p>
        ) : null}
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
              label="Total encaissé"
              value={formatFcfa(totals.amountFcfa)}
              sub={
                <>
                  {totals.count} encaissement(s)
                  {deltaText(totals.amountFcfa, data.previousTotals?.amountFcfa) ? (
                    <div className="text-xs text-gray-500">
                      {deltaText(totals.amountFcfa, data.previousTotals.amountFcfa)}
                    </div>
                  ) : null}
                </>
              }
              tone="emerald"
            />
            <SummaryCard
              label="Précommandes"
              value={formatFcfa(bySource.PREORDER?.amountFcfa)}
              sub={`${bySource.PREORDER?.count || 0} commande(s) · emballage ${formatFcfa(data.packaging.amountFcfa)}`}
            />
            <SummaryCard
              label="Billets d'événement"
              value={formatFcfa(bySource.TICKET?.amountFcfa)}
              sub={`${bySource.TICKET?.count || 0} commande(s) de billets`}
            />
            <SummaryCard
              label="Frais de service"
              value={formatFcfa(totals.serviceFeeFcfa)}
              sub={`Hors frais : ${formatFcfa(totals.baseAmountFcfa)}`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard
              label="Liens hors précommande"
              value={formatFcfa(bySource.EXTERNAL_LINK?.amountFcfa)}
              sub={`${bySource.EXTERNAL_LINK?.count || 0} paiement(s) QR ou lien admin`}
            />
            <SummaryCard
              label="Frais d'expédition"
              value={formatFcfa(bySource.SHIPPING?.amountFcfa)}
              sub={`${bySource.SHIPPING?.count || 0} expédition(s) payée(s)`}
            />
          </div>

          {data.settledElsewhere?.count ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              Hors caisse : {data.settledElsewhere.count} précommande(s) réglée(s) par une autre filiale (
              {formatFcfa(data.settledElsewhere.amountFcfa)}), non comptées ici.
            </p>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-3">
            <BreakdownTable
              title="Par moyen de paiement"
              groups={data.byPaymentMode}
              total={totals.amountFcfa}
              note="Cliquez sur une ligne pour filtrer."
              selectedKey={filters.paymentMode}
              onSelect={(key) => toggleFilter("paymentMode", key)}
            />
            <BreakdownTable
              title="Par facturier"
              groups={data.byInvoicer}
              total={totals.amountFcfa}
              note="Précommandes facturées et liens créés par chacun."
              selectedKey={filters.invoicerId}
              onSelect={(key) => key !== "UNASSIGNED" && toggleFilter("invoicerId", key)}
            />
            <BreakdownTable
              title="Billets par événement"
              groups={data.ticketsByEvent}
              total={bySource.TICKET?.amountFcfa}
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Journal des encaissements ({journal.length})
              </h2>
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisible(JOURNAL_PAGE);
                }}
                placeholder="Référence, client, facturier…"
                className="w-full rounded-xl border border-gray-300 px-3 py-1.5 text-sm sm:w-72"
                aria-label="Rechercher dans le journal"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">Encaissé le</th>
                    <th className="px-4 py-3 font-medium">Source</th>
                    <th className="px-4 py-3 font-medium">Référence</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Moyen</th>
                    <th className="px-4 py-3 font-medium">Facturier</th>
                    <th className="px-4 py-3 text-right font-medium">Encaissé</th>
                  </tr>
                </thead>
                <tbody>
                  {journal.slice(0, visible).map((row) => (
                    <tr key={`${row.source}-${row.id}`} className="border-t border-gray-100 align-top">
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">{formatDateTime(row.paidAt)}</td>
                      <td className="px-4 py-2 text-gray-700">{SOURCE_LABELS[row.source] || row.source}</td>
                      <td className="px-4 py-2 font-mono text-xs">
                        <RowLink row={row} />
                        {row.detail ? <div className="mt-0.5 font-sans text-gray-500">{row.detail}</div> : null}
                      </td>
                      <td className="px-4 py-2 text-gray-800">{row.customer || "—"}</td>
                      <td className="px-4 py-2 text-gray-700">{PAYMENT_MODES[row.paymentMode] || row.paymentMode}</td>
                      <td className="px-4 py-2 text-gray-700">
                        {row.invoicer?.label || "—"}
                        {row.cashier ? <div className="text-xs text-gray-500">Caisse : {row.cashier.label}</div> : null}
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums">
                        {formatFcfa(row.amountFcfa)}
                        {row.serviceFeeFcfa ? (
                          <div className="text-xs text-gray-500">dont frais {formatFcfa(row.serviceFeeFcfa)}</div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!journal.length ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Aucun encaissement sur la période.</p>
            ) : null}
            {journal.length > visible ? (
              <div className="border-t border-gray-100 px-4 py-3 text-center">
                <button
                  type="button"
                  onClick={() => setVisible((n) => n + JOURNAL_PAGE)}
                  className="text-sm font-medium text-blue-700 hover:underline"
                >
                  Afficher {Math.min(JOURNAL_PAGE, journal.length - visible)} de plus ({journal.length - visible}{" "}
                  restant(s), l'export contient tout)
                </button>
              </div>
            ) : null}
            {data.rowsTruncated ? (
              <p className="border-t border-gray-100 px-4 py-2 text-xs text-amber-800">
                Détail limité à {data.detailRowsLimit} lignes par source : réduisez la période pour un journal complet.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
