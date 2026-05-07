import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  Loader2,
  ReceiptText,
  ShoppingCart,
  UserCheck,
  XCircle,
} from "lucide-react";
import { reportsService } from "../services/reportsService";
import { formatFcfa, formatDateTime } from "../lib/format";

function todayIso() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatCount(value) {
  return new Intl.NumberFormat("fr-FR").format(Number(value || 0));
}

function formatMinutes(value) {
  if (value === null || value === undefined) return "-";
  const total = Math.max(0, Number(value) || 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}h${String(minutes).padStart(2, "0")}`;
  if (hours) return `${hours}h`;
  return `${minutes} min`;
}

function humanize(value) {
  return String(value || "Non renseigné")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

function StatCard({ icon: Icon, label, value, hint, tone = "gray" }) {
  const tones = {
    gray: "border-gray-200 bg-white text-gray-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
  };
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
          {hint ? <div className="mt-1 text-xs text-gray-600">{hint}</div> : null}
        </div>
        <Icon className="h-5 w-5 text-gray-500" />
      </div>
    </div>
  );
}

function Section({ title, children, actions = null }) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function MiniBars({ rows = [], labelKey = "key" }) {
  if (!rows.length) return <div className="text-sm text-gray-500">Aucune donnée.</div>;
  const max = Math.max(...rows.map((row) => Number(row.count || 0)), 1);
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const label = row?.admin?.label || row[labelKey] || row.key;
        const width = `${Math.max(8, (Number(row.count || 0) / max) * 100)}%`;
        return (
          <div key={`${label}-${row.count}`} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-gray-800">{humanize(label)}</span>
              <span className="whitespace-nowrap text-gray-600">
                {formatCount(row.count)} • {formatFcfa(row.amountFcfa || 0)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-[#FFC600]" style={{ width }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function OrdersTable({ rows = [], type = "generic" }) {
  if (!rows.length) return <div className="text-sm text-gray-500">Aucune commande.</div>;
  const dateField =
    type === "submitted"
      ? "submittedAt"
      : type === "invoiced"
        ? "invoicedAt"
        : type === "paid"
          ? "paidAt"
          : type === "cancelled"
            ? "cancelledAt"
            : "preparationLaunchedAt";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Commande</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">FBO</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Mode</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-600">Montant</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Acteur</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-600">Date</th>
            {type === "cancelled" ? (
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Motif</th>
            ) : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {rows.map((row) => {
            const actor =
              type === "invoiced"
                ? row.invoicedBy?.label
                : type === "paid"
                  ? row.cashier?.label
                  : type === "cancelled"
                    ? row.cancelledBy?.label
                    : row.preparationLaunchedBy?.label;
            return (
              <tr key={`${type}-${row.id}`} className="hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold text-gray-900">
                  {row.preorderNumber || row.parcelNumber || row.id}
                  {row.factureReference ? (
                    <div className="text-xs font-normal text-gray-500">AS400 {row.factureReference}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium text-gray-800">{row.fboNomComplet || "-"}</div>
                  <div className="text-xs text-gray-500">{row.fboNumero || "-"}</div>
                </td>
                <td className="px-3 py-2">{humanize(row.preorderPaymentMode)}</td>
                <td className="px-3 py-2 text-right font-semibold">
                  {formatFcfa(row.as400InvoiceTotalFcfa || row.totalFcfa || 0)}
                </td>
                <td className="px-3 py-2">{actor || "-"}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatDateTime(row[dateField])}</td>
                {type === "cancelled" ? (
                  <td className="px-3 py-2">{row.cancelReason || "Motif non renseigné"}</td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function escapeCsv(value) {
  const raw = String(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

function buildCsv(report) {
  const lines = [
    ["Section", "Commande", "FBO", "Numero FBO", "Mode paiement", "Montant", "Acteur", "Date", "Motif"].map(escapeCsv).join(","),
  ];
  const append = (section, rows, dateField, actorField) => {
    rows.forEach((row) => {
      lines.push(
        [
          section,
          row.preorderNumber || row.parcelNumber || row.id,
          row.fboNomComplet || "",
          row.fboNumero || "",
          humanize(row.preorderPaymentMode),
          row.as400InvoiceTotalFcfa || row.totalFcfa || 0,
          row?.[actorField]?.label || "",
          row[dateField] ? formatDateTime(row[dateField]) : "",
          row.cancelReason || "",
        ]
          .map(escapeCsv)
          .join(","),
      );
    });
  };
  append("Soumises", report?.submitted?.rows || [], "submittedAt", "invoicedBy");
  append("Prefacturees", report?.invoiced?.rows || [], "invoicedAt", "invoicedBy");
  append("Payees", report?.paid?.rows || [], "paidAt", "cashier");
  append("Annulees", report?.cancelled?.rows || [], "cancelledAt", "cancelledBy");
  return lines.join("\n");
}

export default function DailySalesReportPage() {
  const [date, setDate] = useState(todayIso());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await reportsService.getDailySales({ date });
      setReport(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le rapport quotidien.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conversionRate = useMemo(() => {
    const submitted = Number(report?.submitted?.count || 0);
    const paid = Number(report?.paid?.count || 0);
    if (!submitted) return "0%";
    return `${Math.round((paid / submitted) * 100)}%`;
  }, [report]);

  const downloadCsv = () => {
    if (!report) return;
    const blob = new Blob([buildCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport-ventes-${report.date || date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Rapport quotidien de vente</h1>
          <p className="mt-1 text-sm text-gray-500">
            Synthèse des soumissions, préfacturations, paiements, annulations et restes à traiter.
          </p>
        </div>
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-sm sm:flex-row sm:items-end">
          <label className="text-sm font-medium text-gray-700">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            Charger
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={!report}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading && !report ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          Chargement du rapport...
        </div>
      ) : report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={ShoppingCart} label="Commandes soumises" value={formatCount(report.submitted?.count)} hint={formatFcfa(report.submitted?.amountFcfa || 0)} />
            <StatCard icon={ReceiptText} label="Préfacturées" value={formatCount(report.invoiced?.count)} hint={`${formatCount(report.invoiced?.fromPreviousDays)} venant des jours précédents`} tone="blue" />
            <StatCard icon={Banknote} label="Payées / encaissées" value={formatFcfa(report.paid?.amountFcfa || 0)} hint={`${formatCount(report.paid?.count)} commandes • conversion ${conversionRate}`} tone="green" />
            <StatCard icon={XCircle} label="Annulées" value={formatCount(report.cancelled?.count)} hint={formatFcfa(report.cancelled?.amountFcfa || 0)} tone="red" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard icon={AlertTriangle} label="Soumises non préfacturées" value={formatCount(report.pending?.submittedNotInvoiced?.count)} hint={formatFcfa(report.pending?.submittedNotInvoiced?.amountFcfa || 0)} tone="amber" />
            <StatCard icon={FileText} label="Préfacturées non payées" value={formatCount(report.pending?.invoicedNotPaid?.count)} hint={formatFcfa(report.pending?.invoicedNotPaid?.amountFcfa || 0)} tone="amber" />
            <StatCard icon={UserCheck} label="Payées non lancées" value={formatCount(report.pending?.paidNotLaunched?.count)} hint={formatFcfa(report.pending?.paidNotLaunched?.amountFcfa || 0)} tone="amber" />
          </div>

          <Section title="Performance de la journée">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard icon={BarChart3} label="Soumission → préfacturation" value={formatMinutes(report.performance?.averageSubmitToInvoiceMinutes)} />
              <StatCard icon={BarChart3} label="Préfacturation → paiement" value={formatMinutes(report.performance?.averageInvoiceToPaymentMinutes)} />
              <StatCard icon={BarChart3} label="Paiement → préparation" value={formatMinutes(report.performance?.averagePaymentToPreparationMinutes)} />
            </div>
          </Section>

          <div className="grid gap-4 xl:grid-cols-2">
            <Section title="Répartition paiements">
              <MiniBars rows={report.paid?.byPaymentMode || []} />
            </Section>
            <Section title="Paiements par caissière">
              <MiniBars rows={report.paid?.byCashier || []} />
            </Section>
            <Section title="Préfacturation par facturier">
              <MiniBars rows={report.invoiced?.byInvoicer || []} />
            </Section>
            <Section title="Annulations par motif">
              <MiniBars rows={report.cancelled?.byReason || []} />
            </Section>
          </div>

          <Section title="Commandes préfacturées aujourd'hui">
            <OrdersTable rows={report.invoiced?.rows || []} type="invoiced" />
          </Section>
          <Section title="Paiements validés aujourd'hui">
            <OrdersTable rows={report.paid?.rows || []} type="paid" />
          </Section>
          <Section title="Commandes annulées aujourd'hui">
            <OrdersTable rows={report.cancelled?.rows || []} type="cancelled" />
          </Section>
          <Section title="Commandes soumises aujourd'hui">
            <OrdersTable rows={report.submitted?.rows || []} type="submitted" />
          </Section>
        </>
      ) : null}
    </div>
  );
}
