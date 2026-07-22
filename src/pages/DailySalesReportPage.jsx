import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Banknote,
  BarChart3,
  CalendarDays,
  ChevronDown,
  Download,
  FileText,
  Filter,
  Loader2,
  Printer,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  UserCheck,
  XCircle,
  Search,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { reportsService } from "../services/reportsService";
import { formatFcfa, formatDateTime } from "../lib/format";

// ==================== CONSTANTS ====================
const PAYMENT_MODE_OPTIONS = [
  { value: "", label: "Tous les modes" },
  { value: "ESPECES", label: "Espèces" },
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "ECOBANK_PAY", label: "Ecobank Pay" },
  { value: "PI_SPI", label: "PI SPI" },
];

const PERIOD_OPTIONS = [
  { value: "day", label: "Journalier" },
  { value: "week", label: "Hebdomadaire" },
  { value: "month", label: "Mensuel" },
  { value: "custom", label: "Personnalisé" },
];

const DETAIL_TABS = [
  { key: "overview", label: "Vue générale", icon: BarChart3 },
  { key: "monthly", label: "Évolution mensuelle", icon: CalendarDays },
  { key: "invoiced", label: "Préfacturation", icon: ReceiptText },
  { key: "paid", label: "Paiements", icon: Banknote },
  { key: "cancelled", label: "Annulations", icon: XCircle },
  { key: "pending", label: "À traiter", icon: Clock },
  { key: "submitted", label: "Soumissions", icon: FileText },
];

const STORAGE_KEY = "sales_report_filters";

// ==================== UTILS ====================
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatCount = (value) => new Intl.NumberFormat("fr-FR").format(Number(value || 0));

const formatMinutes = (value) => {
  if (value === null || value === undefined) return "-";
  const total = Math.max(0, Number(value) || 0);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours && minutes) return `${hours}h ${minutes}min`;
  if (hours) return `${hours}h`;
  return `${minutes}min`;
};

const humanize = (value) => {
  if (!value) return "Non renseigné";
  return String(value)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
};

const metricDelta = (metric, amount = false, negativeIsGood = false) => {
  const delta = amount ? Number(metric?.amountDeltaFcfa || 0) : Number(metric?.countDelta || 0);
  const percent = amount ? metric?.amountDeltaPercent : metric?.countDeltaPercent;
  const good = negativeIsGood ? delta <= 0 : delta >= 0;
  const tone = delta === 0 ? "neutral" : good ? "good" : "bad";
  return { delta, percent, tone, isUp: delta > 0, isDown: delta < 0 };
};

const safeRatio = (numerator, denominator) => {
  const num = Number(numerator || 0);
  const den = Number(denominator || 0);
  if (!den) return 0;
  return num / den;
};

const formatPercent = (value, digits = 0) => `${(Number(value || 0) * 100).toFixed(digits)}%`;

const formatAverageFcfa = (amount, count) => {
  const avg = safeRatio(amount, count);
  return formatFcfa(Math.round(avg));
};

// ==================== COMPONENTS ====================

const DeltaPill = ({ metric, amount = false, negativeIsGood = false }) => {
  const { delta, percent, tone, isUp, isDown } = metricDelta(metric, amount, negativeIsGood);
  const Icon = isDown ? TrendingDown : TrendingUp;
  const classes = {
    good: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    bad: "bg-red-50 text-red-700 ring-red-200",
    neutral: "bg-gray-100 text-gray-600 ring-gray-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ring-1 ${classes[tone]}`}>
      <Icon className="h-3 w-3" />
      {isUp && delta !== 0 ? "+" : ""}
      {amount ? formatFcfa(Math.abs(delta)) : formatCount(Math.abs(delta))}
      {percent !== null && percent !== undefined && percent !== 0 ? ` (${delta > 0 ? "+" : ""}${percent}%)` : ""}
    </span>
  );
};

const ExecutiveMetric = ({ 
  icon: Icon, 
  label, 
  value, 
  amount, 
  hint, 
  metric, 
  tone = "gray", 
  amountDelta = false, 
  negativeIsGood = false,
  loading = false 
}) => {
  const tones = {
    gray: "border-gray-200 bg-white hover:border-gray-300",
    blue: "border-blue-200 bg-blue-50/60 hover:bg-blue-50",
    green: "border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50",
    red: "border-red-200 bg-red-50/70 hover:bg-red-50",
  };
  
  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all duration-200 ${tones[tone] || tones.gray}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
          {loading ? (
            <div className="mt-2 h-8 w-24 animate-pulse rounded bg-gray-200" />
          ) : (
            <>
              <div className="mt-2 text-2xl font-bold text-gray-950">{value}</div>
              {amount && <div className="mt-1 text-sm font-medium text-gray-700">{amount}</div>}
            </>
          )}
        </div>
        <div className="rounded-xl bg-white p-2.5 text-gray-600 shadow-sm ring-1 ring-gray-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-gray-500">{hint || "vs. hier"}</span>
        {!loading && <DeltaPill metric={metric} amount={amountDelta} negativeIsGood={negativeIsGood} />}
      </div>
    </div>
  );
};

const AdvancedMetricCard = ({ label, value, hint, tone = "gray", icon: Icon = BarChart3 }) => {
  const tones = {
    gray: "border-gray-200 bg-white text-gray-900",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    green: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
    red: "border-red-200 bg-red-50 text-red-950",
  };
  return (
    <div className={`rounded-xl border p-4 ${tones[tone] || tones.gray}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{label}</div>
          <div className="mt-2 text-2xl font-bold">{value}</div>
          {hint ? <div className="mt-1 text-xs opacity-75">{hint}</div> : null}
        </div>
        <div className="rounded-lg bg-white/70 p-2 ring-1 ring-black/5">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
};

const PaymentMixPanel = ({ rows = [], totalAmount = 0 }) => {
  if (!rows.length) {
    return <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">Aucun paiement sur la période.</div>;
  }
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const amount = Number(row.amountFcfa || 0);
        const ratio = safeRatio(amount, totalAmount);
        return (
          <div key={row.key || row.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-gray-800">{humanize(row.key || row.label)}</span>
              <span className="text-xs font-semibold text-gray-600">
                {formatFcfa(amount)} · {formatPercent(ratio)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-100">
              <div className="h-2 rounded-full bg-gray-900" style={{ width: `${Math.max(3, ratio * 100)}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const MonthlyEvolutionPanel = ({ rows = [] }) => {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-500">
        Aucune donnée mensuelle disponible pour cette période.
      </div>
    );
  }
  const maxPaid = Math.max(...rows.map((row) => Number(row.paid?.amountFcfa || 0)), 1);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="text-sm font-bold text-gray-900">Chiffre d'affaires encaissé par mois</h3>
        <div className="mt-4 space-y-3">
          {rows.map((row) => {
            const amount = Number(row.paid?.amountFcfa || 0);
            const width = `${Math.max(3, (amount / maxPaid) * 100)}%`;
            return (
              <div key={row.key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-semibold text-gray-800">{row.label}</span>
                  <span className="font-bold text-gray-950">{formatFcfa(amount)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100">
                  <div className="h-2.5 rounded-full bg-[#FFC600]" style={{ width }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Mois</th>
              <th className="px-4 py-3 text-right">Soumises</th>
              <th className="px-4 py-3 text-right">Préfacturées</th>
              <th className="px-4 py-3 text-right">Payées</th>
              <th className="px-4 py-3 text-right">CA encaissé</th>
              <th className="px-4 py-3 text-right">Annulées</th>
              <th className="px-4 py-3 text-right">Taux enc.</th>
              <th className="px-4 py-3 text-right">Panier moyen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">{row.label}</td>
                <td className="px-4 py-3 text-right">{formatCount(row.submitted?.count)}</td>
                <td className="px-4 py-3 text-right">{formatCount(row.invoiced?.count)}</td>
                <td className="px-4 py-3 text-right">{formatCount(row.paid?.count)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatFcfa(row.paid?.amountFcfa || 0)}</td>
                <td className="px-4 py-3 text-right">{formatCount(row.cancelled?.count)}</td>
                <td className="px-4 py-3 text-right">{row.conversionRate || 0}%</td>
                <td className="px-4 py-3 text-right">{formatFcfa(row.averagePaidFcfa || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Section = ({ title, children, actions = null, className = "", icon: Icon }) => {
  return (
    <section className={`rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-5 w-5 text-gray-500" />}
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
};

const MiniBars = ({ rows = [], labelKey = "key", maxItems = 10 }) => {
  if (!rows.length) return <div className="py-8 text-center text-sm text-gray-500">Aucune donnée disponible</div>;
  
  const topRows = rows.slice(0, maxItems);
  const max = Math.max(...topRows.map((row) => Number(row.count || 0)), 1);
  
  return (
    <div className="space-y-4">
      {topRows.map((row) => {
        const label = row?.admin?.label || row[labelKey] || row.key;
        const count = Number(row.count || 0);
        const width = `${Math.max(8, (count / max) * 100)}%`;
        return (
          <div key={`${label}-${row.count}`} className="group space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="font-medium text-gray-800 truncate group-hover:text-gray-900">{humanize(label)}</span>
              <div className="flex gap-3 text-xs text-gray-600 whitespace-nowrap">
                <span className="font-semibold">{formatCount(count)} cmd</span>
                <span className="font-semibold">{formatFcfa(row.amountFcfa || 0)}</span>
              </div>
            </div>
            <div className="relative h-2.5 rounded-full bg-gray-100 overflow-hidden">
              <div 
                className="absolute h-full rounded-full bg-gradient-to-r from-[#FFC600] to-[#FFD633] transition-all duration-500" 
                style={{ width }}
              />
            </div>
          </div>
        );
      })}
      {rows.length > maxItems && (
        <p className="text-xs text-gray-500 text-center pt-2">+{rows.length - maxItems} autres</p>
      )}
    </div>
  );
};

const FlowStep = ({ label, value, amount, active = true, index, total }) => {
  return (
    <div className="relative flex-1">
      <div className={`rounded-lg border p-4 transition-all ${active ? "border-gray-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50"}`}>
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
        <div className="mt-1 text-xl font-bold text-gray-950">{formatCount(value)}</div>
        {amount !== undefined && <div className="mt-1 text-sm font-medium text-gray-600">{formatFcfa(amount || 0)}</div>}
      </div>
      {index < total - 1 && (
        <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 lg:block">
          <div className="h-0.5 w-8 bg-gradient-to-r from-gray-300 to-transparent" />
        </div>
      )}
    </div>
  );
};

const DailyFlow = ({ report }) => {
  const steps = [
    { label: "Soumises", value: report?.submitted?.count, amount: report?.submitted?.amountFcfa },
    { label: "Préfacturées", value: report?.invoiced?.count, amount: report?.invoiced?.amountFcfa },
    { label: "Payées", value: report?.paid?.count, amount: report?.paid?.amountFcfa },
    { label: "En préparation", value: report?.preparation?.launched?.count, amount: report?.preparation?.launched?.amountFcfa },
    { label: "Clôturées", value: report?.preparation?.fulfilled?.count, amount: report?.preparation?.fulfilled?.amountFcfa },
  ];
  
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
      {steps.map((step, index) => (
        <FlowStep 
          key={step.label} 
          {...step} 
          active={Number(step.value) > 0}
          index={index}
          total={steps.length}
        />
      ))}
    </div>
  );
};

const PriorityAlert = ({ title, count, amount, threshold, tone = "amber", onView }) => {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
    red: "border-red-200 bg-red-50 text-red-950 hover:bg-red-100",
    blue: "border-blue-200 bg-blue-50 text-blue-950 hover:bg-blue-100",
  };
  
  const hasAlert = count > 0;
  
  return (
    <div 
      className={`rounded-lg border p-4 transition-all cursor-pointer ${tones[tone] || tones.amber} ${!hasAlert && "opacity-60"}`}
      onClick={() => hasAlert && onView?.()}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {hasAlert && <AlertCircle className="h-4 w-4" />}
            <div className="text-sm font-bold">{title}</div>
          </div>
          <div className="mt-1 text-xs opacity-80">Seuil: {formatMinutes(threshold)}</div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${hasAlert ? "text-inherit" : "text-gray-500"}`}>
            {formatCount(count)}
          </div>
          <div className="text-xs font-semibold">{formatFcfa(amount || 0)}</div>
        </div>
      </div>
    </div>
  );
};

const OrdersTable = ({ rows = [], type = "generic", maxRows = 50, onViewOrder }) => {
  if (!rows.length) return <div className="py-12 text-center text-gray-500">Aucune commande à afficher</div>;
  
  const displayedRows = rows.slice(0, maxRows);
  const hasMore = rows.length > maxRows;
  
  const dateField = {
    submitted: "submittedAt",
    invoiced: "invoicedAt",
    paid: "paidAt",
    cancelled: "cancelledAt",
  }[type] || "preparationLaunchedAt";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Commande</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Client</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Mode</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-600">Montant</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Acteur</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-600">Date</th>
            {type === "cancelled" && <th className="px-4 py-3 text-left font-semibold text-gray-600">Motif</th>}
            {"ageMinutes" in (rows[0] || {}) && <th className="px-4 py-3 text-left font-semibold text-gray-600">Âge</th>}
            <th className="px-4 py-3 text-center font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {displayedRows.map((row) => {
            const actor = {
              invoiced: row.invoicedBy?.label,
              paid: row.cashier?.label,
              cancelled: row.cancelledBy?.label,
            }[type] || row.preparationLaunchedBy?.label;
            
            return (
                <tr key={`${type}-${row.id}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{row.preorderNumber || row.parcelNumber || row.id}</div>
                    {row.factureReference && <div className="text-xs text-gray-500 mt-0.5">AS400: {row.factureReference}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{row.fboNomComplet || "-"}</div>
                    <div className="text-xs text-gray-500">{row.fboNumero || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      {humanize(row.preorderPaymentMode)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">
                    {formatFcfa(row.as400InvoiceTotalFcfa || row.totalFcfa || 0)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{actor || "-"}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(row[dateField])}</td>
                  {type === "cancelled" && <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{row.cancelReason || "Non renseigné"}</td>}
                  {"ageMinutes" in row && <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                      <Clock className="h-3 w-3" />
                      {formatMinutes(row.ageMinutes)}
                    </span>
                  </td>}
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onViewOrder?.(row.id)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
            );
          })}
        </tbody>
      </table>
      {hasMore && (
        <div className="py-4 text-center text-sm text-gray-500 border-t">
          +{rows.length - maxRows} autres commandes non affichées
        </div>
      )}
    </div>
  );
};

const FiltersPanel = ({
  period,
  setPeriod,
  date,
  setDate,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  paymentMode,
  setPaymentMode,
  invoicerId,
  setInvoicerId,
  cashierId,
  setCashierId,
  knownInvoicers,
  knownCashiers,
  onLoad,
  onReset,
  loading,
}) => {
  const [localDate, setLocalDate] = useState(date);
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);

  useEffect(() => {
    setLocalDate(date);
  }, [date]);

  useEffect(() => {
    setLocalDateFrom(dateFrom);
    setLocalDateTo(dateTo);
  }, [dateFrom, dateTo]);
  
  const handleApply = () => {
    setDate(localDate);
    setDateFrom(localDateFrom);
    setDateTo(localDateTo);
    onLoad({ period, date: localDate, dateFrom: localDateFrom, dateTo: localDateTo });
  };
  
  const handleReset = () => {
    setLocalDate(todayIso());
    setLocalDateFrom(todayIso());
    setLocalDateTo(todayIso());
    setPeriod("day");
    setPaymentMode("");
    setInvoicerId("");
    setCashierId("");
    onReset({
      period: "day",
      date: todayIso(),
      dateFrom: todayIso(),
      dateTo: todayIso(),
      paymentMode: "",
      invoicerId: "",
      cashierId: "",
    });
  };
  
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <div>
          <label className="text-sm font-medium text-gray-700">Période</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
          >
            {PERIOD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {period === "custom" ? (
          <>
            <div>
              <label className="text-sm font-medium text-gray-700">Du</label>
              <input
                type="date"
                value={localDateFrom}
                onChange={(e) => {
                  setLocalDateFrom(e.target.value);
                  setDateFrom(e.target.value);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Au</label>
              <input
                type="date"
                value={localDateTo}
                onChange={(e) => {
                  setLocalDateTo(e.target.value);
                  setDateTo(e.target.value);
                }}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
              />
            </div>
          </>
        ) : (
          <div>
            <label className="text-sm font-medium text-gray-700">
              {period === "month" ? "Mois de référence" : period === "week" ? "Semaine de référence" : "Date"}
            </label>
            <input
              type="date"
              value={localDate}
              onChange={(e) => {
                setLocalDate(e.target.value);
                setDate(e.target.value);
              }}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
        )}
        <div>
          <label className="text-sm font-medium text-gray-700">Mode de paiement</label>
          <select 
            value={paymentMode} 
            onChange={(e) => setPaymentMode(e.target.value)} 
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
          >
            {PAYMENT_MODE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Facturier</label>
          <select 
            value={invoicerId} 
            onChange={(e) => setInvoicerId(e.target.value)} 
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
          >
            <option value="">Tous</option>
            {knownInvoicers.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Caissier</label>
          <select 
            value={cashierId} 
            onChange={(e) => setCashierId(e.target.value)} 
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
          >
            <option value="">Tous</option>
            {knownCashiers.map((admin) => (
              <option key={admin.id} value={admin.id}>
                {admin.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button 
            type="button" 
            onClick={handleApply} 
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Appliquer
          </button>
          <button 
            type="button" 
            onClick={handleReset} 
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, children, onClick, icon: Icon }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-2 text-sm font-semibold transition-all ${
        active 
          ? "border-black text-black" 
          : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
      }`}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
};

const PrintMiniBars = ({ title, rows = [] }) => (
  <div className="rounded-lg border border-gray-200 p-3">
    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
    {rows.length ? (
      <div className="mt-2 space-y-1.5">
        {rows.slice(0, 8).map((row) => {
          const label = row?.admin?.label || row.key || "Non renseigné";
          return (
            <div key={`${title}-${label}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-gray-700">{humanize(label)}</span>
              <span className="whitespace-nowrap text-gray-600">
                {formatCount(row.count)} • {formatFcfa(row.amountFcfa || 0)}
              </span>
            </div>
          );
        })}
      </div>
    ) : (
      <div className="mt-2 text-xs text-gray-500">Aucune donnée.</div>
    )}
  </div>
);

function isInvoicedOnReportDate(row, reportDateIso) {
  if (!row?.invoicedAt || !reportDateIso) return false;
  const invoicedDateIso = new Date(row.invoicedAt).toISOString().slice(0, 10);
  return invoicedDateIso === reportDateIso;
}

const PrintRowsTable = ({ title, rows = [], type, reportDateIso, highlightInvoicedToday = false, noCap = false }) => {
  const dateField = {
    submitted: "submittedAt",
    invoiced: "invoicedAt",
    paid: "paidAt",
    cancelled: "cancelledAt",
  }[type] || "submittedAt";
  const actorField = {
    invoiced: "invoicedBy",
    paid: "cashier",
    cancelled: "cancelledBy",
  }[type];
  const displayedRows = noCap ? rows : rows.slice(0, 18);

  return (
    <section className="mt-4 break-inside-avoid rounded-lg border border-gray-200 p-3">
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      {highlightInvoicedToday ? (
        <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-700">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-100 border border-emerald-300" />
          Préfacturée et payée le même jour
        </div>
      ) : null}
      {rows.length ? (
        <table className="mt-2 w-full border-collapse text-[10px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-2 py-1 text-left">Commande</th>
              <th className="px-2 py-1 text-left">Réf AS400</th>
              <th className="px-2 py-1 text-left">FBO</th>
              <th className="px-2 py-1 text-left">Mode</th>
              <th className="px-2 py-1 text-right">Montant</th>
              <th className="px-2 py-1 text-left">Acteur</th>
              <th className="px-2 py-1 text-left">Date</th>
            </tr>
          </thead>
          <tbody>
            {displayedRows.map((row) => {
              const highlighted = highlightInvoicedToday && isInvoicedOnReportDate(row, reportDateIso);
              return (
                <tr
                  key={`${title}-${row.id}`}
                  className={`border-b border-gray-100 ${highlighted ? "bg-emerald-50" : ""}`}
                >
                  <td className="px-2 py-1 font-semibold">{row.preorderNumber || row.parcelNumber || row.id}</td>
                  <td className="px-2 py-1">{row.factureReference || "-"}</td>
                  <td className="px-2 py-1">{row.fboNomComplet || "-"}<br />{row.fboNumero || "-"}</td>
                  <td className="px-2 py-1">{humanize(row.preorderPaymentMode)}</td>
                  <td className="px-2 py-1 text-right">{formatFcfa(row.as400InvoiceTotalFcfa || row.totalFcfa || 0)}</td>
                  <td className="px-2 py-1">{actorField ? row?.[actorField]?.label || "-" : "-"}</td>
                  <td className="px-2 py-1">{formatDateTime(row[dateField])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <div className="mt-2 text-xs text-gray-500">Aucune donnée.</div>
      )}
      {!noCap && rows.length > 18 ? (
        <div className="mt-2 text-xs text-gray-500">+{rows.length - 18} lignes dans l'export CSV.</div>
      ) : null}
    </section>
  );
};

const PrintableDailyReport = ({ report }) => {
  if (!report) return null;
  const periodLabel = report?.period?.label || report.date;
  const submittedCount = Number(report?.submitted?.count || 0);
  const invoicedCount = Number(report?.invoiced?.count || 0);
  const paidCount = Number(report?.paid?.count || 0);
  const cancelledCount = Number(report?.cancelled?.count || 0);
  const pendingInvoicedAmount = Number(report?.pending?.invoicedNotPaid?.amountFcfa || 0);
  const printableConversionRate = submittedCount ? `${Math.round((paidCount / submittedCount) * 100)}%` : "0%";
  const printablePriorityCounts = {
    submitted: report?.critical?.submittedNotInvoiced?.length || 0,
    invoiced: report?.critical?.invoicedNotPaid?.length || 0,
    paid: report?.critical?.paidNotLaunched?.length || 0,
  };
  return (
    <div className="print-report hidden">
      <div className="flex items-start justify-between border-b border-gray-300 pb-3">
        <div>
          <div className="text-xs font-semibold uppercase text-gray-500">Rapport commercial</div>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">Période : {periodLabel}</h1>
        </div>
        <div className="text-right text-xs text-gray-500">
          Généré le {new Date().toLocaleString("fr-FR")}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold uppercase text-gray-500">Soumises</div>
          <div className="text-xl font-bold">{formatCount(report.submitted?.count)}</div>
          <div className="text-xs text-gray-600">{formatFcfa(report.submitted?.amountFcfa || 0)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold uppercase text-gray-500">Préfacturées</div>
          <div className="text-xl font-bold">{formatCount(report.invoiced?.count)}</div>
          <div className="text-xs text-gray-600">{formatFcfa(report.invoiced?.amountFcfa || 0)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold uppercase text-gray-500">Encaissé</div>
          <div className="text-xl font-bold">{formatFcfa(report.paid?.amountFcfa || 0)}</div>
          <div className="text-xs text-gray-600">{formatCount(report.paid?.count)} commandes • {printableConversionRate}</div>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <div className="text-xs font-semibold uppercase text-gray-500">Annulées</div>
          <div className="text-xl font-bold">{formatCount(report.cancelled?.count)}</div>
          <div className="text-xs text-gray-600">{formatFcfa(report.cancelled?.amountFcfa || 0)}</div>
        </div>
      </div>

      <section className="mt-4 rounded-lg border border-gray-200 p-3">
        <h2 className="text-sm font-bold">Indicateurs avancés</h2>
        <div className="mt-2 grid grid-cols-5 gap-2 text-xs">
          <div>Préfacturation<br /><strong>{formatPercent(safeRatio(invoicedCount, submittedCount))}</strong></div>
          <div>Encaissement<br /><strong>{formatPercent(safeRatio(paidCount, invoicedCount || submittedCount))}</strong></div>
          <div>Annulation<br /><strong>{formatPercent(safeRatio(cancelledCount, submittedCount + cancelledCount))}</strong></div>
          <div>Panier encaissé<br /><strong>{formatAverageFcfa(report.paid?.amountFcfa, paidCount)}</strong></div>
          <div>Reste à encaisser<br /><strong>{formatFcfa(pendingInvoicedAmount)}</strong></div>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-gray-200 p-3">
        <h2 className="text-sm font-bold">Flux de la période</h2>
        <div className="mt-2 grid grid-cols-5 gap-2 text-xs">
          <div>Soumises<br /><strong>{formatCount(report.submitted?.count)}</strong></div>
          <div>Préfacturées<br /><strong>{formatCount(report.invoiced?.count)}</strong></div>
          <div>Payées<br /><strong>{formatCount(report.paid?.count)}</strong></div>
          <div>Préparation<br /><strong>{formatCount(report.preparation?.launched?.count)}</strong></div>
          <div>Clôturées<br /><strong>{formatCount(report.preparation?.fulfilled?.count)}</strong></div>
        </div>
      </section>

      {report.monthly?.rows?.length ? (
        <section className="mt-4 break-inside-avoid rounded-lg border border-gray-200 p-3">
          <h2 className="text-sm font-bold">Évolution mensuelle</h2>
          <table className="mt-2 w-full border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-2 py-1 text-left">Mois</th>
                <th className="px-2 py-1 text-right">Soumises</th>
                <th className="px-2 py-1 text-right">Préfacturées</th>
                <th className="px-2 py-1 text-right">Payées</th>
                <th className="px-2 py-1 text-right">CA encaissé</th>
                <th className="px-2 py-1 text-right">Annulées</th>
                <th className="px-2 py-1 text-right">Taux enc.</th>
              </tr>
            </thead>
            <tbody>
              {report.monthly.rows.map((row) => (
                <tr key={`print-${row.key}`} className="border-b border-gray-100">
                  <td className="px-2 py-1 font-semibold">{row.label}</td>
                  <td className="px-2 py-1 text-right">{formatCount(row.submitted?.count)}</td>
                  <td className="px-2 py-1 text-right">{formatCount(row.invoiced?.count)}</td>
                  <td className="px-2 py-1 text-right">{formatCount(row.paid?.count)}</td>
                  <td className="px-2 py-1 text-right">{formatFcfa(row.paid?.amountFcfa || 0)}</td>
                  <td className="px-2 py-1 text-right">{formatCount(row.cancelled?.count)}</td>
                  <td className="px-2 py-1 text-right">{row.conversionRate || 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      <section className="mt-4 rounded-lg border border-amber-200 p-3">
        <h2 className="text-sm font-bold">À traiter en priorité</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div>Soumises non préfacturées<br /><strong>{formatCount(printablePriorityCounts.submitted)}</strong></div>
          <div>Préfacturées non payées<br /><strong>{formatCount(printablePriorityCounts.invoiced)}</strong></div>
          <div>Payées non lancées<br /><strong>{formatCount(printablePriorityCounts.paid)}</strong></div>
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <PrintMiniBars title="Encaissement par mode" rows={report.paid?.byPaymentMode || []} />
        <PrintMiniBars title="Paiements par caissière" rows={report.paid?.byCashier || []} />
        <PrintMiniBars title="Préfacturation par facturier" rows={report.invoiced?.byInvoicer || []} />
        <PrintMiniBars title="Annulations par motif" rows={report.cancelled?.byReason || []} />
      </div>

      <PrintRowsTable
        title="Réconciliation caisse — Paiements validés sur la période"
        rows={report.paid?.rows || []}
        type="paid"
        reportDateIso={report.date}
        highlightInvoicedToday
        noCap
      />
      <PrintRowsTable title="Préfacturées sur la période" rows={report.invoiced?.rows || []} type="invoiced" />
      <PrintRowsTable title="Annulations sur la période" rows={report.cancelled?.rows || []} type="cancelled" />
    </div>
  );
};

const KpiCard = ({ title, value, trend, icon: Icon, color }) => {
  const colors = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    yellow: "bg-yellow-50 border-yellow-200",
    purple: "bg-purple-50 border-purple-200",
  };
  
  return (
    <div className={`rounded-lg border p-4 ${colors[color] || colors.blue}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-600">{title}</p>
          <p className="text-xl font-bold mt-1">{value}</p>
          {trend && <p className="text-xs mt-1">{trend}</p>}
        </div>
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
export default function DailySalesReportPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("day");
  const [date, setDate] = useState(todayIso());
  const [dateFrom, setDateFrom] = useState(todayIso());
  const [dateTo, setDateTo] = useState(todayIso());
  const [paymentMode, setPaymentMode] = useState("");
  const [invoicerId, setInvoicerId] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [report, setReport] = useState(null);
  const [printReportData, setPrintReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [knownInvoicers, setKnownInvoicers] = useState([]);
  const [knownCashiers, setKnownCashiers] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshInterval = useRef(null);
  const initialLoadRef = useRef(false);

  const saveFilters = useCallback((filters) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }, []);

  const load = useCallback(async (overrides = {}) => {
    const nextPeriod = overrides.period ?? period;
    const nextDate = overrides.date ?? date;
    const nextDateFrom = overrides.dateFrom ?? dateFrom;
    const nextDateTo = overrides.dateTo ?? dateTo;
    const nextPaymentMode = overrides.paymentMode ?? paymentMode;
    const nextInvoicerId = overrides.invoicerId ?? invoicerId;
    const nextCashierId = overrides.cashierId ?? cashierId;

    try {
      setLoading(true);
      setError("");
      const data = await reportsService.getDailySales({
        period: nextPeriod,
        date: nextDate,
        dateFrom: nextPeriod === "custom" ? nextDateFrom : undefined,
        dateTo: nextPeriod === "custom" ? nextDateTo : undefined,
        paymentMode: nextPaymentMode || undefined,
        invoicerId: nextInvoicerId || undefined,
        cashierId: nextCashierId || undefined,
      });
      setReport(data);
      setKnownInvoicers(prev => {
        const map = new Map(prev.map(a => [a.id, a]));
        (data?.performance?.byInvoicer || []).forEach((row) => {
          const admin = row?.admin;
          if (admin?.id) map.set(admin.id, admin);
        });
        return [...map.values()].sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
      });
      setKnownCashiers(prev => {
        const map = new Map(prev.map(a => [a.id, a]));
        (data?.performance?.byCashier || []).forEach((row) => {
          const admin = row?.admin;
          if (admin?.id) map.set(admin.id, admin);
        });
        return [...map.values()].sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
      });
      saveFilters({
        period: nextPeriod,
        date: nextDate,
        dateFrom: nextDateFrom,
        dateTo: nextDateTo,
        paymentMode: nextPaymentMode,
        invoicerId: nextInvoicerId,
        cashierId: nextCashierId,
      });
      return data;
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le rapport.");
      console.error("Load error:", e);
      return null;
    } finally {
      setLoading(false);
    }
  }, [period, date, dateFrom, dateTo, paymentMode, invoicerId, cashierId, saveFilters]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh) {
      refreshInterval.current = setInterval(load, 30000); // Refresh every 30 seconds
    } else if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }
    return () => refreshInterval.current && clearInterval(refreshInterval.current);
  }, [autoRefresh, load]);

  useEffect(() => {
    if (initialLoadRef.current) return;
    initialLoadRef.current = true;
    load();
  }, [load]);

  const conversionRate = useMemo(() => {
    const submitted = Number(report?.submitted?.count || 0);
    const paid = Number(report?.paid?.count || 0);
    if (!submitted) return "0%";
    return `${Math.round((paid / submitted) * 100)}%`;
  }, [report]);

  const priorityCounts = {
    submitted: report?.critical?.submittedNotInvoiced?.length || 0,
    invoiced: report?.critical?.invoicedNotPaid?.length || 0,
    paid: report?.critical?.paidNotLaunched?.length || 0,
  };
  const hasCritical = priorityCounts.submitted + priorityCounts.invoiced + priorityCounts.paid > 0;
  const advancedStats = useMemo(() => {
    const submittedCount = Number(report?.submitted?.count || 0);
    const submittedAmount = Number(report?.submitted?.amountFcfa || 0);
    const invoicedCount = Number(report?.invoiced?.count || 0);
    const invoicedAmount = Number(report?.invoiced?.amountFcfa || 0);
    const paidCount = Number(report?.paid?.count || 0);
    const paidAmount = Number(report?.paid?.amountFcfa || 0);
    const cancelledCount = Number(report?.cancelled?.count || 0);
    const cancelledAmount = Number(report?.cancelled?.amountFcfa || 0);
    const pendingSubmittedAmount = Number(report?.pending?.submittedNotInvoiced?.amountFcfa || 0);
    const pendingInvoicedAmount = Number(report?.pending?.invoicedNotPaid?.amountFcfa || 0);
    const pendingPaidAmount = Number(report?.pending?.paidNotLaunched?.amountFcfa || 0);
    return {
      invoiceRate: safeRatio(invoicedCount, submittedCount),
      cashRate: safeRatio(paidCount, invoicedCount || submittedCount),
      cancellationRate: safeRatio(cancelledCount, submittedCount + cancelledCount),
      submittedAverage: formatAverageFcfa(submittedAmount, submittedCount),
      paidAverage: formatAverageFcfa(paidAmount, paidCount),
      pendingCollectionAmount: pendingInvoicedAmount,
      operationalBacklogAmount: pendingSubmittedAmount + pendingInvoicedAmount + pendingPaidAmount,
      realizedNetAmount: paidAmount - cancelledAmount,
    };
  }, [report]);
  const reportPeriodLabel = report?.period?.label || date;
  const periodOptionLabel =
    PERIOD_OPTIONS.find((option) => option.value === (report?.period?.type || period))?.label ||
    "Rapport";

  const resetFilters = (nextFilters = null) => {
    const resetDate = nextFilters?.date || todayIso();
    const resetPeriod = nextFilters?.period || "day";
    const resetDateFrom = nextFilters?.dateFrom || todayIso();
    const resetDateTo = nextFilters?.dateTo || todayIso();
    setPaymentMode(nextFilters?.paymentMode || "");
    setInvoicerId(nextFilters?.invoicerId || "");
    setCashierId(nextFilters?.cashierId || "");
    setPeriod(resetPeriod);
    setDate(resetDate);
    setDateFrom(resetDateFrom);
    setDateTo(resetDateTo);
    localStorage.removeItem(STORAGE_KEY);
    load({
      period: resetPeriod,
      date: resetDate,
      dateFrom: resetDateFrom,
      dateTo: resetDateTo,
      paymentMode: nextFilters?.paymentMode || "",
      invoicerId: nextFilters?.invoicerId || "",
      cashierId: nextFilters?.cashierId || "",
    });
  };

  const currentFilterPayload = useCallback(() => ({
    period,
    date,
    dateFrom,
    dateTo,
    paymentMode,
    invoicerId,
    cashierId,
  }), [period, date, dateFrom, dateTo, paymentMode, invoicerId, cashierId]);

  const downloadCsv = async () => {
    const reportData = await load(currentFilterPayload());
    if (!reportData) return;
    const csvData = buildCsv(reportData);
    const blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport-ventes-${reportData.period?.type || period}-${reportData.date || date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = async () => {
    const reportData = await load(currentFilterPayload());
    if (!reportData) return;
    setPrintReportData(reportData);
    window.setTimeout(() => window.print(), 250);
  };

  const handleViewOrder = (orderId) => {
    if (!orderId) return;
    navigate(`/orders/${orderId}`);
  };

  const renderTab = () => {
    if (!report) return null;
    
    const tabsContent = {
      monthly: (
        <Section title="Évolution mensuelle de la période" icon={CalendarDays}>
          <MonthlyEvolutionPanel rows={report.monthly?.rows || []} />
        </Section>
      ),
      invoiced: (
        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <Section title="Préfacturation par facturier" icon={UserCheck}>
            <MiniBars rows={report.invoiced?.byInvoicer || []} />
          </Section>
          <Section title="Commandes préfacturées" icon={ReceiptText}>
            <OrdersTable rows={report.invoiced?.rows || []} type="invoiced" onViewOrder={handleViewOrder} />
          </Section>
        </div>
      ),
      paid: (
        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <div className="space-y-6">
            <Section title="Par mode de paiement" icon={Banknote}>
              <MiniBars rows={report.paid?.byPaymentMode || []} />
            </Section>
            <Section title="Par caissier" icon={UserCheck}>
              <MiniBars rows={report.paid?.byCashier || []} />
            </Section>
          </div>
          <Section title="Paiements validés" icon={CheckCircle}>
            <OrdersTable rows={report.paid?.rows || []} type="paid" onViewOrder={handleViewOrder} />
          </Section>
        </div>
      ),
      cancelled: (
        <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
          <div className="space-y-6">
            <Section title="Annulations par motif" icon={AlertTriangle}>
              <MiniBars rows={report.cancelled?.byReason || []} />
            </Section>
            <Section title="Annulations par acteur" icon={UserCheck}>
              <MiniBars rows={report.cancelled?.byActor || []} />
            </Section>
          </div>
          <Section title="Commandes annulées" icon={XCircle}>
            <OrdersTable rows={report.cancelled?.rows || []} type="cancelled" onViewOrder={handleViewOrder} />
          </Section>
        </div>
      ),
      pending: (
        <div className="grid gap-6 lg:grid-cols-3">
          <Section title={`Soumises non préfacturées > ${formatMinutes(report.critical?.thresholdsMinutes?.submittedNotInvoiced)}`} icon={Clock}>
            <OrdersTable rows={report.critical?.submittedNotInvoiced || []} type="submitted" maxRows={20} onViewOrder={handleViewOrder} />
          </Section>
          <Section title={`Préfacturées non payées > ${formatMinutes(report.critical?.thresholdsMinutes?.invoicedNotPaid)}`} icon={Clock}>
            <OrdersTable rows={report.critical?.invoicedNotPaid || []} type="invoiced" maxRows={20} onViewOrder={handleViewOrder} />
          </Section>
          <Section title={`Payées non lancées > ${formatMinutes(report.critical?.thresholdsMinutes?.paidNotLaunched)}`} icon={Clock}>
            <OrdersTable rows={report.critical?.paidNotLaunched || []} type="paid" maxRows={20} onViewOrder={handleViewOrder} />
          </Section>
        </div>
      ),
      submitted: (
        <Section title="Commandes soumises" icon={FileText}>
          <OrdersTable rows={report.submitted?.rows || []} type="submitted" onViewOrder={handleViewOrder} />
        </Section>
      ),
      overview: (
        <>
          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Performance opérationnelle" icon={BarChart3}>
              <div className="grid gap-4 md:grid-cols-3">
                <KpiCard 
                  title="Soumission → Préfacturation" 
                  value={formatMinutes(report.performance?.averageSubmitToInvoiceMinutes)}
                  icon={Clock}
                  color="blue"
                />
                <KpiCard 
                  title="Préfacturation → Paiement" 
                  value={formatMinutes(report.performance?.averageInvoiceToPaymentMinutes)}
                  icon={Clock}
                  color="green"
                />
                <KpiCard 
                  title="Paiement → Préparation" 
                  value={formatMinutes(report.performance?.averagePaymentToPreparationMinutes)}
                  icon={Clock}
                  color="purple"
                />
              </div>
            </Section>
            <Section title={`Comparaison avec ${report.comparison?.previousDay?.label || "la période précédente"} (${report.comparison?.previousDay?.date || "-"})`} icon={TrendingUp}>
              <div className="grid gap-4 md:grid-cols-2">
                <ExecutiveMetric 
                  icon={ShoppingCart} 
                  label="Soumissions" 
                  value={formatCount(report.submitted?.count)} 
                  metric={report.comparison?.previousDay?.submitted}
                  loading={loading}
                />
                <ExecutiveMetric 
                  icon={ReceiptText} 
                  label="Préfacturations" 
                  value={formatCount(report.invoiced?.count)} 
                  metric={report.comparison?.previousDay?.invoiced}
                  loading={loading}
                />
                <ExecutiveMetric 
                  icon={Banknote} 
                  label="Encaissement" 
                  value={formatFcfa(report.paid?.amountFcfa || 0)} 
                  metric={report.comparison?.previousDay?.paid} 
                  amountDelta
                  loading={loading}
                />
                <ExecutiveMetric 
                  icon={XCircle} 
                  label="Annulations" 
                  value={formatCount(report.cancelled?.count)} 
                  metric={report.comparison?.previousDay?.cancelled} 
                  negativeIsGood
                  loading={loading}
                />
              </div>
            </Section>
          </div>
          <div className="mt-6">
            <Section title="Détail des opérations" icon={ReceiptText}>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-3">Top 5 des facturiers</h3>
                  <MiniBars rows={report.performance?.byInvoicer?.slice(0, 5) || []} />
                </div>
                <div>
                  <h3 className="font-semibold mb-3">Top 5 des caissiers</h3>
                  <MiniBars rows={report.performance?.byCashier?.slice(0, 5) || []} />
                </div>
              </div>
            </Section>
          </div>
        </>
      ),
    };
    
    return tabsContent[activeTab] || tabsContent.overview;
  };

  // Build CSV data
  const buildCsv = (reportData) => {
    const escapeCsv = (value) => {
      const raw = String(value ?? "");
      return `"${raw.replace(/"/g, '""')}"`;
    };
    
    const lines = [
      ["Section", "Commande", "Ref AS400", "FBO", "Numero FBO", "Mode paiement", "Montant", "Acteur", "Date", "Motif"].map(escapeCsv).join(","),
    ];

    if (reportData?.monthly?.rows?.length) {
      lines.push("");
      lines.push(["Evolution mensuelle"].map(escapeCsv).join(","));
      lines.push([
        "Mois",
        "Soumises",
        "Montant soumis",
        "Prefacturees",
        "Montant prefacture",
        "Payees",
        "CA encaisse",
        "Annulees",
        "Montant annule",
        "Taux encaissement",
        "Panier moyen encaisse",
      ].map(escapeCsv).join(","));
      reportData.monthly.rows.forEach((row) => {
        lines.push([
          row.label,
          row.submitted?.count || 0,
          row.submitted?.amountFcfa || 0,
          row.invoiced?.count || 0,
          row.invoiced?.amountFcfa || 0,
          row.paid?.count || 0,
          row.paid?.amountFcfa || 0,
          row.cancelled?.count || 0,
          row.cancelled?.amountFcfa || 0,
          `${row.conversionRate || 0}%`,
          row.averagePaidFcfa || 0,
        ].map(escapeCsv).join(","));
      });
      lines.push("");
    }
    
    const append = (section, rows, dateField, actorField) => {
      rows?.forEach((row) => {
        lines.push([
          section,
          row.preorderNumber || row.parcelNumber || row.id,
          row.factureReference || "",
          row.fboNomComplet || "",
          row.fboNumero || "",
          humanize(row.preorderPaymentMode),
          row.as400InvoiceTotalFcfa || row.totalFcfa || 0,
          row?.[actorField]?.label || "",
          row[dateField] ? formatDateTime(row[dateField]) : "",
          row.cancelReason || "",
        ].map(escapeCsv).join(","));
      });
    };
    
    append("Soumises", reportData?.submitted?.rows, "submittedAt", "invoicedBy");
    append("Prefacturees", reportData?.invoiced?.rows, "invoicedAt", "invoicedBy");
    append("Payees", reportData?.paid?.rows, "paidAt", "cashier");
    append("Annulees", reportData?.cancelled?.rows, "cancelledAt", "cancelledBy");
    
    return lines.join("\n");
  };

  return (
    <div className="daily-report-print space-y-6 max-w-[1600px] mx-auto p-6">
      <style>{`
        @page { 
          size: A4 landscape; 
          margin: 12mm;
        }
        @media print {
          body { background: #fff !important; }
          body * { visibility: hidden !important; }
          .print-report, .print-report * { visibility: visible !important; }
          .print-report {
            display: block !important;
            position: absolute !important;
            inset: 0 auto auto 0 !important;
            width: 100% !important;
            color: #111827 !important;
            background: #fff !important;
            padding: 0 !important;
          }
          .screen-report, .print-hidden, .print-toolbar { display: none !important; }
          .daily-report-print {
            color: #111827 !important;
            padding: 0 !important;
          }
          .print-report section,
          .print-report .rounded-lg {
            break-inside: avoid;
            box-shadow: none !important;
          }
          .print-report table { font-size: 9px !important; }
          .print-report th,
          .print-report td { padding: 4px 6px !important; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      <PrintableDailyReport report={printReportData || report} />

      <div className="screen-report space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Rapports
              </span>
              <span>•</span>
              <span className="font-medium text-gray-700">{periodOptionLabel}</span>
              <span>•</span>
              <span className="font-medium text-gray-700">{reportPeriodLabel}</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">Rapports commerciaux</h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-500">
              Vue de pilotage des commandes, encaissements, annulations et blocages opérationnels
            </p>
          </div>
          
          <div className="print-hidden flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen(prev => !prev)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                filtersOpen 
                  ? "border-black bg-black text-white" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter className="h-4 w-4" />
              Filtres
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`} />
            </button>
            
            <button
              type="button"
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-all ${
                autoRefresh 
                  ? "border-green-500 bg-green-50 text-green-700" 
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <RefreshCw className={`h-4 w-4 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto (30s)" : "Auto"}
            </button>
            
            <button 
              type="button" 
              onClick={load} 
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Actualiser
            </button>
            
            <button 
              type="button" 
              onClick={downloadCsv} 
              disabled={!report}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              CSV
            </button>
            
            <button 
              type="button" 
              onClick={printReport}
              disabled={!report}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              PDF
            </button>
          </div>
        </div>

        {filtersOpen && (
          <div className="animate-fade-in">
            <FiltersPanel
              period={period}
              setPeriod={setPeriod}
              date={date}
              setDate={setDate}
              dateFrom={dateFrom}
              setDateFrom={setDateFrom}
              dateTo={dateTo}
              setDateTo={setDateTo}
              paymentMode={paymentMode}
              setPaymentMode={setPaymentMode}
              invoicerId={invoicerId}
              setInvoicerId={setInvoicerId}
              cashierId={cashierId}
              setCashierId={setCashierId}
              knownInvoicers={knownInvoicers}
              knownCashiers={knownCashiers}
              onLoad={load}
              onReset={resetFilters}
              loading={loading}
            />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <span className="font-semibold">Erreur</span>
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && !report && (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-gray-400" />
          <p>Chargement du rapport...</p>
        </div>
      )}

      {/* Main Content */}
      {report && (
        <div className="animate-fade-in space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <ExecutiveMetric
              icon={ShoppingCart}
              label="Commandes soumises"
              value={formatCount(report.submitted?.count)}
              amount={formatFcfa(report.submitted?.amountFcfa || 0)}
              metric={report.comparison?.previousDay?.submitted}
              loading={loading}
            />
            <ExecutiveMetric
              icon={ReceiptText}
              label="Préfacturées"
              value={formatCount(report.invoiced?.count)}
              amount={formatFcfa(report.invoiced?.amountFcfa || 0)}
              hint={`${formatCount(report.invoiced?.fromPreviousDays)} des jours précédents`}
              metric={report.comparison?.previousDay?.invoiced}
              tone="blue"
              loading={loading}
            />
            <ExecutiveMetric
              icon={Banknote}
              label="Encaissé"
              value={formatFcfa(report.paid?.amountFcfa || 0)}
              amount={`${formatCount(report.paid?.count)} commandes • Taux de conversion ${conversionRate}`}
              metric={report.comparison?.previousDay?.paid}
              tone="green"
              amountDelta
              loading={loading}
            />
            <ExecutiveMetric
              icon={XCircle}
              label="Commandes annulées"
              value={formatCount(report.cancelled?.count)}
              amount={formatFcfa(report.cancelled?.amountFcfa || 0)}
              metric={report.comparison?.previousDay?.cancelled}
              tone="red"
              negativeIsGood
              loading={loading}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
            <Section title="Indicateurs avancés" icon={BarChart3}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AdvancedMetricCard
                  icon={ReceiptText}
                  label="Taux de préfacturation"
                  value={formatPercent(advancedStats.invoiceRate)}
                  hint="Préfacturées / soumises"
                  tone="blue"
                />
                <AdvancedMetricCard
                  icon={Banknote}
                  label="Taux d'encaissement"
                  value={formatPercent(advancedStats.cashRate)}
                  hint="Payées / préfacturées"
                  tone="green"
                />
                <AdvancedMetricCard
                  icon={XCircle}
                  label="Taux d'annulation"
                  value={formatPercent(advancedStats.cancellationRate)}
                  hint="Annulées / total traité"
                  tone={advancedStats.cancellationRate > 0.08 ? "red" : "gray"}
                />
                <AdvancedMetricCard
                  icon={ShoppingCart}
                  label="Panier moyen soumis"
                  value={advancedStats.submittedAverage}
                  hint={`Panier moyen encaissé : ${advancedStats.paidAverage}`}
                  tone="amber"
                />
                <AdvancedMetricCard
                  icon={AlertTriangle}
                  label="Reste à encaisser"
                  value={formatFcfa(advancedStats.pendingCollectionAmount)}
                  hint="Préfacturées non payées"
                  tone={advancedStats.pendingCollectionAmount > 0 ? "red" : "green"}
                />
                <AdvancedMetricCard
                  icon={Clock}
                  label="Charge bloquée"
                  value={formatFcfa(advancedStats.operationalBacklogAmount)}
                  hint="Soumises, impayées et payées non lancées"
                  tone={advancedStats.operationalBacklogAmount > 0 ? "amber" : "green"}
                />
                <AdvancedMetricCard
                  icon={CheckCircle}
                  label="Net réalisé"
                  value={formatFcfa(advancedStats.realizedNetAmount)}
                  hint="Encaissement moins annulations"
                  tone="green"
                />
                <AdvancedMetricCard
                  icon={UserCheck}
                  label="Productivité"
                  value={formatMinutes(report.performance?.averageSubmitToInvoiceMinutes)}
                  hint="Délai moyen soumission → préfacturation"
                  tone="gray"
                />
              </div>
            </Section>
            <Section title="Mix d'encaissement" icon={Banknote}>
              <PaymentMixPanel rows={report.paid?.byPaymentMode || []} totalAmount={report.paid?.amountFcfa || 0} />
            </Section>
          </div>

          {/* Flow */}
          <Section title="Flux des commandes sur la période" icon={CalendarDays}>
            <DailyFlow report={report} />
          </Section>

          {/* Priority Alerts */}
          <Section
            title="Alertes prioritaires"
            className={hasCritical ? "border-amber-200 bg-amber-50/30" : ""}
            actions={
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
                hasCritical ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                <AlertTriangle className="h-3.5 w-3.5" />
                {hasCritical 
                  ? `${formatCount(priorityCounts.submitted + priorityCounts.invoiced + priorityCounts.paid)} commande(s) en attente` 
                  : "Aucune alerte critique"}
              </span>
            }
          >
            <div className="grid gap-4 md:grid-cols-3">
              <PriorityAlert
                title="Soumises non préfacturées"
                count={priorityCounts.submitted}
                amount={report.pending?.submittedNotInvoiced?.amountFcfa}
                threshold={report.critical?.thresholdsMinutes?.submittedNotInvoiced}
                tone={priorityCounts.submitted ? "amber" : "blue"}
                onView={() => setActiveTab("pending")}
              />
              <PriorityAlert
                title="Préfacturées non payées"
                count={priorityCounts.invoiced}
                amount={report.pending?.invoicedNotPaid?.amountFcfa}
                threshold={report.critical?.thresholdsMinutes?.invoicedNotPaid}
                tone={priorityCounts.invoiced ? "red" : "blue"}
                onView={() => setActiveTab("pending")}
              />
              <PriorityAlert
                title="Payées non lancées"
                count={priorityCounts.paid}
                amount={report.pending?.paidNotLaunched?.amountFcfa}
                threshold={report.critical?.thresholdsMinutes?.paidNotLaunched}
                tone={priorityCounts.paid ? "amber" : "blue"}
                onView={() => setActiveTab("pending")}
              />
            </div>
          </Section>

          {/* Tabs Section */}
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto border-b border-gray-200 bg-gray-50/50 px-4">
              <div className="flex min-w-max gap-1">
                {DETAIL_TABS.map((tab) => (
                  <TabButton 
                    key={tab.key} 
                    active={activeTab === tab.key} 
                    onClick={() => setActiveTab(tab.key)}
                    icon={tab.icon}
                  >
                    {tab.label}
                  </TabButton>
                ))}
              </div>
            </div>
            <div className="p-6">
              {renderTab()}
            </div>
          </div>
          
          {/* Footer Info */}
          <div className="text-center text-xs text-gray-400 pt-4 print-hidden">
            Dernière mise à jour: {new Date().toLocaleString('fr-FR')}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
