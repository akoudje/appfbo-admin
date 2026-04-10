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
        <div className="font-semibold">Client</div>
        <Row label="Numéro FBO" value={order?.fboNumero || "—"} />
        <Row label="Nom" value={order?.fboNomComplet || "—"} />
        <Row label="Grade" value={order?.billingGrade || order?.fboGrade || "—"} />
        <Row label="Point de vente" value={order?.pointDeVente || "—"} />
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold">Précommande</div>
        <Row label="Précommande" value={order?.preorderNumber || "—"} />
        <Row label="Numéro FBO" value={order?.fboNumero || "—"} />
        <Row label="Référence facture" value={order?.factureReference || "—"} />
        <Row label="Paiement" value={order?.preorderPaymentMode || "—"} />
        <Row label="Soumise" value={formatDateTime(order?.submittedAt)} />
        <Row label="Facturée" value={formatDateTime(order?.invoicedAt)} />
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold">Totaux</div>
        <Row label="Indicatif" value={formatFcfa(order?.indicativeTotalFcfa || order?.totalFcfa || 0)} />
        <Row label="AS400" value={formatFcfa(order?.as400InvoiceTotalFcfa || order?.totalFcfa || 0)} />
        <Row label="Frais livraison" value={formatFcfa(order?.fraisLivraisonFcfa || 0)} />
        <Row label="Final" value={formatFcfa(order?.activePayment?.amountExpectedFcfa || order?.totalFcfa || 0)} />
      </div>
    </div>
  );
}
