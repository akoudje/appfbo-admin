// src/components/orders/detail/OrderHistoryTimeline.jsx

import { formatDateTime } from "../../../lib/format";

const LOG_LABELS = {
  CREATE_DRAFT: "Brouillon créé",
  SET_ITEMS: "Panier mis à jour",
  REPRICE: "Recalcul",
  SUBMIT: "Commande soumise",
  INVOICE: "Préfacture créée",
  RECEIVE_PAYMENT_PROOF: "Preuve reçue",
  VERIFY_PAYMENT: "Paiement vérifié",
  MARK_PAID: "Paiement marqué OK",
  PREPARE: "Préparation",
  FULFILL: "Clôture",
  CANCEL: "Annulation",
  STOCK_DEBIT: "Sortie stock",
  STOCK_CREDIT: "Retour stock",
};

function formatMetaLines(log) {
  const meta = log?.meta || {};
  const lines = [];

  if (meta.factureReference) lines.push(`Référence facture : ${meta.factureReference}`);
  if (meta.paymentRef) lines.push(`Référence paiement : ${meta.paymentRef}`);
  if (meta.paymentProvider) lines.push(`Provider : ${meta.paymentProvider}`);
  if (meta.paymentFlow) lines.push(`Flux : ${meta.paymentFlow}`);
  if (meta.paydunyaStatus) lines.push(`Statut provider : ${meta.paydunyaStatus}`);
  if (meta.deliveryTracking) lines.push(`Tracking : ${meta.deliveryTracking}`);
  if (meta.stockRollback === true) lines.push("Stock réintégré : oui");
  if (meta.stockDeducted === true) lines.push("Stock décrémenté : oui");
  if (meta.qty) lines.push(`Quantité : ${meta.qty}`);
  if (meta.fromStatus || meta.toStatus) {
    lines.push(
      `Transition : ${meta.fromStatus || "—"} → ${meta.toStatus || "—"}`
    );
  }

  return lines;
}

export default function OrderHistoryTimeline({ logs }) {
  const sorted = [...(logs || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (!sorted.length) {
    return <div className="card p-4 text-sm text-gray-500">Aucun log</div>;
  }

  return (
    <div className="space-y-2">
      {sorted.map((log) => {
        const metaLines = formatMetaLines(log);

        return (
          <div key={log.id} className="card p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="font-medium">{LOG_LABELS[log.action] || log.action}</div>
              <div className="text-xs text-gray-500">
                {formatDateTime(log.createdAt)}
              </div>
            </div>

            {log.note ? (
              <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                {log.note}
              </div>
            ) : null}

            {metaLines.length > 0 ? (
              <div className="mt-2 space-y-1">
                {metaLines.map((line, idx) => (
                  <div key={idx} className="text-xs text-gray-500">
                    {line}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}