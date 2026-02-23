// Orders.jsx
// Page de listing des commandes avec filtres avancés et pagination

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useOrdersStore } from "../store/useOrdersStore";
import { ordersService } from "../services/ordersService";
import StatusBadge from "../components/StatusBadge";

// Configuration des statuts avec couleurs et icônes
const STATUS_CONFIG = {
  DRAFT: { label: "Brouillon", color: "gray", icon: "📝" },
  SUBMITTED: { label: "Soumise", color: "blue", icon: "📨" },
  INVOICED: { label: "Facturée", color: "purple", icon: "📄" },
  PAID: { label: "Payée", color: "green", icon: "💰" },
  CANCELLED: { label: "Annulée", color: "red", icon: "❌" },
};

const STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts", icon: "🔍" },
  ...Object.entries(STATUS_CONFIG).map(([value, config]) => ({
    value,
    label: config.label,
    icon: config.icon,
  })),
];

// Composant de filtre réutilisable
function FilterSection({ children, title }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {title && <h3 className="text-sm font-medium text-gray-700 mb-4">{title}</h3>}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

// Composant de statistiques
function OrderStats({ totalCount, statusCounts = {} }) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-gray-900">{totalCount}</span>
        <span className="text-sm text-gray-500">total</span>
      </div>
      <div className="w-px h-8 bg-gray-200" />
      <div className="flex flex-wrap items-center gap-4">
        {Object.entries(STATUS_CONFIG).map(([status, config]) => (
          <div key={status} className="flex items-center gap-2">
            <span className={`w-2 h-2 bg-${config.color}-500 rounded-full`} />
            <span className="text-sm text-gray-600">{config.label}</span>
            <span className="text-sm font-medium text-gray-900">
              {statusCounts[status] || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Composant de filtres avancés
function AdvancedFilters({ filters, onFilterChange, onClear }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const hasActiveFilters = Object.values(filters).some(v => v && v !== "");

  // Debounce pour la recherche
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localFilters.q !== filters.q) {
        onFilterChange(localFilters);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localFilters.q, filters.q, onFilterChange]);

  const handleChange = (key, value) => {
    if (key === 'q') {
      setLocalFilters(prev => ({ ...prev, [key]: value }));
    } else {
      onFilterChange({ [key]: value });
    }
  };

  const handleQuickDate = (range) => {
    const today = new Date();
    const from = new Date();
    
    switch (range) {
      case 'today':
        from.setHours(0, 0, 0, 0);
        break;
      case 'week':
        from.setDate(from.getDate() - 7);
        break;
      case 'month':
        from.setMonth(from.getMonth() - 1);
        break;
      default:
        return;
    }
    
    onFilterChange({
      dateFrom: from.toISOString().split('T')[0],
      dateTo: today.toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-4">
      {/* Recherche principale */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
          placeholder="Rechercher par numéro FBO, nom, email..."
          value={localFilters.q}
          onChange={(e) => handleChange('q', e.target.value)}
        />
        {localFilters.q && (
          <button
            onClick={() => handleChange('q', '')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Grille de filtres */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Statut */}
        <div className="relative">
          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.icon} {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Date de début */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <input
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange('dateFrom', e.target.value)}
            placeholder="Date début"
          />
        </div>

        {/* Date de fin */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <input
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange('dateTo', e.target.value)}
            placeholder="Date fin"
            min={filters.dateFrom}
          />
        </div>

        {/* Actions rapides */}
        <div className="flex gap-2">
          <button
            onClick={() => handleQuickDate('today')}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => handleQuickDate('week')}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            7 jours
          </button>
          <button
            onClick={() => handleQuickDate('month')}
            className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            30 jours
          </button>
        </div>
      </div>

      {/* Filtres actifs */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-2">
          <div className="flex flex-wrap gap-2">
            {filters.status && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                Statut: {STATUS_CONFIG[filters.status]?.label || filters.status}
                <button onClick={() => handleChange('status', '')} className="hover:text-blue-900">
                  ✕
                </button>
              </span>
            )}
            {filters.dateFrom && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                Du: {new Date(filters.dateFrom).toLocaleDateString()}
                <button onClick={() => handleChange('dateFrom', '')} className="hover:text-blue-900">
                  ✕
                </button>
              </span>
            )}
            {filters.dateTo && (
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
                Au: {new Date(filters.dateTo).toLocaleDateString()}
                <button onClick={() => handleChange('dateTo', '')} className="hover:text-blue-900">
                  ✕
                </button>
              </span>
            )}
          </div>
          <button
            onClick={onClear}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Effacer tout
          </button>
        </div>
      )}
    </div>
  );
}

// Composant principal
export default function Orders() {
  const {
    orders,
    loading,
    error,
    page,
    totalPages,
    totalCount,
    status,
    q,
    dateFrom,
    dateTo,
    setFilter,
    setPage,
    fetchOrders,
  } = useOrdersStore();

  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, [page, status, q, dateFrom, dateTo, fetchOrders]);

  // Calcul des statistiques par statut
  const statusCounts = useMemo(() => {
    return orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {});
  }, [orders]);

  const handleQuickInvoice = async (id) => {
    try {
      setProcessingId(id);
      await ordersService.invoice(id);
      await fetchOrders();
    } catch (error) {
      console.error("Erreur lors de la facturation:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleQuickPay = async (id) => {
    try {
      setProcessingId(id);
      await ordersService.pay(id);
      await fetchOrders();
    } catch (error) {
      console.error("Erreur lors du paiement:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleClearFilters = () => {
    setFilter({ status: '', q: '', dateFrom: '', dateTo: '' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
              <p className="mt-1 text-sm text-gray-500">
                Gérez et suivez toutes les commandes
              </p>
            </div>

            <button
              onClick={() => fetchOrders()}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          </div>

          {/* Stats */}
          <div className="mt-6">
            <OrderStats totalCount={totalCount} statusCounts={statusCounts} />
          </div>
        </div>

        {/* Filters */}
        <FilterSection>
          <AdvancedFilters
            filters={{ status, q, dateFrom, dateTo }}
            onFilterChange={setFilter}
            onClear={handleClearFilters}
          />
        </FilterSection>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button onClick={() => setFilter({ error: null })} className="text-red-500 hover:text-red-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    FBO
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading && orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg className="animate-spin h-8 w-8 mb-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm">Chargement des commandes...</span>
                      </div>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span className="text-sm mb-2">Aucune commande trouvée</span>
                        {(q || status || dateFrom || dateTo) && (
                          <button
                            onClick={handleClearFilters}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Réinitialiser les filtres
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr 
                      key={order.id} 
                      className="hover:bg-gray-50 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link 
                          to={`/orders/${order.id}`}
                          className="text-blue-300 hover:text-blue-800 font-medium flex items-center gap-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(order.createdAt)}
                        </Link>
                      </td>

                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-gray-800">
                          {order.fboNumero}
                        </code>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{order.fboNomComplet}</div>
                        {order.fboEmail && (
                          <div className="text-xs text-gray-500">{order.fboEmail}</div>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {formatAmount(order.totalFcfa)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleQuickInvoice(order.id)}
                            disabled={order.status !== "SUBMITTED" || processingId === order.id}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              order.status === "SUBMITTED"
                                ? "bg-purple-50 text-purple-700 hover:bg-purple-100"
                                : "bg-gray-50 text-gray-400 cursor-not-allowed"
                            }`}
                            title="Passer en facturé"
                          >
                            {processingId === order.id ? (
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <>
                                <span>Facturer</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleQuickPay(order.id)}
                            disabled={order.status !== "INVOICED" || processingId === order.id}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              order.status === "INVOICED"
                                ? "bg-green-50 text-green-700 hover:bg-green-100"
                                : "bg-gray-50 text-gray-400 cursor-not-allowed"
                            }`}
                            title="Passer en payé"
                          >
                            {processingId === order.id ? (
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <>
                                <span>Payé</span>
                              </>
                            )}
                          </button>

                          <Link
                            to={`/orders/${order.id}`}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir les détails"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination améliorée */}
          {totalPages > 1 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Affichage {((page - 1) * 10) + 1} - {Math.min(page * 10, totalCount)} sur {totalCount} commandes
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    ⏮
                  </button>
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1 || loading}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    ←
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          disabled={loading}
                          className={`min-w-[32px] h-8 text-sm font-medium rounded-lg transition-colors ${
                            page === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages || loading}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    →
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages || loading}
                    className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    ⏭
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}