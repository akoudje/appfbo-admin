// src/components/orders/detail/OrderSummaryCards.jsx

import { formatDateTime, formatFcfa } from "../../../lib/format";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
}

export default function OrderSummaryCards({ order }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="card p-4 space-y-3">
        <div className="font-semibold">Client FBO</div>
        <Row label="Numéro FBO" value={order?.fboNumero || "—"} />
        <Row label="Nom" value={order?.fboNomComplet || "—"} />
        <Row label="Grade" value={order?.fboGrade || "—"} />
        <Row label="Point de vente" value={order?.pointDeVente || "—"} />
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold">Paiement & dates</div>
        <Row label="Référence facture" value={order?.factureReference || "—"} />
        <Row label="Référence paiement" value={order?.paymentRef || "—"} />
        <Row label="Soumise" value={formatDateTime(order?.submittedAt)} />
        <Row label="Payée" value={formatDateTime(order?.paidAt)} />
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold">Totaux</div>
        <Row label="Produits" value={formatFcfa(order?.totalProduitsFcfa || 0)} />
        <Row label="Livraison" value={formatFcfa(order?.fraisLivraisonFcfa || 0)} />
        <Row label="Total" value={formatFcfa(order?.totalFcfa || 0)} />
        <Row label="Total CC" value={String(order?.totalCc || "0")} />
      </div>
    </div>
  );
}