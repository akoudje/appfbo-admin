// admin-app/src/components/orders/OrderPaymentBadge.jsx
// Composant d'affichage du statut de paiement d'une commande, avec un badge coloré selon le statut (non payé, en attente, payé, etc.).

export default function OrderPaymentBadge({ status }) {
  const map = {
    UNPAID: {
      label: "Non payé",
      className: "bg-gray-100 text-gray-700 border-gray-200",
    },
    PAYMENT_PENDING: {
      label: "Paiement en attente",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    PAID: {
      label: "Payé",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    FAILED: {
      label: "Échec paiement",
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };

  const conf = map[status] || {
    label: status || "—",
    className: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${conf.className}`}
    >
      {conf.label}
    </span>
  );
}