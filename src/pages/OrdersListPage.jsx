import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Download, RefreshCw, ClipboardList } from "lucide-react";
import { useOrdersStore } from "../store/useOrdersStore";
import OrdersFiltersCard from "../components/orders/OrdersFiltersCard";
import OrdersStatsBar from "../components/orders/OrdersStatsBar";
import OrdersTable from "../components/orders/OrdersTable";
import ExportOrdersByNumberModal from "../components/orders/ExportOrdersByNumberModal";
import { Permission, hasPermission } from "../auth/permissions";
import { getOrderTabsForRole } from "../auth/workspaces";
import useAdminAuth from "../hooks/useAdminAuth";
import useOrdersScope, { ordersScopeKey } from "../hooks/orders/useOrdersScope";
import { ordersService } from "../services/ordersService";
import {
  DEFAULT_ORDER_FILTERS,
  readOrderFilters,
  orderFilterParams,
  orderRequestParams,
} from "../lib/orders/orderFilters";
export default function OrdersListPage() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => readOrderFilters(params), [params]);
  const { role, permissions } = useAdminAuth();
  const scope = useOrdersScope();
  const {
    orders,
    loading,
    error,
    totalCount,
    totalPages,
    stats,
    loadedAt,
    _context,
    fetchOrders,
  } = useOrdersStore();
  const [exportOpen, setExportOpen] = useState(false),
    [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState("");
  const access = useMemo(
    () => ({
      billing: hasPermission(role, Permission.INVOICE_CREATE, permissions),
      payment: hasPermission(role, Permission.PAYMENT_VALIDATE, permissions),
      preparation: hasPermission(
        role,
        Permission.PREPARATION_UPDATE,
        permissions,
      ),
      overview: getOrderTabsForRole(role, false, "SUBMITTED").some(
        (tab) => tab.key === "overview",
      ),
    }),
    [role, permissions],
  );
  const canExport = hasPermission(role, Permission.EXPORT_READ, permissions);
  useEffect(() => {
    fetchOrders(filters);
  }, [fetchOrders, filters, scope]);
  const change = useCallback(
    (patch) => setParams(orderFilterParams({ ...filters, ...patch, page: 1 })),
    [filters, setParams],
  );
  useEffect(() => {
    if (!loading && !error && _context === scope && filters.page > totalPages)
      setParams(orderFilterParams({ ...filters, page: totalPages }), {
        replace: true,
      });
  }, [loading, error, _context, scope, filters, totalPages, setParams]);
  const reset = () => setParams(orderFilterParams(DEFAULT_ORDER_FILTERS));
  const rows = _context === scope ? orders : [];
  const pending = loading || _context !== scope;
  const submittedParams = new URLSearchParams(
    Object.entries(orderRequestParams(filters)).filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    ),
  );
  submittedParams.delete("status");
  submittedParams.delete("page");
  submittedParams.delete("pageSize");
  const views = [
    ["Toutes", {}],
    ...(access.billing ? [["À facturer", { status: "SUBMITTED" }]] : []),
    ...(access.payment
      ? [["Paiements à suivre", { paymentStatus: "PAYMENT_PENDING" }]]
      : []),
    ...(access.preparation
      ? [
          ["À préparer", { status: "PAID" }],
          ["À remettre", { status: "READY" }],
        ]
      : []),
    ...(access.billing ? [["Mes dossiers", { assignedToMe: true }]] : []),
    ["À revoir", { billingWorkStatus: "ESCALATED" }],
    ["Annulées", { status: "CANCELLED" }],
  ];
  async function exportView() {
    setExporting(true);
    setExportError("");
    try {
      const result = await ordersService.exportView(
        orderRequestParams(filters),
      );
      if (ordersScopeKey() !== scope) return;
      const url = URL.createObjectURL(result.data),
        link = document.createElement("a");
      link.href = url;
      link.download =
        "commandes-" + new Date().toISOString().slice(0, 10) + ".csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      let message = failure?.response?.data?.message;
      if (failure?.response?.data instanceof Blob) {
        try {
          message = JSON.parse(await failure.response.data.text()).message;
        } catch {
          /* Non-JSON transport error. */
        }
      }
      setExportError(message || "Impossible de générer l’export. Réessayez.");
    } finally {
      setExporting(false);
    }
  }
  return (
    <div className="space-y-5 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gray-950 p-5 text-white">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList size={24} aria-hidden="true" />
            <h1 className="text-2xl font-semibold">Commandes</h1>
          </div>
          <p className="mt-2 text-sm text-gray-300">
            Suivez les dossiers et accédez à la prochaine étape de traitement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => fetchOrders(filters)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw size={16} className={pending ? "animate-spin" : ""} />
            Actualiser
          </button>
          {canExport && (
            <details className="relative">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black">
                <Download size={16} />
                Exporter
              </summary>
              <div className="absolute right-0 z-20 mt-2 w-64 rounded-xl border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-lg">
                <button
                  type="button"
                  disabled={exporting || pending}
                  onClick={exportView}
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100 disabled:opacity-50"
                >
                  {exporting ? "Génération…" : "Cette vue · CSV"}
                </button>
                <Link
                  target="_blank"
                  rel="noreferrer"
                  to={
                    "/orders/submitted-export/print?" +
                    submittedParams.toString()
                  }
                  className="block rounded-lg px-3 py-2 hover:bg-gray-100"
                >
                  Soumises · feuille de préparation
                </Link>
                <button
                  type="button"
                  onClick={() => setExportOpen(true)}
                  className="w-full rounded-lg px-3 py-2 text-left hover:bg-gray-100"
                >
                  Sélection par numéro
                </button>
              </div>
            </details>
          )}
        </div>
      </header>
      <nav aria-label="Vues des commandes" className="flex flex-wrap gap-2">
        {views.map(([label, patch]) => {
          const base = {
            status: "",
            paymentStatus: "",
            billingWorkStatus: "",
            assignedToMe: false,
            assignedOnly: false,
            invoicerId: "",
            lateWaveReview: false,
          };
          const selected = Object.entries({ ...base, ...patch }).every(
            ([key, value]) => filters[key] === value,
          );
          return (
            <button
              type="button"
              key={label}
              aria-pressed={selected}
              onClick={() => change({ ...base, ...patch })}
              className={
                "rounded-full border px-4 py-2 text-sm font-medium " +
                (selected
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
              }
            >
              {label}
            </button>
          );
        })}
      </nav>
      <OrdersStatsBar
        totalCount={_context === scope ? totalCount : 0}
        stats={_context === scope ? stats : null}
        loading={pending}
      />
      <OrdersFiltersCard
        filters={filters}
        onFilterChange={change}
        onClear={reset}
      />
      {(error || exportError) && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <span>{error || exportError}</span>
          <button
            type="button"
            onClick={() => (error ? fetchOrders(filters) : exportView())}
            className="font-semibold underline"
          >
            Réessayer
          </button>
        </div>
      )}
      <p role="status" className="text-xs text-gray-500">
        {pending
          ? "Chargement de cette vue…"
          : loadedAt
            ? "Dernière actualisation : " +
              new Date(loadedAt).toLocaleTimeString("fr-FR")
            : ""}
      </p>
      <OrdersTable
        orders={rows}
        loading={pending}
        error={error}
        page={filters.page}
        pageSize={filters.pageSize}
        totalPages={totalPages}
        totalCount={totalCount}
        setPage={(page) => setParams(orderFilterParams({ ...filters, page }))}
        setPageSize={(pageSize) => change({ pageSize })}
        access={access}
        returnTo={"/orders?" + params.toString()}
      />
      <ExportOrdersByNumberModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />
    </div>
  );
}
