// Dashboard.jsx
import { useEffect, useState, useMemo, useCallback } from "react";
import { statsService } from "../services/statsService";
import { Link } from "react-router-dom";

// Configuration des statuts avec couleurs
const STATUS_CONFIG = {
  DRAFT: { label: "Brouillons", color: "gray", icon: "📝" },
  SUBMITTED: { label: "Soumises", color: "blue", icon: "📨" },
  INVOICED: { label: "Facturées", color: "purple", icon: "📄" },
  PAID: { label: "Payées", color: "green", icon: "💰" },
  CANCELLED: { label: "Annulées", color: "red", icon: "❌" },
};

// Composant de chargement
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-8">
          {/* Header skeleton */}
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 rounded"></div>
            <div className="h-4 w-64 bg-gray-200 rounded"></div>
          </div>
          
          {/* KPI skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="h-4 w-24 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 w-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
          
          {/* Charts skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(j => (
                    <div key={j} className="flex justify-between">
                      <div className="h-4 w-32 bg-gray-200 rounded"></div>
                      <div className="h-4 w-16 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Composant KPI amélioré
function KpiCard({ title, value, trend, icon, color = "blue", subtitle }) {
  const colors = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", icon: "text-blue-600" },
    green: { bg: "bg-green-50", text: "text-green-600", icon: "text-green-600" },
    purple: { bg: "bg-purple-50", text: "text-purple-600", icon: "text-purple-600" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", icon: "text-orange-600" },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className={`text-3xl font-bold text-gray-900`}>
              {value}
            </p>
            {trend && (
              <span className={`text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colors[color].bg}`}>
          <span className={`text-xl ${colors[color].icon}`}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

// Composant de progression
function ProgressBar({ value, max, label, color = "blue" }) {
  const percentage = Math.min(100, (value / max) * 100);
  
  const colors = {
    gray: "bg-gray-600",
    blue: "bg-blue-600",
    green: "bg-green-600",
    purple: "bg-purple-600",
    red: "bg-red-600",
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colors[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Composant de sélecteur de date
function DateRangePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const presets = [
    { label: "Aujourd'hui", days: 0 },
    { label: "7 derniers jours", days: 7 },
    { label: "30 derniers jours", days: 30 },
    { label: "Ce mois", days: 30, custom: true },
  ];

  const handlePreset = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    
    onChange({
      from: from.toISOString().split('T')[0],
      to: to.toISOString().split('T')[0]
    });
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>
          {value.from === value.to 
            ? new Date(value.from).toLocaleDateString('fr-FR')
            : `${new Date(value.from).toLocaleDateString('fr-FR')} - ${new Date(value.to).toLocaleDateString('fr-FR')}`
          }
        </span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20 p-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Du</label>
                <input
                  type="date"
                  value={value.from}
                  onChange={(e) => onChange({ ...value, from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Au</label>
                <input
                  type="date"
                  value={value.to}
                  onChange={(e) => onChange({ ...value, to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  min={value.from}
                />
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 mb-2">Raccourcis</p>
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePreset(preset.days)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Composant de carte pour les commandes par statut
function OrdersByStatusCard({ data }) {
  const total = useMemo(() => 
    data.reduce((sum, item) => sum + item.count, 0)
  , [data]);

  const sortedData = useMemo(() => 
    [...data].sort((a, b) => b.count - a.count)
  , [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Commandes par statut
        </h3>
        <span className="text-sm text-gray-500">
          Total: {total}
        </span>
      </div>

      <div className="space-y-4">
        {sortedData.map((item) => {
          const config = STATUS_CONFIG[item.status] || { 
            label: item.status, 
            color: "gray", 
            icon: "📦" 
          };
          
          return (
            <div key={item.status} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-base">{config.icon}</span>
                  <span className="font-medium text-gray-700">
                    {config.label}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">
                    {item.count}
                  </span>
                  <span className="text-xs text-gray-500 min-w-[40px]">
                    {Math.round((item.count / total) * 100)}%
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-${config.color}-500 transition-all duration-500`}
                  style={{ width: `${(item.count / total) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {sortedData.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Aucune commande pour cette période
        </div>
      )}
    </div>
  );
}

// Composant de carte pour les top produits
function TopProductsCard({ products }) {
  const maxQty = useMemo(() => 
    Math.max(...products.map(p => p.qty), 0)
  , [products]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Top produits
        </h3>
        <Link 
          to="/products" 
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Voir tout →
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Aucune vente pour cette période
        </div>
      ) : (
        <div className="space-y-4">
          {products.slice(0, 5).map((product, index) => (
            <div key={product.productId} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-medium text-gray-500 w-5`}>
                    #{index + 1}
                  </span>
                  <span className="truncate text-gray-700" title={product.nom}>
                    {product.nom}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-semibold text-gray-900">
                    {product.qty}
                  </span>
                  <span className="text-xs text-gray-500 w-12">
                    unités
                  </span>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${(product.qty / maxQty) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Composant principal
export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    return {
      from: today.toISOString().split('T')[0],
      to: today.toISOString().split('T')[0],
    };
  });

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await statsService.get({
        from: dateRange.from,
        to: dateRange.to,
      });
      setStats(res);
    } catch (error) {
      console.error("Erreur lors du chargement des stats:", error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Formatage des dates pour l'affichage
  const formatDateRange = useMemo(() => {
    const from = new Date(dateRange.from).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    const to = new Date(dateRange.to).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    return dateRange.from === dateRange.to ? from : `${from} - ${to}`;
  }, [dateRange]);

  if (loading && !stats) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tableau de bord</h1>
              <p className="mt-1 text-sm text-gray-500">
                Vue d'ensemble de votre activité
              </p>
            </div>

            <div className="flex items-center gap-3">
              <DateRangePicker value={dateRange} onChange={setDateRange} />
              
              <button
                onClick={loadStats}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Chargement...' : 'Rafraîchir'}
              </button>
            </div>
          </div>

          {/* Période affichée */}
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Période : {formatDateRange}</span>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="Commandes"
            value={stats?.totalOrders?.toLocaleString() || "0"}
            icon="📦"
            color="blue"
            subtitle={`${stats?.byStatus?.reduce((acc, s) => acc + s.count, 0) || 0} au total`}
          />
          
          <KpiCard
            title="Chiffre d'affaires"
            value={`${(stats?.totalRevenueFcfa || 0).toLocaleString()} FCFA`}
            icon="💰"
            color="green"
            trend={stats?.revenueTrend}
          />
          
          <KpiCard
            title="Panier moyen"
            value={(() => {
              const total = stats?.totalRevenueFcfa || 0;
              const count = stats?.totalOrders || 0;
              return count > 0 
                ? `${Math.round(total / count).toLocaleString()} FCFA`
                : "0 FCFA";
            })()}
            icon="🛒"
            color="purple"
          />
          
          <KpiCard
            title="Produits vendus"
            value={stats?.totalProductsSold?.toLocaleString() || "0"}
            icon="📊"
            color="orange"
            subtitle={`${stats?.topProducts?.length || 0} produits différents`}
          />
        </div>

        {/* Graphiques et tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commandes par statut */}
          <OrdersByStatusCard data={stats?.byStatus || []} />

          {/* Top produits */}
          <TopProductsCard products={stats?.topProducts || []} />

          {/* Évolution journalière (optionnel) */}
          {stats?.dailyStats && stats.dailyStats.length > 0 && (
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Évolution quotidienne
              </h3>
              <div className="h-64">
                {/* Ici vous pouvez ajouter un graphique avec Chart.js ou Recharts */}
                <div className="flex items-center justify-center h-full text-gray-500">
                  Graphique d'évolution à venir...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pied de page avec derniers événements */}
        {stats?.recentActivities && stats.recentActivities.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Activités récentes
            </h3>
            <div className="space-y-3">
              {stats.recentActivities.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full bg-${STATUS_CONFIG[activity.status]?.color || 'gray'}-500`} />
                  <span className="text-gray-500">
                    {new Date(activity.date).toLocaleTimeString('fr-FR')}
                  </span>
                  <span className="text-gray-700">
                    {activity.description}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}