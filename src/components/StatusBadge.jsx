import { ORDER_STATUSES, orderLabel } from "../lib/orders/orderPresentation";
export default function StatusBadge({ status }) {
  const config = ORDER_STATUSES[status];
  return (
    <span
      className={
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold " +
        (config?.cls || "bg-gray-100 text-gray-700")
      }
    >
      {orderLabel(status)}
    </span>
  );
}
