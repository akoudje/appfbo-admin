// src/components/orders/detail/OrderHistoryTab.jsx

import OrderHistoryTimeline from "./OrderHistoryTimeline";

export default function OrderHistoryTab({ logs }) {
  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-2">
        <div className="font-semibold">Historique</div>
        <div className="text-sm text-gray-500">
          Journal métier des actions effectuées sur cette commande.
        </div>
      </div>

      <OrderHistoryTimeline logs={logs} />
    </div>
  );
}