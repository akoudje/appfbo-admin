import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  { value: "", label: "Tous les modes", icon: "💰" },
  { value: "ESPECES", label: "Espèces", icon: "💵" },
  { value: "WAVE", label: "Wave", icon: "📱" },
  { value: "ORANGE_MONEY", label: "Orange Money", icon: "📱" },
  { value: "BANK_TRANSFER", label: "Virement bancaire", icon: "🏦" },
];

const DETAIL_TABS = [
  { key: "overview", label: "Vue générale", icon: BarChart3 },
  { key: "invoiced", label: "Préfacturation", icon: ReceiptText },
  { key: "paid", label: "Paiements", icon: Banknote },
  { key: "cancelled", label: "Annulations", icon: XCircle },
  { key: "pending", label: "À traiter", icon: Clock },
  { key: "submitted", label: "Soumissions", icon: FileText },
];

const STORAGE_KEY = "daily_report_filters";

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
  const [expandedRows, setExpandedRows] = useState(new Set());
  
  if (!rows.length) return <div className="py-12 text-center text-gray-500">Aucune commande à afficher</div>;
  
  const displayedRows = rows.slice(0, maxRows);
  const hasMore = rows.length > maxRows;
  
  const dateField = {
    submitted: "submittedAt",
    invoiced: "invoicedAt",
    paid: "paidAt",
    cancelled: "cancelledAt",
  }[type] || "preparationLaunchedAt";

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
            const isExpanded = expandedRows.has(row.id);
            const actor = {
              invoiced: row.invoicedBy?.label,
              paid: row.cashier?.label,
              cancelled: row.cancelledBy?.label,
            }[type] || row.preparationLaunchedBy?.label;
            
            return (
              <>
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
                {isExpanded && (
                  <tr className="bg-gray-50">
                    <td colSpan={type === "cancelled" ? 9 : 8} className="px-4 py-3">
                      <div className="text-sm">
                        <div className="font-semibold mb-2">Détails de la commande</div>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>ID: {row.id}</div>
                          <div>Type: {row.preorderType || "Standard"}</div>
                          <div>Produits: {row.itemsCount || "N/A"}</div>
                          <div>Statut: {row.status || "En cours"}</div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </>
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
  date,
  setDate,
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
  
  const handleApply = () => {
    setDate(localDate);
    onLoad();
  };
  
  const handleReset = () => {
    setLocalDate(todayIso());
    setPaymentMode("");
    setInvoicerId("");
    setCashierId("");
    onReset();
  };
  
  return (
    <div className="space-y-4 pt-4 border-t border-gray-200">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div>
          <label className="text-sm font-medium text-gray-700">Date</label>
          <input 
            type="date" 
            value={localDate} 
            onChange={(e) => setLocalDate(e.target.value)} 
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Mode de paiement</label>
          <select 
            value={paymentMode} 
            onChange={(e) => setPaymentMode(e.target.value)} 
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:ring-1 focus:ring-black"
          >
            {PAYMENT_MODE_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.icon} {option.label}
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
  const [date, setDate] = useState(todayIso());
  const [paymentMode, setPaymentMode] = useState("");
  const [invoicerId, setInvoicerId] = useState("");
  const [cashierId, setCashierId] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [knownInvoicers, setKnownInvoicers] = useState([]);
  const [knownCashiers, setKnownCashiers] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshInterval = useRef(null);

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        if (filters.paymentMode) setPaymentMode(filters.paymentMode);
        if (filters.invoicerId) setInvoicerId(filters.invoicerId);
        if (filters.cashierId) setCashierId(filters.cashierId);
      } catch (e) {}
    }
  }, []);

  // Save filters to localStorage
  const saveFilters = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      paymentMode,
      invoicerId,
      cashierId,
    }));
  }, [paymentMode, invoicerId, cashierId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await reportsService.getDailySales({
        date,
        paymentMode: paymentMode || undefined,
        invoicerId: invoicerId || undefined,
        cashierId: cashierId || undefined,
      });
      setReport(data);
      setKnownInvoicers(prev => {
        const map = new Map(prev.map(a => [a.id, a]));
        (data?.performance?.byInvoicer || []).forEach(a => a.id && map.set(a.id, a));
        return [...map.values()].sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
      });
      setKnownCashiers(prev => {
        const map = new Map(prev.map(a => [a.id, a]));
        (data?.performance?.byCashier || []).forEach(a => a.id && map.set(a.id, a));
        return [...map.values()].sort((a, b) => String(a.label || "").localeCompare(String(b.label || "")));
      });
      saveFilters();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le rapport quotidien.");
      console.error("Load error:", e);
    } finally {
      setLoading(false);
    }
  }, [date, paymentMode, invoicerId, cashierId, saveFilters]);

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

  const resetFilters = () => {
    setPaymentMode("");
    setInvoicerId("");
    setCashierId("");
    setDate(todayIso());
    localStorage.removeItem(STORAGE_KEY);
    load();
  };

  const downloadCsv = () => {
    if (!report) return;
    const csvData = buildCsv(report);
    const blob = new Blob(["\uFEFF" + csvData], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rapport-ventes-${report.date || date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleViewOrder = (orderId) => {
    // Implement order detail modal or navigation
    console.log("View order:", orderId);
    // You can open a modal or navigate to order details page
  };

  const renderTab = () => {
    if (!report) return null;
    
    const tabsContent = {
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
            <Section title={`Comparaison avec la veille (${report.comparison?.previousDay?.date || "-"})`} icon={TrendingUp}>
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
      ["Section", "Commande", "FBO", "Numero FBO", "Mode paiement", "Montant", "Acteur", "Date", "Motif"].map(escapeCsv).join(","),
    ];
    
    const append = (section, rows, dateField, actorField) => {
      rows?.forEach((row) => {
        lines.push([
          section,
          row.preorderNumber || row.parcelNumber || row.id,
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
          .print-hidden, .print-toolbar { display: none !important; }
          .daily-report-print { 
            color: #111827 !important;
            padding: 0 !important;
          }
          .daily-report-print section, 
          .daily-report-print .rounded-xl { 
            break-inside: avoid; 
            box-shadow: none !important;
            border: 1px solid #e5e7eb !important;
          }
          .daily-report-print table { font-size: 9px !important; }
          .daily-report-print th, 
          .daily-report-print td { padding: 6px 8px !important; }
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>📊 Rapports</span>
              <span>•</span>
              <span className="font-medium text-gray-700">{report?.date || date}</span>
            </div>
            <h1 className="mt-2 text-3xl font-bold text-gray-950">Rapport quotidien des ventes</h1>
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
              onClick={() => window.print()} 
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
              date={date}
              setDate={setDate}
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
          <p>Chargement du rapport quotidien...</p>
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

          {/* Daily Flow */}
          <Section title="Flux quotidien des commandes" icon={CalendarDays}>
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
  );
}