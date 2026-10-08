import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowUpRight } from "lucide-react";
import StatusBadge from "../StatusBadge";
import {
  orderAmounts,
  orderLabel,
  orderNextAction,
} from "../../lib/orders/orderPresentation";
import { formatFcfa, formatDateTime } from "../../lib/format";
export default function OrdersTable({
  orders,
  loading,
  error,
  page,
  pageSize,
  totalPages,
  totalCount,
  setPage,
  setPageSize,
  access,
  returnTo = "/orders",
}) {
  return (
    <section
      aria-label="Liste des commandes"
      aria-busy={loading}
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      {loading && (
        <div
          role="status"
          className="border-b bg-amber-50 px-4 py-2 text-sm text-amber-800"
        >
          Actualisation des résultats…
        </div>
      )}
      <div
        className={
          "hidden md:block overflow-x-auto " +
          (loading ? "opacity-60 pointer-events-none" : "")
        }
      >
        <table className="w-full min-w-[840px] text-sm">
          <thead className="sticky top-0 bg-gray-50 text-left text-xs text-gray-600">
            <tr>
              {[
                "Références",
                "Client / FBO",
                "Montant",
                "Suivi",
                "Responsable",
                "Action",
              ].map((label) => (
                <th scope="col" key={label} className="px-4 py-3 font-semibold">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!orders.length && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-gray-500"
                >
                  {loading
                    ? "Chargement des commandes…"
                    : error
                      ? "Les résultats ne sont pas disponibles."
                      : "Aucune commande ne correspond à cette vue."}
                </td>
              </tr>
            )}
            {orders.map((order) => {
              const amount = orderAmounts(order),
                action = orderNextAction(order, access);
              const suffix = "returnTo=" + encodeURIComponent(returnTo);
              const href =
                action?.route ||
                "/orders/" + order.id + "?tab=" + action.tab + "&" + suffix;
              return (
                <tr key={order.id} className="align-top hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <Link
                      to={"/orders/" + order.id + "?" + suffix}
                      className="font-mono text-xs font-semibold text-gray-950 underline decoration-gray-300 underline-offset-4"
                    >
                      {order.preorderNumber || "Sans référence"}
                    </Link>
                    <p className="mt-1 text-xs text-gray-500">
                      {order.parcelNumber || "Colis non généré"}
                    </p>
                    <p className="mt-2 text-xs text-gray-500">
                      {formatDateTime(order.createdAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-gray-900">
                      {order.fboNomComplet || "Client non renseigné"}
                    </p>
                    <p className="mt-1 font-mono text-xs text-gray-500">
                      {order.fboNumero || "—"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {order.pointDeVente || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="font-semibold tabular-nums text-gray-900">
                      {amount.display === null
                        ? "—"
                        : formatFcfa(amount.display)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">{amount.label}</p>
                    {order._count?.items === 0 && (
                      <p className="mt-2 text-xs font-medium text-red-700">
                        Aucun article : à vérifier
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={order.status} />
                    <p className="mt-1 text-xs text-gray-600">
                      Paiement :{" "}
                      {order.paymentStatus === "PAID"
                        ? "Payé"
                        : orderLabel(order.paymentStatus)}
                    </p>
                    {access.billing && order.billingWorkStatus && (
                      <p className="mt-1 text-xs text-gray-500">
                        {orderLabel(order.billingWorkStatus)} ·{" "}
                        {orderLabel(order.billingPriority)}
                      </p>
                    )}
                    {order.billingWorkStatus === "ESCALATED" && (
                      <p className="mt-1 text-xs font-semibold text-red-700">
                        Dossier à revoir
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-gray-700">
                      {order.assignedInvoicer?.fullName || "Non assignée"}
                    </p>
                    {order.billingSlaDeadlineAt && (
                      <p
                        className={
                          "mt-1 text-xs " +
                          (new Date(order.billingSlaDeadlineAt) < new Date() &&
                          !["PAID", "READY", "FULFILLED", "CANCELLED"].includes(
                            order.status,
                          )
                            ? "font-semibold text-red-700"
                            : "text-gray-500")
                        }
                      >
                        Échéance : {formatDateTime(order.billingSlaDeadlineAt)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      to={href}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 hover:border-gray-400 hover:bg-gray-100"
                    >
                      {action.label}
                      <ArrowUpRight size={14} />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div
        className={
          "divide-y divide-gray-100 md:hidden " +
          (loading ? "opacity-60 pointer-events-none" : "")
        }
      >
        {!orders.length && (
          <p className="p-6 text-center text-sm text-gray-500">
            {loading
              ? "Chargement…"
              : error
                ? "Résultats indisponibles."
                : "Aucune commande dans cette vue."}
          </p>
        )}
        {orders.map((order) => {
          const amount = orderAmounts(order),
            action = orderNextAction(order, access);
          const href =
            action.route ||
            "/orders/" +
              order.id +
              "?tab=" +
              action.tab +
              "&returnTo=" +
              encodeURIComponent(returnTo);
          return (
            <article key={order.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {order.fboNomComplet || "Client non renseigné"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {order.preorderNumber}
                  </p>
                  <p className="text-xs text-gray-500">FBO {order.fboNumero}</p>
                </div>
                <StatusBadge status={order.status} />
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">
                    {amount.display === null ? "—" : formatFcfa(amount.display)}
                  </p>
                  <p className="text-xs text-gray-500">{amount.label}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {order.assignedInvoicer?.fullName || "Non assignée"}
                  </p>
                </div>
                <Link
                  to={href}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold"
                >
                  {action.label}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-gray-50 px-4 py-3 text-xs text-gray-600">
        <label className="flex items-center gap-2">
          Par page
          <select
            aria-label="Commandes par page"
            value={pageSize}
            onChange={(event) => setPageSize(Number(event.target.value))}
            disabled={loading}
            className="rounded border border-gray-300 bg-white px-2 py-1"
          >
            {[20, 50, 100].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <span>
          {totalCount ? (page - 1) * pageSize + 1 : 0}–
          {Math.min(page * pageSize, totalCount)} sur {totalCount}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Page précédente"
            disabled={loading || page <= 1}
            onClick={() => setPage(page - 1)}
            className="rounded-lg border bg-white p-2 disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            aria-label="Page suivante"
            disabled={loading || page >= totalPages}
            onClick={() => setPage(page + 1)}
            className="rounded-lg border bg-white p-2 disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
