// admin-app/src/components/orders/OrderBillingBadge.jsx
// Composant d'affichage du statut de facturation d'une commande, avec un badge coloré selon le statut (en file, assignée, en cours, etc.).

export default function OrderBillingBadge({ status }) {
  const map = {
    QUEUED: {
      label: "En file",
      className: "bg-gray-100 text-gray-700 border-gray-200",
    },
    ASSIGNED: {
      label: "Assignée",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    IN_PROGRESS: {
      label: "En cours",
      className: "bg-blue-50 text-blue-700 border-blue-200",
    },
    WAITING_CUSTOMER_DATA: {
      label: "Attente infos client",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    WAITING_PAYMENT: {
      label: "Attente paiement",
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    ESCALATED: {
      label: "Escaladée",
      className: "bg-red-50 text-red-700 border-red-200",
    },
    RELEASED: {
      label: "Relâchée",
      className: "bg-purple-50 text-purple-700 border-purple-200",
    },
    COMPLETED: {
      label: "Terminée",
      className: "bg-green-50 text-green-700 border-green-200",
    },
    DONE: {
      label: "Terminée",
      className: "bg-green-50 text-green-700 border-green-200",
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
