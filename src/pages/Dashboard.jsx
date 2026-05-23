import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { statsService } from "../services/statsService";

const STATUS_CONFIG = {
  SUBMITTED: {
    label: "Soumises",
    description: "A traiter",
    tone: "blue",
    Icon: Clock3,
  },
  INVOICED: {
    label: "Facturees",
    description: "En attente paiement",
    tone: "violet",
    Icon: FileText,
  },
  PAID: {
    label: "Payees",
    description: "Paiement valide",
    tone: "emerald",
    Icon: CheckCircle2,
  },
  PREPARATION: {
    label: "Preparation",
    description: "En traitement stock",
    tone: "amber",
    Icon: Package,
  },
  READY: {
    label: "Pretes",
    description: "A remettre",
    tone: "cyan",
    Icon: Package,
  },
  FULFILLED: {
    label: "Cloturees",
    description: "Terminees",
    tone: "emerald",
    Icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Annulees",
    description: "Hors CA",
    tone: "red",
    Icon: XCircle,
  },
};

const TONE_CLASSES = {
  blue: {
    icon: "bg-blue-50 text-blue-700",
    bar: "bg-blue-600",
    badge: "bg-blue-50 text-blue-700 border-blue-100",
  },
  emerald: {
    icon: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-600",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  amber: {
    icon: "bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-100",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700",
    bar: "bg-violet-600",
    badge: "bg-violet-50 text-violet-700 border-violet-100",
  },
  cyan: {
    icon: "bg-cyan-50 text-cyan-700",
    bar: "bg-cyan-600",
    badge: "bg-cyan-50 text-cyan-700 border-cyan-100",
  },
  red: {
    icon: "bg-red-50 text-red-700",
    bar: "bg-red-600",
    badge: "bg-red-50 text-red-700 border-red-100",
  },
  gray: {
    icon: "bg-gray-100 text-gray-700",
    bar: "bg-gray-500",
    badge: "bg-gray-50 text-gray-700 border-gray-100",
  },
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(`${value}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("fr-FR");
}

function percent(value, total) {
  if (!total) return 0;
  return Math.round((Number(value || 0) / total) * 100);
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-950">{title}</h2>
        {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

function KpiCard({ label, value, detail, icon, tone = "blue" }) {
  const classes = TONE_CLASSES[tone] || TONE_CLASSES.gray;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase text-gray-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-gray-950">{value}</div>
          {detail ? <div className="mt-1 text-xs text-gray-500">{detail}</div> : null}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${classes.icon}`}>
          {createElement(icon, { className: "h-5 w-5" })}
        </div>
      </div>
    </Card>
  );
}

function DateFilters({ range, onChange, onRefresh, loading }) {
  const presets = [
    { label: "Aujourd'hui", from: todayIso(), to: todayIso() },
    { label: "7 jours", from: addDaysIso(-6), to: todayIso() },
    { label: "30 jours", from: addDaysIso(-29), to: todayIso() },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((preset) => {
        const active = range.from === preset.from && range.to === preset.to;
        return (
          <button
            key={preset.label}
            type="button"
            onClick={() => onChange({ from: preset.from, to: preset.to })}
            className={`h-9 rounded-lg border px-3 text-sm font-medium ${
              active
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {preset.label}
          </button>
        );
      })}

      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <CalendarDays className="h-4 w-4 text-gray-400" />
        <input
          type="date"
          value={range.from}
          onChange={(event) => onChange({ ...range, from: event.target.value })}
          className="w-32 text-sm text-gray-700 outline-none"
        />
        <span className="text-gray-300">/</span>
        <input
          type="date"
          value={range.to}
          min={range.from}
          onChange={(event) => onChange({ ...range, to: event.target.value })}
          className="w-32 text-sm text-gray-700 outline-none"
        />
      </div>

      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Actualiser
      </button>
    </div>
  );
}

function StatusRows({ rows, total }) {
  if (!rows.length) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-500">
        Aucune commande sur cette periode.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {rows.map((row) => {
        const config = STATUS_CONFIG[row.status] || {
          label: row.status,
          description: "Statut commande",
          tone: "gray",
          Icon: ShoppingCart,
        };
        const classes = TONE_CLASSES[config.tone] || TONE_CLASSES.gray;
        const rowPercent = percent(row.count, total);

        return (
          <div key={row.status} className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${classes.icon}`}>
                  {createElement(config.Icon, { className: "h-4 w-4" })}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {config.label}
                  </div>
                  <div className="text-xs text-gray-500">{config.description}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-950">{formatNumber(row.count)}</div>
                <div className="text-xs text-gray-500">{rowPercent}%</div>
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className={`h-full rounded-full ${classes.bar}`} style={{ width: `${rowPercent}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopProducts({ products }) {
  const maxRevenue = Math.max(...products.map((product) => Number(product.revenueFcfa || 0)), 0);

  if (!products.length) {
    return (
      <div className="px-5 py-10 text-center text-sm text-gray-500">
        Aucun produit vendu sur cette periode.
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {products.map((product, index) => {
        const width = percent(product.revenueFcfa, maxRevenue);
        return (
          <div key={product.productId} className="px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-xs font-semibold text-gray-400">#{index + 1}</span>
                  <span className="truncate text-sm font-semibold text-gray-900" title={product.nom}>
                    {product.nom}
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {product.sku || "Sans SKU"} - {formatNumber(product.qty)} unite(s)
                </div>
              </div>
              <div className="shrink-0 text-right text-sm font-semibold text-gray-950">
                {formatMoney(product.revenueFcfa)}
              </div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-gray-900" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-10 w-80 animate-pulse rounded-lg bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-32 animate-pulse rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
        <div className="h-96 animate-pulse rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState(() => ({
    from: todayIso(),
    to: todayIso(),
  }));

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const data = await statsService.get({
        dateFrom: range.from,
        dateTo: range.to,
      });
      setStats(data);
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const byStatus = useMemo(
    () => [...(stats?.byStatus || [])].sort((a, b) => Number(b.count || 0) - Number(a.count || 0)),
    [stats],
  );

  const topProducts = useMemo(() => stats?.topProducts || [], [stats]);
  const totalOrders = Number(stats?.totalOrders || 0);
  const totalRevenue = Number(stats?.totalRevenueFcfa || 0);
  const grossOrders = Number(stats?.grossOrders || totalOrders);
  const grossRevenue = Number(stats?.grossRevenueFcfa || totalRevenue);
  const cancelledOrders = Number(stats?.cancelledOrders || 0);
  const cancelledRevenue = Number(stats?.cancelledRevenueFcfa || 0);
  const testCancelledOrders = Number(stats?.testCancelledOrders || 0);
  const testCancelledRevenue = Number(stats?.testCancelledRevenueFcfa || 0);
  const paidRevenue = byStatus
    .filter((row) => ["PAID", "READY", "FULFILLED"].includes(row.status))
    .reduce((sum, row) => sum + Number(row.revenueFcfa || 0), 0);
  const averageBasket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const unitsSold = topProducts.reduce((sum, product) => sum + Number(product.qty || 0), 0);

  if (loading && !stats) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-950">Tableau de bord</h1>
          <p className="mt-1 text-sm text-gray-500">
            Activite commandes du {formatDate(range.from)} au {formatDate(range.to)}.
          </p>
        </div>
        <DateFilters range={range} onChange={setRange} onRefresh={loadStats} loading={loading} />
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Commandes suivies"
          value={formatNumber(totalOrders)}
          detail={cancelledOrders > 0 ? `${formatNumber(cancelledOrders)} annulee(s) exclue(s)` : "Hors brouillons et annulations"}
          icon={ShoppingCart}
          tone="blue"
        />
        <KpiCard
          label="CA net commandes"
          value={formatMoney(totalRevenue)}
          detail={cancelledRevenue > 0 ? `${formatMoney(cancelledRevenue)} exclu` : "Annulations exclues"}
          icon={Banknote}
          tone="emerald"
        />
        <KpiCard
          label="CA confirme"
          value={formatMoney(paidRevenue)}
          detail="Payees et apres paiement"
          icon={CheckCircle2}
          tone="amber"
        />
        <KpiCard
          label="Panier moyen"
          value={formatMoney(averageBasket)}
          detail={`${formatNumber(unitsSold)} unite(s) dans le top produits`}
          icon={TrendingUp}
          tone="violet"
        />
      </div>

      {cancelledOrders > 0 ? (
        <Card className="border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <div className="text-sm font-semibold text-amber-950">
                  Annulations exclues des indicateurs de vente
                </div>
                <div className="mt-1 text-sm text-amber-800">
                  Le brut de la periode est {formatNumber(grossOrders)} commande(s) pour {formatMoney(grossRevenue)}.
                  Le dashboard retient le net, hors {formatNumber(cancelledOrders)} commande(s) annulee(s).
                </div>
              </div>
            </div>
            {testCancelledOrders > 0 ? (
              <div className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900">
                Tests: {formatNumber(testCancelledOrders)} commande(s), {formatMoney(testCancelledRevenue)}
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card>
          <SectionHeader
            title="File commandes par statut"
            description="Repartition operationnelle de la periode selectionnee."
            action={
              <Link to="/orders" className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-950">
                Ouvrir
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <StatusRows rows={byStatus} total={grossOrders} />
        </Card>

        <Card>
          <SectionHeader
            title="Top produits par chiffre d'affaires"
            description="Produits qui contribuent le plus au CA de la periode."
            action={
              <Link to="/products" className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-950">
                Catalogue
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <TopProducts products={topProducts} />
        </Card>
      </div>
    </div>
  );
}
