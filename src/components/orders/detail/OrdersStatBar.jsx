// admin-app/src/components/orders/OrdersStatsBar.jsx
// Composant d'affichage d'une barre de statistiques sur les commandes, avec le nombre total et une répartition par statut (soumis, préfacturés, en attente de paiement, payés, prêts, clôturés, annulés).

const ORDER_STATUS_CONFIG = {
  SUBMITTED: { label: "Soumises", dot: "bg-blue-500" },
  INVOICED: { label: "Préfacturées", dot: "bg-purple-500" },
  PAYMENT_PENDING: { label: "Paiement attente", dot: "bg-amber-500" },
  PAID: { label: "Payées", dot: "bg-green-500" },
  READY: { label: "Prêtes", dot: "bg-indigo-500" },
  FULFILLED: { label: "Clôturées", dot: "bg-emerald-600" },
  CANCELLED: { label: "Annulées", dot: "bg-red-500" },
};

function Dot({ className }) {
  return <span className={`w-2 h-2 rounded-full ${className}`} />;
}

export default function OrdersStatsBar({ totalCount, orders }) {
  const counts = (orders || []).reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  const orderedStatuses = [
    "SUBMITTED",
    "INVOICED",
    "PAYMENT_PENDING",
    "PAID",
    "READY",
    "FULFILLED",
    "CANCELLED",
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold text-gray-900">{totalCount}</span>
          <span className="text-sm text-gray-500">total</span>
        </div>

        <div className="w-px h-8 bg-gray-200 hidden sm:block" />

        <div className="flex flex-wrap items-center gap-4">
          {orderedStatuses.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <Dot className={ORDER_STATUS_CONFIG[status]?.dot || "bg-gray-400"} />
              <span className="text-sm text-gray-600">
                {ORDER_STATUS_CONFIG[status]?.label || status}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {counts[status] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}