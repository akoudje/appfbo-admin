// admin-app/src/components/orders/OrdersTable.jsx
// Composant d'affichage de la liste des commandes dans un tableau,
// avec pagination, tri et filtres.

import { Link } from "react-router-dom";
import StatusBadge from "../StatusBadge";
import OrderPaymentBadge from "./OrderPaymentBadge";
import OrderBillingBadge from "./OrderBillingBadge";
import RequirePermission from "../auth/RequirePermission";
import { Permission } from "../../auth/permissions";

function PriorityBadge({ priority }) {
  const tones = {
    LOW: "bg-gray-100 text-gray-700 border-gray-200",
    NORMAL: "bg-blue-50 text-blue-700 border-blue-200",
    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
    URGENT: "bg-red-50 text-red-700 border-red-200",
  };

  if (!priority) return <span className="text-xs text-gray-400">—</span>;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        tones[priority] || tones.LOW
      }`}
    >
      {priority}
    </span>
  );
}

function formatDate(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(dateString) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatAmount(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function EmptyState({ onReset }) {
  return (
    <tr>
      <td colSpan={8} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <svg
            className="w-12 h-12 mb-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <span className="text-sm mb-2">Aucune commande trouvée</span>
          <button
            onClick={onReset}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            type="button"
          >
            Réinitialiser les filtres
          </button>
        </div>
      </td>
    </tr>
  );
}

function LoadingState() {
  return (
    <tr>
      <td colSpan={8} className="px-6 py-12 text-center">
        <div className="flex flex-col items-center justify-center text-gray-500">
          <svg className="animate-spin h-8 w-8 mb-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">Chargement des commandes...</span>
        </div>
      </td>
    </tr>
  );
}

function Pagination({
  page,
  pageSize,
  totalPages,
  totalCount,
  loading,
  setPage,
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Affichage {(page - 1) * pageSize + 1} -{" "}
          {Math.min(page * pageSize, totalCount)} sur {totalCount} commandes
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(1)}
            disabled={page <= 1 || loading}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            ⏮
          </button>

          <button
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || loading}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            ←
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) pageNum = i + 1;
              else if (page <= 3) pageNum = i + 1;
              else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
              else pageNum = page - 2 + i;

              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  disabled={loading}
                  className={`min-w-[32px] h-8 text-sm font-medium rounded-lg ${
                    page === pageNum
                      ? "bg-blue-600 text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                  type="button"
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            →
          </button>

          <button
            onClick={() => setPage(totalPages)}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            ⏭
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersTable({
  orders,
  loading,
  page,
  pageSize,
  totalPages,
  totalCount,
  setPage,
  onResetFilters,
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Précommande
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
                Statuts
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Facturation
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignation
              </th>
              <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {loading && (orders?.length || 0) === 0 ? (
              <LoadingState />
            ) : (orders?.length || 0) === 0 ? (
              <EmptyState onReset={onResetFilters} />
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-gray-50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <RequirePermission
                        permission={Permission.PREORDER_READ}
                        fallback={
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {order.preorderNumber || "—"}
                          </span>
                        }
                      >
                        <Link
                          to={`/orders/${order.id}`}
                          className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {order.preorderNumber || "—"}
                        </Link>
                      </RequirePermission>
                      <div className="text-xs text-gray-500">
                        {order.parcelNumber || "Colis non généré"}
                      </div>
                      <div className="text-xs text-gray-500">
                        Créée le {formatDateShort(order.createdAt)}
                      </div>
                      <div className="text-xs text-gray-500">
                        MAJ le {formatDateShort(order.updatedAt)}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-gray-800">
                        {order.fboNumero || "—"}
                      </code>
                      <div className="text-xs text-gray-500">
                        {order.fboGrade || "—"}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">
                      {order.fboNomComplet || "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order.pointDeVente || "—"}
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">
                      {formatAmount(order.totalFcfa)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {order._count?.items || 0} article(s)
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <StatusBadge status={order.status} />
                      <OrderPaymentBadge status={order.paymentStatus} />
                      <div className="text-xs text-gray-500">
                        {order.paymentProvider || "—"}
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <OrderBillingBadge status={order.billingWorkStatus} />
                      <PriorityBadge priority={order.billingPriority} />
                    </div>
                  </td>

                  <td className="px-6 py-4">
                    {order.assignedInvoicer ? (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {order.assignedInvoicer.fullName || "—"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.assignedAt
                            ? formatDate(order.assignedAt)
                            : "Assignée"}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">
                        Non assignée
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <RequirePermission permission={Permission.PREORDER_READ}>
                        <Link
                          to={`/orders/${order.id}`}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Voir les détails"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                        </Link>
                      </RequirePermission>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalCount={totalCount}
        loading={loading}
        setPage={setPage}
      />
    </div>
  );
}
