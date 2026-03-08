// src/components/orders/detail/OrderStockCard.jsx

import { formatDateTime } from "../../../lib/format";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
}

export default function OrderStockCard({
  order,
  stockSummary,
  stockDebited,
  stockRestored,
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="font-semibold">Stock</div>

      <Row
        label="Sortie stock"
        value={stockDebited ? formatDateTime(order?.stockDeductedAt) : "Pas encore"}
      />
      <Row
        label="Retour stock"
        value={stockRestored ? formatDateTime(order?.stockRestoredAt) : "—"}
      />
      <Row label="Débit total" value={stockSummary?.debitQty || 0} />
      <Row label="Crédit total" value={stockSummary?.creditQty || 0} />
    </div>
  );
}