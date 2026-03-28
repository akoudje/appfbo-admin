// src/components/orders/detail/OrderHistoryTab.jsx

import OrderHistoryTimeline from "./OrderHistoryTimeline";

function filterLogsByRole(logs = [], role) {
  const items = Array.isArray(logs) ? logs : [];

  const billingActions = new Set([
    "ASSIGN_INVOICER",
    "RELEASE_INVOICER",
    "START_BILLING",
    "ESCALATE_BILLING",
    "WAIT_CUSTOMER_DATA",
    "INVOICE",
  ]);

  const cashierActions = new Set([
    "RECEIVE_MANUAL_PAYMENT_PROOF",
    "VALIDATE_MANUAL_PAYMENT",
    "PAYMENT_CONFIRMED",
    "LAUNCH_PREPARATION",
  ]);

  const preparationActions = new Set([
    "LAUNCH_PREPARATION",
    "PREPARE",
    "STOCK_DEBIT",
    "STOCK_CREDIT",
  ]);

  if (role === "INVOICER" || role === "BILLING_MANAGER") {
    return items.filter((log) => billingActions.has(log?.action));
  }

  if (role === "CAISSIERE" || role === "COUNTER_MANAGER") {
    return items.filter((log) => cashierActions.has(log?.action));
  }

  if (role === "ORDER_PREPARER" || role === "STOCK_MANAGER") {
    return items.filter((log) => preparationActions.has(log?.action));
  }

  return items;
}

function getHistoryTitle(role) {
  if (role === "INVOICER" || role === "BILLING_MANAGER") {
    return "Historique facturation";
  }
  if (role === "CAISSIERE" || role === "COUNTER_MANAGER") {
    return "Historique caisse";
  }
  if (role === "ORDER_PREPARER" || role === "STOCK_MANAGER") {
    return "Historique préparation";
  }
  return "Historique";
}

export default function OrderHistoryTab({ logs, role }) {
  const filteredLogs = filterLogsByRole(logs, role);

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-2">
        <div className="font-semibold">{getHistoryTitle(role)}</div>
        <div className="text-sm text-gray-500">
          Journal métier des actions utiles pour cet espace de travail.
        </div>
      </div>

      <OrderHistoryTimeline logs={filteredLogs} />
    </div>
  );
}
