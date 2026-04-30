// admin-app/src/pages/orders/OrdersListPage.jsx
// Page d'affichage de la liste des commandes, avec les filtres, les stats et le tableau.

import { useEffect, useState } from "react";
import { useOrdersStore } from "../store/useOrdersStore";
import OrdersFiltersCard from "../components/orders/OrdersFiltersCard";
import OrdersStatsBar from "../components/orders/OrdersStatsBar";
import OrdersTable from "../components/orders/OrdersTable";
import RequirePermission from "../components/auth/RequirePermission";
import { Permission } from "../auth/permissions";
import { ordersService } from "../services/ordersService";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildSubmittedOrdersPrintHtml(orders = []) {
  const cards = orders
    .map((order) => {
      const itemLines = (order.items || [])
        .map(
          (item) => `
            <div class="item-line">
              <span class="sku">${escapeHtml(item.sku || "Article")}</span>
              <span class="qty">x${Number(item.qty || 0)}</span>
            </div>
          `,
        )
        .join("");

      return `
        <article class="order-card">
          <div class="fbo-name">${escapeHtml(order.fboNomComplet || "-")}</div>
          <div class="fbo-meta">
            <span>FBO</span>
            <strong>${escapeHtml(order.fboNumero || "-")}</strong>
          </div>
          <div class="items-block">
            ${itemLines || '<div class="item-line"><span class="sku">Aucun article</span></div>'}
          </div>
          <div class="as400-box">
            <div class="as400-row"><span>Réf AS400 :</span></div>
            <div class="as400-row"><span>Montant AS400 :</span></div>
          </div>
        </article>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Commandes soumises</title>
    <style>
      @page { size: A4 landscape; margin: 8mm; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; font-family: Arial, sans-serif; color: #111827; }
      body { padding: 0; }
      .sheet {
        column-count: 4;
        column-gap: 8mm;
        column-fill: auto;
      }
      .order-card {
        break-inside: avoid;
        -webkit-column-break-inside: avoid;
        page-break-inside: avoid;
        padding: 0 0 4mm 0;
        margin: 0 0 4mm 0;
        border-bottom: 1px solid #111827;
      }
      .fbo-name {
        font-size: 11px;
        font-weight: 700;
        line-height: 1.25;
        margin-bottom: 1.5mm;
        text-transform: uppercase;
      }
      .fbo-meta {
        font-size: 9px;
        display: flex;
        gap: 4px;
        margin-bottom: 2mm;
      }
      .items-block {
        min-height: 26mm;
        margin-bottom: 2mm;
      }
      .item-line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 6px;
        font-size: 8.5px;
        line-height: 1.35;
        margin-bottom: 1mm;
      }
      .sku {
        flex: 1;
        font-weight: 600;
        word-break: break-word;
      }
      .qty {
        white-space: nowrap;
      }
      .as400-box {
        border: 1px solid #d1d5db;
        min-height: 18mm;
        padding: 2mm;
      }
      .as400-row {
        font-size: 8.5px;
        min-height: 6mm;
        display: flex;
        align-items: center;
      }
    </style>
  </head>
  <body>
    <main class="sheet">${cards}</main>
    <script>
      window.onload = function () { setTimeout(function () { window.print(); }, 250); };
      window.onafterprint = function () { window.close(); };
    </script>
  </body>
</html>`;
}

export default function OrdersListPage() {
  const [exporting, setExporting] = useState(false);
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
    as400Reference,
    as400Amount,
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
    as400Reference,
    as400Amount,
    assignedOnly,
    hasAssignee,
    invoicerId,
    sort,
    dir,
    fetchOrders,
  ]);

  async function handleExportSubmittedOrders() {
    if (exporting) return;
    setExporting(true);
    try {
      const popup = window.open("", "_blank", "noopener,noreferrer,width=1280,height=900");
      if (!popup) {
        throw new Error("Le popup d'impression a été bloqué par le navigateur.");
      }

      const result = await ordersService.getSubmittedExport({
        q: q || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort: sort || "createdAt",
        dir: dir || "desc",
      });

      const exportOrders = Array.isArray(result?.data) ? result.data : [];
      if (exportOrders.length === 0) {
        popup.close();
        throw new Error("Aucune commande soumise à exporter pour les filtres courants.");
      }

      popup.document.open();
      popup.document.write(buildSubmittedOrdersPrintHtml(exportOrders));
      popup.document.close();
    } catch (exportError) {
      console.error("submitted orders export error:", exportError);
      window.alert(
        exportError?.message || "Impossible de générer l'export des commandes soumises.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
            <p className="mt-1 text-sm text-gray-500">
              Vue globale des commandes, paiements et file de facturation
            </p>
          </div>

          <RequirePermission permission={Permission.PREORDER_READ}>
            <div className="flex flex-wrap items-center gap-3">
              <RequirePermission permission={Permission.EXPORT_READ}>
                <button
                  onClick={handleExportSubmittedOrders}
                  disabled={exporting}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  type="button"
                >
                  <svg
                    className="w-4 h-4 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 16V4m0 12 4-4m-4 4-4-4M4 20h16"
                    />
                  </svg>
                  {exporting ? "Préparation..." : "Exporter les soumises"}
                </button>
              </RequirePermission>

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
            </div>
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
            as400Reference,
            as400Amount,
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
