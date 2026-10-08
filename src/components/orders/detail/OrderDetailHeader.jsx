import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, RefreshCw } from "lucide-react";
import StatusBadge from "../../StatusBadge";
import {
  orderAmounts,
  orderLabel,
} from "../../../lib/orders/orderPresentation";
import { formatFcfa, formatDateTime } from "../../../lib/format";
export default function OrderDetailHeader({
  order,
  saving,
  onRefresh,
  primaryAction,
  onPrimaryAction,
  canCancel,
  onGoCancel,
  loadedAt,
  backHref = "/orders",
}) {
  const amounts = orderAmounts(order);
  return (
    <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <Link
        to={backHref}
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft size={14} />
        Retour aux commandes
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Précommande {order.preorderNumber || "—"}
          </p>
          <h1 className="mt-1 text-xl font-semibold text-gray-950">
            {order.fboNomComplet || "Client non renseigné"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            FBO {order.fboNumero || "—"} · {orderLabel(order.deliveryMode)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} />
            <span className="text-xs text-gray-600">
              {orderLabel(order.preorderPaymentMode || order.paymentMode)}
            </span>
            {order.parcelNumber && (
              <span className="font-mono text-xs text-gray-500">
                {order.parcelNumber}
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">{amounts.label}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-950">
            {amounts.display === null ? "—" : formatFcfa(amounts.display)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Créée le {formatDateTime(order.createdAt)}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
        <div className="flex flex-wrap gap-2">
          {primaryAction && (
            <button
              type="button"
              disabled={saving}
              onClick={() => onPrimaryAction(primaryAction)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#FFC600] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              {primaryAction.label}
              <ArrowUpRight size={16} />
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 disabled:opacity-50"
          >
            <RefreshCw size={15} />
            Actualiser
          </button>
          {canCancel && (
            <button
              type="button"
              disabled={saving}
              onClick={onGoCancel}
              className="rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Annuler
            </button>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {loadedAt
            ? "Actualisé à " + new Date(loadedAt).toLocaleTimeString("fr-FR")
            : ""}
        </span>
      </div>
    </header>
  );
}
