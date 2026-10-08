import { formatFcfa } from "../../../lib/format";
import { orderAmounts } from "../../../lib/orders/orderPresentation";
export default function OrderSummaryCards({ order }) {
  const amounts = orderAmounts(order);
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        [
          "Montant indicatif",
          amounts.indicative,
          "Estimation de la précommande",
        ],
        [
          "Montant AS400 confirmé",
          amounts.confirmed,
          "Facture reçue du service facturation",
        ],
        [
          "Montant du règlement",
          amounts.expected,
          "Montant attendu par le paiement actif",
        ],
      ].map(([label, value, help]) => (
        <div
          key={label}
          className="rounded-xl border border-gray-200 bg-white p-4"
        >
          <p className="text-xs font-medium text-gray-500">{label}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
            {value === null ? "Non reçu" : formatFcfa(value)}
          </p>
          <p className="mt-2 text-xs text-gray-500">{help}</p>
        </div>
      ))}
    </div>
  );
}
