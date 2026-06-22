import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cashClosureService } from "../services/cashClosureService";
import { formatFcfa } from "../lib/format";

// ============ CONSTANTS & HELPERS ============
const PERIOD_OPTIONS = [
  { value: "day", label: "Jour", icon: CalendarDays },
  { value: "week", label: "Semaine", icon: CalendarDays },
  { value: "month", label: "Mois", icon: CalendarDays },
  { value: "custom", label: "Période personnalisée", icon: CalendarDays },
];

const PAYMENT_MODE_ICONS = {
  ESPECES: Banknote,
  WAVE: Smartphone,
  ORANGE_MONEY: Smartphone,
  TPE_CARD: CreditCard,
  BANK_TRANSFER: Landmark,
  ECOBANK_PAY: Smartphone,
  PI_SPI: Smartphone,
  MTN_MOMO: Smartphone,
  MOOV_MONEY: Smartphone,
};

const STATUS_CONFIG = {
  DRAFT: { label: "Brouillon", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  SUBMITTED: { label: "Soumise", className: "bg-blue-50 text-blue-700 ring-blue-200" },
  APPROVED: { label: "Validée ✅", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  REJECTED: { label: "Rejetée ❌", className: "bg-red-50 text-red-700 ring-red-200" },
};

// ============ UTILITY FUNCTIONS ============
const todayIso = () => new Date().toISOString().split('T')[0];

const parseIsoDate = (value) => {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date();
  const [year, month, day] = raw.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toIsoDate = (date) => date.toISOString().split('T')[0];

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getPeriodRange = (mode, dateKey, customFrom, customTo) => {
  const anchor = parseIsoDate(dateKey);
  
  switch(mode) {
    case "week": {
      const day = anchor.getDay() || 7;
      const from = addDays(anchor, 1 - day);
      const to = addDays(from, 6);
      return { from: toIsoDate(from), to: toIsoDate(to) };
    }
    case "month": {
      const from = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const to = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { from: toIsoDate(from), to: toIsoDate(to) };
    }
    case "custom":
      return { from: customFrom || dateKey, to: customTo || customFrom || dateKey };
    default:
      return { from: dateKey, to: dateKey };
  }
};

const periodLabel = (mode, range) => {
  const labels = {
    day: `Point du ${range.from}`,
    week: `Semaine du ${range.from} au ${range.to}`,
    month: `Mois du ${range.from} au ${range.to}`,
    custom: `Période du ${range.from} au ${range.to}`,
  };
  return labels[mode] || labels.day;
};

const toInputAmount = (value) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? String(Math.max(0, Math.round(n))) : "0";
};

const getPaymentIcon = (paymentMode) => {
  const mode = String(paymentMode || "").toUpperCase();
  return PAYMENT_MODE_ICONS[mode] || Banknote;
};

const isVisibleDeclarationLine = (line) => {
  const mode = String(line?.paymentMode || "").toUpperCase();
  return (
    Object.keys(PAYMENT_MODE_ICONS).includes(mode) ||
    Number(line?.expectedFcfa || 0) > 0 ||
    Number(line?.declaredFcfa || 0) > 0 ||
    Number(line?.transactionCount || 0) > 0 ||
    String(line?.note || "").trim().length > 0
  );
};

// ============ COMPONENTS ============

// ✅ Amélioration : Composant de carte de résumé avec tendance
const SummaryCard = ({ icon: Icon, label, value, trend, subtitle, variant = "default" }) => {
  const variants = {
    default: "border-gray-200 bg-white",
    success: "border-emerald-200 bg-emerald-50",
    warning: "border-amber-200 bg-amber-50",
    danger: "border-red-200 bg-red-50",
    info: "border-blue-200 bg-blue-50",
  };

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-emerald-600" : trend < 0 ? "text-red-600" : "text-gray-400";

  return (
    <div className={`rounded-xl border p-5 shadow-sm transition-all hover:shadow-md ${variants[variant]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-white p-2 text-gray-600 shadow-sm ring-1 ring-gray-200">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium text-gray-600">{label}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${trendColor}`}>
            <TrendIcon className="h-4 w-4" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
      </div>
    </div>
  );
};

// ✅ Nouveau : Composant de statut unifié
const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[String(status || "").toUpperCase()] || STATUS_CONFIG.DRAFT;
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${config.className}`}>
      {config.label}
    </span>
  );
};

// ✅ Nouveau : Composant de notification
const Notification = ({ type, message, onClose }) => {
  const configs = {
    error: {
      icon: AlertTriangle,
      className: "border-red-200 bg-red-50 text-red-700",
      iconClass: "text-red-500",
    },
    success: {
      icon: CheckCircle2,
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
      iconClass: "text-emerald-500",
    },
    info: {
      icon: AlertTriangle,
      className: "border-blue-200 bg-blue-50 text-blue-700",
      iconClass: "text-blue-500",
    },
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 shadow-sm ${config.className}`}>
      <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${config.iconClass}`} />
      <p className="flex-1 text-sm">{message}</p>
      {onClose && (
        <button onClick={onClose} className="rounded-lg p-1 hover:bg-white/50">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// ✅ Nouveau : Composant de chargement squelettique
const SkeletonLoader = () => (
  <div className="animate-pulse space-y-4">
    <div className="grid gap-4 md:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-28 rounded-xl bg-gray-200" />
      ))}
    </div>
    <div className="h-64 rounded-xl bg-gray-200" />
  </div>
);

// ✅ Nouveau : Composant de ligne de déclaration
const DeclarationLine = ({ line, editable, saving, onUpdate }) => {
  const Icon = getPaymentIcon(line.paymentMode);
  const discrepancy = Number(line.discrepancyFcfa || 0);
  const discrepancyColor = discrepancy === 0 ? "text-gray-500" : discrepancy > 0 ? "text-emerald-600" : "text-red-600";
  const isDirty = line.declaredFcfa !== line.expectedFcfa;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gray-50 p-2 text-gray-600 ring-1 ring-gray-200">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">{line.label}</div>
            <div className="text-xs text-gray-500">
              {line.transactionCount} transaction{line.transactionCount > 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className={`text-right text-sm font-bold ${discrepancyColor}`}>
          {formatFcfa(discrepancy)}
          {isDirty && <span className="ml-2 text-xs text-amber-500">●</span>}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500">Attendu</label>
          <div className="mt-1 rounded-lg bg-gray-50 px-3 py-2 text-right font-semibold text-gray-700">
            {formatFcfa(line.expectedFcfa)}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Déclaré</label>
          <input
            type="number"
            min="0"
            step="1"
            value={toInputAmount(line.declaredFcfa)}
            onChange={(e) => onUpdate(line.paymentMode, "declaredFcfa", e.target.value)}
            disabled={!editable || saving}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-right font-semibold text-gray-900 outline-none transition-all focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100 disabled:opacity-60"
          />
        </div>
      </div>
    </div>
  );
};

// ============ MAIN COMPONENT ============
export default function CashClosurePage() {
  // États
  const [dateKey, setDateKey] = useState(todayIso());
  const [periodMode, setPeriodMode] = useState("day");
  const [customFrom, setCustomFrom] = useState(todayIso());
  const [customTo, setCustomTo] = useState(todayIso());
  
  const [summaryData, setSummaryData] = useState(null);
  const [closure, setClosure] = useState(null);
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  
  const [canReview, setCanReview] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [draftLoading, setDraftLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [declarationOpen, setDeclarationOpen] = useState(false);
  
  // États de notification améliorés
  const [notifications, setNotifications] = useState([]);
  
  // Refs pour éviter les re-rendus inutiles
  const prevPeriodRange = useRef();

  // ============ COMPUTED VALUES ============
  const periodRange = useMemo(
    () => getPeriodRange(periodMode, dateKey, customFrom, customTo),
    [periodMode, dateKey, customFrom, customTo]
  );

  const loading = summaryLoading || (periodMode === "day" && draftLoading);
  const summary = summaryData?.summary || {};
  const byPaymentMode = summaryData?.byPaymentMode || [];
  const closures = summaryData?.closures || [];
  
  const editable = ["DRAFT", "REJECTED"].includes(String(closure?.status || "").toUpperCase());
  const submitted = String(closure?.status || "").toUpperCase() === "SUBMITTED";
  const hasClosure = Boolean(closure?.id);

  const localTotals = useMemo(() => {
    const totals = lines.reduce(
      (acc, line) => ({
        expected: acc.expected + Number(line.expectedFcfa || 0),
        declared: acc.declared + Number(line.declaredFcfa || 0),
        count: acc.count + Number(line.transactionCount || 0),
      }),
      { expected: 0, declared: 0, count: 0 }
    );
    return {
      ...totals,
      discrepancy: totals.declared - totals.expected,
    };
  }, [lines]);

  const visibleLines = useMemo(() => lines.filter(isVisibleDeclarationLine), [lines]);

  // ============ NOTIFICATIONS ============
  const addNotification = useCallback((type, message) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // ============ API CALLS ============
  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await cashClosureService.summary(periodRange);
      setSummaryData(data);
      setCanReview(Boolean(data.permissions?.canReview));
    } catch (err) {
      addNotification("error", err?.response?.data?.message || err.message || "Impossible de charger la synthèse.");
    } finally {
      setSummaryLoading(false);
    }
  }, [periodRange, addNotification]);

  const loadDraft = useCallback(async () => {
    setDraftLoading(true);
    try {
      const data = await cashClosureService.getDraft({ date: dateKey });
      setClosure(data.closure || null);
      setLines(data.closure?.lines || []);
      setNote(data.closure?.note || "");
      setReviewNote("");
      setCanReview(Boolean(data.permissions?.canReview));
      
      // Charger le résumé en parallèle
      const summary = await cashClosureService.summary({ from: dateKey, to: dateKey });
      setSummaryData(summary);
      setCanReview(prev => prev || Boolean(summary.permissions?.canReview));
    } catch (err) {
      addNotification("error", err?.response?.data?.message || err.message || "Impossible de charger la clôture.");
    } finally {
      setDraftLoading(false);
    }
  }, [dateKey, addNotification]);

  // ============ EFFECTS ============
  useEffect(() => {
    if (periodMode !== "day") {
      loadSummary();
      setDraftLoading(false);
      setDeclarationOpen(false);
    }
  }, [periodMode, loadSummary]);

  useEffect(() => {
    if (periodMode === "day") {
      loadDraft();
    }
  }, [periodMode, loadDraft]);

  // ============ HANDLERS ============
  const updateLine = useCallback((paymentMode, field, value) => {
    setLines(current =>
      current.map(line =>
        line.paymentMode === paymentMode
          ? {
              ...line,
              [field]: field === "declaredFcfa" ? Number(value || 0) : value,
              discrepancyFcfa:
                field === "declaredFcfa"
                  ? Number(value || 0) - Number(line.expectedFcfa || 0)
                  : line.discrepancyFcfa,
            }
          : line
      )
    );
  }, []);

  const refreshAll = useCallback(async () => {
    if (periodMode === "day") {
      await loadDraft();
    } else {
      await loadSummary();
    }
    addNotification("success", "Données actualisées ✅");
  }, [periodMode, loadDraft, loadSummary, addNotification]);

  const saveDraft = useCallback(async () => {
    if (!closure?.id) {
      addNotification("error", "Aucune clôture à enregistrer.");
      return false;
    }

    setSaving(true);
    try {
      const data = await cashClosureService.update(closure.id, {
        note,
        lines: visibleLines.map(line => ({
          paymentMode: line.paymentMode,
          declaredFcfa: Number(line.declaredFcfa || 0),
        })),
      });
      
      setClosure(data.closure);
      setLines(data.closure?.lines || []);
      setNote(data.closure?.note || "");
      addNotification("success", "Clôture enregistrée avec succès ✅");
      await loadSummary();
      return true;
    } catch (err) {
      addNotification("error", err?.response?.data?.message || err.message || "Erreur lors de l'enregistrement.");
      return false;
    } finally {
      setSaving(false);
    }
  }, [closure, note, visibleLines, loadSummary, addNotification]);

  const submitClosure = useCallback(async () => {
    const saved = await saveDraft();
    if (!saved) return;

    setSaving(true);
    try {
      const data = await cashClosureService.submit(closure.id);
      setClosure(data.closure);
      setLines(data.closure?.lines || []);
      addNotification("success", "Clôture soumise au contrôle ✅");
      setDeclarationOpen(false);
      await loadSummary();
    } catch (err) {
      addNotification("error", err?.response?.data?.message || err.message || "Erreur lors de la soumission.");
    } finally {
      setSaving(false);
    }
  }, [closure, saveDraft, loadSummary, addNotification]);

  const review = useCallback(async (action) => {
    if (!closure?.id) return;

    setSaving(true);
    try {
      const fn = action === "approve" ? cashClosureService.approve : cashClosureService.reject;
      const data = await fn(closure.id, { reviewNote });
      
      setClosure(data.closure);
      setLines(data.closure?.lines || []);
      setReviewNote("");
      
      const message = action === "approve" 
        ? "Clôture validée avec succès ✅" 
        : "Clôture rejetée ❌";
      addNotification("success", message);
      await loadSummary();
    } catch (err) {
      addNotification("error", err?.response?.data?.message || err.message || "Erreur lors du contrôle.");
    } finally {
      setSaving(false);
    }
  }, [closure, reviewNote, loadSummary, addNotification]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* ============ NOTIFICATIONS ============ */}
      <div className="fixed right-4 top-4 z-50 w-full max-w-md space-y-3">
        {notifications.map(({ id, type, message }) => (
          <Notification
            key={id}
            type={type}
            message={message}
            onClose={() => removeNotification(id)}
          />
        ))}
      </div>

      {/* ============ HEADER ============ */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
              <Banknote className="h-4 w-4" />
              Caisse
            </div>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">Point et clôture de caisse</h1>
            <p className="mt-1 text-sm text-gray-500">
              Suivi et contrôle des encaissements par moyen de paiement
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Période selector amélioré */}
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setPeriodMode(option.value)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    periodMode === option.value
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </button>
              ))}
            </div>

            {/* Date inputs */}
            {periodMode === "custom" ? (
              <div className="flex gap-2">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value || todayIso())}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm outline-none transition-all focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value || customFrom || todayIso())}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm outline-none transition-all focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                />
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <CalendarDays className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={dateKey}
                  onChange={(e) => {
                    const nextDate = e.target.value || todayIso();
                    setDateKey(nextDate);
                    setCustomFrom(nextDate);
                    setCustomTo(nextDate);
                  }}
                  className="bg-transparent text-sm font-medium text-gray-700 outline-none"
                />
              </div>
            )}

            {/* Actions */}
            {periodMode === "day" && !draftLoading && hasClosure && (
              <button
                onClick={() => setDeclarationOpen(true)}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-md disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {editable ? "Déclarer" : "Consulter"}
              </button>
            )}

            <button
              onClick={refreshAll}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {/* ============ CONTENT ============ */}
      <div className="mt-6 space-y-6">
        {/* Période label */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{periodLabel(periodMode, periodRange)}</h2>
            <p className="text-sm text-gray-500">
              {summary.closureCount || 0} clôture{summary.closureCount > 1 ? 's' : ''} · 
              {summary.transactionCount || 0} transaction{summary.transactionCount > 1 ? 's' : ''}
            </p>
          </div>
          {periodMode === "day" && hasClosure && (
            <StatusBadge status={closure.status} />
          )}
        </div>

        {/* Résumé - amélioré avec tendance et chargement */}
        {loading ? (
          <SkeletonLoader />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={Banknote}
              label="Total attendu"
              value={formatFcfa(summary.totalExpectedFcfa)}
              subtitle="Paiements détectés"
              variant="info"
            />
            <SummaryCard
              icon={Save}
              label="Total déclaré"
              value={formatFcfa(summary.totalDeclaredFcfa)}
              subtitle="Saisi par la caisse"
            />
            <SummaryCard
              icon={Number(summary.discrepancyFcfa || 0) === 0 ? CheckCircle2 : AlertTriangle}
              label="Écart total"
              value={formatFcfa(summary.discrepancyFcfa)}
              subtitle={Number(summary.discrepancyFcfa || 0) === 0 ? "✅ Aucun écart" : "⚠️ Contrôle nécessaire"}
              variant={Number(summary.discrepancyFcfa || 0) === 0 ? "success" : "warning"}
            />
            <SummaryCard
              icon={Clock}
              label="Clôtures"
              value={String(summary.closureCount || 0)}
              subtitle="Journées enregistrées"
            />
          </div>
        )}

        {/* Tableau de répartition - amélioré avec scroll et sticky header */}
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50/50 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Répartition par moyen de paiement
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="sticky top-0 bg-gray-50/80 backdrop-blur-sm">
                  <tr className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-4 py-3 text-left">Moyen</th>
                    <th className="px-4 py-3 text-right">Attendu</th>
                    <th className="px-4 py-3 text-right">Déclaré</th>
                    <th className="px-4 py-3 text-right">Écart</th>
                    <th className="px-4 py-3 text-right">Transactions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {byPaymentMode.map((line) => {
                    const Icon = getPaymentIcon(line.paymentMode);
                    const discrepancy = Number(line.discrepancyFcfa || 0);
                    const isMatch = discrepancy === 0;
                    
                    return (
                      <tr key={line.paymentMode} className="transition-colors hover:bg-gray-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-gray-100 p-1.5 text-gray-600">
                              <Icon className="h-4 w-4" />
                            </div>
                            <span className="font-medium text-gray-900">{line.label}</span>
                            {isMatch && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-700">
                          {formatFcfa(line.expectedFcfa)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700">
                          {formatFcfa(line.declaredFcfa)}
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${
                          discrepancy === 0 ? "text-gray-500" : 
                          discrepancy > 0 ? "text-emerald-600" : "text-red-600"
                        }`}>
                          {formatFcfa(discrepancy)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">
                          {line.transactionCount || 0}
                        </td>
                      </tr>
                    );
                  })}
                  {!byPaymentMode.length && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center gap-2">
                          <Banknote className="h-8 w-8 text-gray-300" />
                          <p>Aucun encaissement enregistré sur cette période</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Liste des clôtures - améliorée */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-200 bg-gray-50/50 px-5 py-3">
              <h3 className="text-sm font-semibold text-gray-900">Clôtures récentes</h3>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto p-3">
              {closures.map((item) => (
                <div key={item.id} className="rounded-lg border border-gray-200 p-3 transition-all hover:bg-gray-50/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{item.dateKey}</div>
                      <div className="text-xs text-gray-500">{item.cashier?.label || "Caissière"}</div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Attendu</span>
                      <div className="font-semibold text-gray-900">{formatFcfa(item.totalExpectedFcfa)}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Écart</span>
                      <div className={`font-semibold ${
                        Number(item.discrepancyFcfa || 0) === 0 ? "text-gray-500" :
                        Number(item.discrepancyFcfa || 0) > 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {formatFcfa(item.discrepancyFcfa)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {!closures.length && (
                <div className="py-8 text-center text-sm text-gray-500">
                  Aucune clôture sur cette période
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Zone de contrôle - améliorée */}
        {periodMode === "day" && canReview && submitted && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Contrôle de la clôture</h3>
                </div>
                <label className="mt-3 block text-sm font-medium text-gray-700">Note de contrôle</label>
                <textarea
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none transition-all focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                  placeholder="Motif de validation ou de rejet..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2 lg:w-64">
                <button
                  onClick={() => review("reject")}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition-all hover:bg-red-100 hover:shadow-md disabled:opacity-60"
                >
                  <XCircle className="h-4 w-4" />
                  Rejeter
                </button>
                <button
                  onClick={() => review("approve")}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition-all hover:bg-emerald-100 hover:shadow-md disabled:opacity-60"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Valider
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============ MODALE DE DÉCLARATION AMÉLIORÉE ============ */}
      {declarationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Déclaration des encaissements</h2>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-4 w-4" />
                    {dateKey}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {localTotals.count} transaction{localTotals.count > 1 ? 's' : ''}
                  </span>
                  <span>·</span>
                  <span className={`flex items-center gap-1 font-semibold ${
                    localTotals.discrepancy === 0 ? "text-gray-500" :
                    localTotals.discrepancy > 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {localTotals.discrepancy === 0 ? "✅ Écart nul" : `Écart: ${formatFcfa(localTotals.discrepancy)}`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setDeclarationOpen(false)}
                className="rounded-lg p-2 text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="grid gap-4 md:grid-cols-2">
                {visibleLines.map((line) => (
                  <DeclarationLine
                    key={line.paymentMode}
                    line={line}
                    editable={editable}
                    saving={saving}
                    onUpdate={updateLine}
                  />
                ))}
              </div>

              {/* Note */}
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <label className="block text-sm font-medium text-gray-700">Note de clôture</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={!editable || saving}
                  rows={3}
                  className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none transition-all focus:border-gray-900 focus:ring-1 focus:ring-gray-900 disabled:bg-gray-100 disabled:opacity-60"
                  placeholder="Écart constaté, justification, remarque de caisse..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setDeclarationOpen(false)}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow-md disabled:opacity-60"
              >
                Fermer
              </button>
              {editable && (
                <>
                  <button
                    onClick={saveDraft}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:shadow-md disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer
                  </button>
                  <button
                    onClick={submitClosure}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-md disabled:opacity-60"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Soumettre au contrôle
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}