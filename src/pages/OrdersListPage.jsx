// admin-app/src/pages/orders/OrdersListPage.jsx
// Page d'affichage de la liste des commandes, avec les filtres, les stats et le tableau.

import { useEffect } from "react";
import { useOrdersStore } from "../store/useOrdersStore";
import OrdersFiltersCard from "../components/orders/OrdersFiltersCard";
import OrdersStatsBar from "../components/orders/OrdersStatsBar";
import OrdersTable from "../components/orders/OrdersTable";
import RequirePermission from "../components/auth/RequirePermission";
import { Permission } from "../auth/permissions";

export default function OrdersListPage() {
  const {
    orders,
    loading,
    error,
    page,
    pageSize,
    totalPages,
    totalCount,

    status,
    q,
    dateFrom,
    dateTo,
    paymentStatus,
    billingWorkStatus,
    priority,
    assignedOnly,
    hasAssignee,
    invoicerId,
    sort,
    dir,

    setFilter,
    setPage,
    fetchOrders,
    resetFilters,
    clearError,
  } = useOrdersStore();

  useEffect(() => {
    fetchOrders();
  }, [
    page,
    pageSize,
    status,
    q,
    dateFrom,
    dateTo,
    paymentStatus,
    billingWorkStatus,
    priority,
    assignedOnly,
    hasAssignee,
    invoicerId,
    sort,
    dir,
    fetchOrders,
  ]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Vue globale des commandes, paiements et file de facturation
            </p>
          </div>

          <RequirePermission permission={Permission.PREORDER_READ}>
            <button
              onClick={() => fetchOrders()}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              type="button"
            >
              <svg
                className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {loading ? "Chargement..." : "Rafraîchir"}
            </button>
          </RequirePermission>
        </div>

        <OrdersStatsBar totalCount={totalCount} orders={orders} />

        <OrdersFiltersCard
          filters={{
            status,
            q,
            dateFrom,
            dateTo,
            paymentStatus,
            billingWorkStatus,
            priority,
            assignedOnly,
            hasAssignee,
            invoicerId,
            sort,
            dir,
          }}
          onFilterChange={setFilter}
          onClear={resetFilters}
        />

        {error && (
          <div className="p-4 bg-red-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3 text-red-700">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">{error}</span>
            </div>

            <button
              onClick={clearError}
              className="text-red-500 hover:text-red-700"
              type="button"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>
        )}

        <OrdersTable
          orders={orders}
          loading={loading}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          totalCount={totalCount}
          setPage={setPage}
          onResetFilters={resetFilters}
        />
      </div>
    </div>
  );
}