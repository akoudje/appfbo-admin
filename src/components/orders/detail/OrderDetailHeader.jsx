// src/components/orders/detail/OrderDetailHeader.jsx

import { Link } from "react-router-dom";
import StatusBadge from "../../StatusBadge";
import { formatFcfa } from "../../../lib/format";

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
        tones[tone] || tones.gray
      }`}
    >
      {children}
    </span>
  );
}

function PaymentModeBadge({ mode }) {
  if (!mode) return <Badge tone="gray">Paiement non défini</Badge>;
  const isCash = mode === "ESPECES";
  return (
    <Badge tone={isCash ? "amber" : "blue"}>
      {isCash ? "💵 Espèces" : "💳 Mobile money"}
      <span className="opacity-70">{mode}</span>
    </Badge>
  );
}

function DeliveryModeBadge({ mode }) {
  if (!mode) return <Badge tone="gray">Livraison non définie</Badge>;
  const isPickup = mode === "RETRAIT_SITE_FLP";
  return (
    <Badge tone={isPickup ? "violet" : "gray"}>
      {isPickup ? "🏢 Retrait FLP" : "🚚 Livraison"}
      <span className="opacity-70">{mode}</span>
    </Badge>
  );
}

export default function OrderDetailHeader({
  order,
  saving,
  canCancel,
  onRefresh,
  onGoCancel,
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div>
        <Link to="/orders" className="text-sm text-gray-600 underline">
          ← Retour commandes
        </Link>

        <div className="mt-2 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-semibold">Détail commande</h1>
          <StatusBadge status={order?.status} />
          <PaymentModeBadge mode={order?.paymentMode} />
          <DeliveryModeBadge mode={order?.deliveryMode} />
        </div>

        <div className="text-xs text-gray-500 font-mono mt-1">
          {order?.id}
        </div>

        <div className="text-sm text-gray-500 mt-2 flex gap-4 flex-wrap">
          <span>
            <b>FBO :</b> {order?.fboNomComplet || "—"}
          </span>
          <span>
            <b>Réf. facture :</b> {order?.factureReference || "—"}
          </span>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <div className="text-right mr-2">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-semibold">
            {formatFcfa(order?.totalFcfa || 0)}
          </div>
        </div>

        <button className="btn" onClick={onRefresh} disabled={saving}>
          Rafraîchir
        </button>

        {canCancel && (
          <button className="btn" onClick={onGoCancel} disabled={saving}>
            Annuler
          </button>
        )}
      </div>
    </div>
  );
}