// admin-app/src/pages/billing/BillingReportPage.jsx
// « Mon bilan » : activité d'un facturier (caissier) sur la journée, la
// semaine, le mois ou une période choisie. Un superviseur peut consulter le
// bilan de chaque facturier.

import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Printer, RefreshCw } from "lucide-react";
import { ordersService } from "../../services/ordersService";
import useAdminAuth from "../../hooks/useAdminAuth";
import { BILLING_SUPERVISOR_ROLES as SUPERVISOR_ROLES } from "../../auth/workspaces";
import { formatFcfa, formatDateTime } from "../../lib/format";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const MODE_LABELS = {
  ESPECES: "Espèces",
  CASH: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  BANK_TRANSFER: "Virement bancaire",
  VIREMENT: "Virement bancaire",
  ECOBANK_PAY: "Ecobank Pay",
  PI_SPI: "PI SPI",
  AUTRE: "Autre",
};

const EVENT_LABELS = {
  FACTUREE: { label: "Facturée", className: "bg-blue-50 text-blue-700 border-blue-200" },
  PAYEE: { label: "Payée", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PREPARATION: { label: "En préparation", className: "bg-violet-50 text-violet-700 border-violet-200" },
  ANNULEE: { label: "Annulée", className: "bg-gray-100 text-gray-700 border-gray-200" },
  EXPIREE: { label: "Expirée (non payée)", className: "bg-amber-50 text-amber-800 border-amber-200" },
};

const PRESETS = [
  { key: "today", label: "Aujourd'hui" },
  { key: "week", label: "Cette semaine" },
  { key: "month", label: "Ce mois" },
  { key: "custom", label: "Période" },
];

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

function formatDay(value) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  return `${d}/${m}/${y}`;
}

function StatCard({ label, value, sub, tone = "gray" }) {
  const tones = {
    gray: "border-gray-200",
    blue: "border-blue-200",
    emerald: "border-emerald-200",
    violet: "border-violet-200",
    amber: "border-amber-200",
  };
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-sm tabular-nums text-gray-600">{sub}</div> : null}
    </div>
  );
}

function ModeBreakdown({ title, rows }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {rows?.length ? (
        <table className="mt-2 w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr key={row.mode} className="border-t border-gray-100">
                <td className="py-1.5 text-gray-700">{MODE_LABELS[row.mode] || row.mode}</td>
                <td className="py-1.5 text-right tabular-nums text-gray-500">{row.count}</td>
                <td className="py-1.5 text-right font-medium tabular-nums text-gray-900">{formatFcfa(row.amountFcfa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="mt-2 text-sm text-gray-500">Rien sur la période.</p>
      )}
    </div>
  );
}

export default function BillingReportPage() {
  const { admin, role } = useAdminAuth();
  const isSupervisor = SUPERVISOR_ROLES.includes(role);
  // Lien « Voir le bilan » de la supervision : facturier et période en paramètres.
  const [searchParams] = useSearchParams();
  const linkedFrom = searchParams.get("from");
  const linkedTo = searchParams.get("to");
  const linkedRange = DAY_PATTERN.test(linkedFrom || "") && DAY_PATTERN.test(linkedTo || "");
  const [preset, setPreset] = useState(linkedRange ? "custom" : "today");
  const [range, setRange] = useState(() =>
    linkedRange ? { from: linkedFrom, to: linkedTo } : presetRange("today"),
  );
  const [invoicers, setInvoicers] = useState([]);
  const [invoicerId, setInvoicerId] = useState(() => searchParams.get("invoicerId") || "");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isSupervisor) return;
    ordersService
      .listBillingInvoicers()
      .then((data) => {
        const list = data?.invoicers || [];
        setInvoicers(list);
        setInvoicerId((current) => current || list[0]?.id || "");
      })
      .catch(() => setInvoicers([]));
  }, [isSupervisor]);

  const load = useCallback(async () => {
    if (isSupervisor && !invoicerId) return;
    setLoading(true);
    setError("");
    try {
      const data = await ordersService.getBillingReport({
        from: range.from,
        to: range.to,
        ...(isSupervisor ? { invoicerId } : {}),
      });
      setReport(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le bilan.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, invoicerId, isSupervisor]);

  useEffect(() => {
    load();
  }, [load]);

  const choosePreset = (key) => {
    setPreset(key);
    if (key !== "custom") setRange(presetRange(key));
  };

  const selectedInvoicer = invoicers.find((item) => item.id === invoicerId);
  const subjectName = isSupervisor
    ? selectedInvoicer?.fullName || selectedInvoicer?.email || "—"
    : admin?.fullName || admin?.email || "";
  const periodLabel =
    report?.period && report.period.from === report.period.to
      ? `le ${formatDay(report.period.from)}`
      : report?.period
        ? `du ${formatDay(report.period.from)} au ${formatDay(report.period.to)}`
        : "";
  const testCount = (report?.orders || []).filter((order) => order.isTest).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{isSupervisor ? "Bilan des facturiers" : "Mon bilan"}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {subjectName}
              {periodLabel ? ` · ${periodLabel}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
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
              onClick={() => window.print()}
              disabled={!report}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              Imprimer
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
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
          {isSupervisor ? (
            <select
              value={invoicerId}
              onChange={(e) => setInvoicerId(e.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm"
              aria-label="Facturier"
            >
              {invoicers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.connected ? "● " : "○ "}
                  {item.fullName || item.email}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {loading && !report ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">Calcul du bilan…</div>
      ) : null}

      {report ? (
        <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Dossiers reçus" value={report.received.count} sub="Attribués sur la période" />
            <StatCard
              label="Facturés"
              value={report.invoiced.count}
              sub={formatFcfa(report.invoiced.amountFcfa)}
              tone="blue"
            />
            <StatCard
              label="Payés"
              value={report.paid.count}
              sub={formatFcfa(report.paid.amountFcfa)}
              tone="emerald"
            />
            <StatCard
              label="Encaissé au comptoir"
              value={formatFcfa(report.counter.amountFcfa)}
              sub={`${report.counter.count} encaissement${report.counter.count > 1 ? "s" : ""}`}
              tone="emerald"
            />
            <StatCard
              label="Lancés en préparation"
              value={report.preparationLaunched.count}
              sub={formatFcfa(report.preparationLaunched.amountFcfa)}
              tone="violet"
            />
            <StatCard
              label="Annulés"
              value={report.cancelled.count}
              sub={`dont ${report.cancelled.expiredCount} expiré${report.cancelled.expiredCount > 1 ? "s" : ""} faute de paiement`}
              tone="amber"
            />
            <StatCard
              label="Libérés / escaladés"
              value={`${report.released.count} / ${report.escalated.count}`}
              sub="Dossiers rendus à la file / escaladés"
            />
            <StatCard
              label="En ce moment"
              value={`${report.now.toInvoice} à facturer`}
              sub={`${report.now.waitingPayment.count} en attente de paiement (${formatFcfa(report.now.waitingPayment.amountFcfa)})`}
              tone="blue"
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <ModeBreakdown title="Paiements reçus par mode" rows={report.paid.byMode} />
            <ModeBreakdown title="Encaissements au comptoir par mode" rows={report.counter.byMode} />
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Détail des commandes</h2>
              <span className="text-xs text-gray-500">
                {report.orders.length} commande{report.orders.length > 1 ? "s" : ""}
                {report.ordersTruncated ? " (500 premières)" : ""}
                {testCount ? ` · dont ${testCount} de test` : ""}
              </span>
            </div>
            {report.orders.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-2 font-medium">Commande</th>
                      <th className="px-4 py-2 font-medium">Client</th>
                      <th className="px-4 py-2 text-right font-medium">Montant</th>
                      <th className="px-4 py-2 font-medium">Sur la période</th>
                      <th className="px-4 py-2 font-medium">Facturée / payée</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.orders.map((order) => (
                      <tr key={order.id} className="border-t border-gray-100 align-top">
                        <td className="px-4 py-2">
                          <Link to={`/orders/${order.id}`} className="font-medium text-blue-700 hover:underline">
                            {order.preorderNumber || order.id}
                          </Link>
                          {order.factureReference ? (
                            <div className="text-xs text-gray-500">Facture {order.factureReference}</div>
                          ) : null}
                          {order.isTest ? (
                            <span className="mt-1 inline-block rounded border border-gray-300 bg-gray-50 px-1.5 text-[11px] font-semibold text-gray-600">
                              TEST
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2">
                          <div>{order.fboNomComplet || "—"}</div>
                          <div className="text-xs text-gray-500">FBO {order.fboNumero || "—"}</div>
                        </td>
                        <td className="px-4 py-2 text-right tabular-nums">{formatFcfa(order.amountFcfa)}</td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {order.events.map((event) => (
                              <span
                                key={event}
                                className={`rounded-full border px-2 py-0.5 text-xs font-medium ${EVENT_LABELS[event]?.className || ""}`}
                              >
                                {EVENT_LABELS[event]?.label || event}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-600">
                          <div>{order.invoicedAt ? formatDateTime(order.invoicedAt) : "—"}</div>
                          <div>{order.paidAt ? formatDateTime(order.paidAt) : "—"}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-gray-500">Aucune commande facturée, payée ou lancée sur la période.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
