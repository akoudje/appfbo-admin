import { AdminRole } from "./permissions";

const DASHBOARD_ROLES = new Set([
  AdminRole.SUPER_ADMIN,
  AdminRole.TECH_ADMIN,
  AdminRole.OPERATIONS_DIRECTOR,
  AdminRole.SALES_DIRECTOR,
]);

export function getDefaultWorkspaceRoute(role) {
  switch (role) {
    case AdminRole.INVOICER:
    case AdminRole.BILLING_MANAGER:
      return "/billing";
    case AdminRole.CAISSIERE:
    case AdminRole.COUNTER_MANAGER:
      return "/cashier";
    case AdminRole.ORDER_PREPARER:
      return "/preparation";
    case AdminRole.STOCK_MANAGER:
      return "/stock";
    case AdminRole.MARKETING_ASSISTANT:
      return "/marketing/sms-campaigns";
    default:
      return "/dashboard";
  }
}

export function shouldShowDashboard(role) {
  return DASHBOARD_ROLES.has(role);
}

export function getWorkspaceNavKeys(role) {
  switch (role) {
    case AdminRole.INVOICER:
      return new Set(["billing"]);
    case AdminRole.BILLING_MANAGER:
      return new Set(["orders", "billing", "reports"]);
    case AdminRole.COUNTER_MANAGER:
      return new Set(["cashier", "reports"]);
    case AdminRole.CAISSIERE:
      return new Set(["cashier"]);
    case AdminRole.ORDER_PREPARER:
      return new Set(["preparation"]);
    case AdminRole.STOCK_MANAGER:
      return new Set(["stock"]);
    default:
      return new Set([
        "dashboard",
        "orders",
        "billing",
        "cashier",
        "preparation",
        "stock",
        "products",
        "reports",
        "settings",
        "marketing",
        "sms-campaigns",
      ]);
  }
}

export function getDefaultOrderTabForRole(role) {
  switch (role) {
    case AdminRole.INVOICER:
    case AdminRole.BILLING_MANAGER:
      return "billing";
    case AdminRole.CAISSIERE:
    case AdminRole.COUNTER_MANAGER:
      return "payment";
    case AdminRole.ORDER_PREPARER:
    case AdminRole.STOCK_MANAGER:
      return "preparation";
    default:
      return "overview";
  }
}

export function getOrderTabsForRole(role, canAccessCancel, orderStatus) {
  switch (role) {
    case AdminRole.INVOICER:
    case AdminRole.BILLING_MANAGER:
      return [
        { key: "workflow", label: "Workflow" },
        { key: "billing", label: "Facturation" },
        { key: "history", label: "Historique" },
        ...(canAccessCancel && !["FULFILLED", "CANCELLED"].includes(orderStatus)
          ? [{ key: "cancel", label: "Annulation" }]
          : []),
      ];
    case AdminRole.CAISSIERE:
    case AdminRole.COUNTER_MANAGER:
      return [
        { key: "payment", label: "Paiement" },
        { key: "history", label: "Historique" },
      ];
    case AdminRole.ORDER_PREPARER:
    case AdminRole.STOCK_MANAGER:
      return [
        { key: "preparation", label: "Préparation" },
        { key: "fulfillment", label: "Clôture" },
        { key: "history", label: "Historique" },
      ];
    default:
      return [
        { key: "overview", label: "Aperçu" },
        { key: "workflow", label: "Workflow" },
        { key: "billing", label: "Facturation" },
        { key: "payment", label: "Paiement" },
        { key: "preparation", label: "Préparation" },
        { key: "fulfillment", label: "Clôture" },
        { key: "history", label: "Historique" },
        ...(canAccessCancel && !["FULFILLED", "CANCELLED"].includes(orderStatus)
          ? [{ key: "cancel", label: "Annulation" }]
          : []),
      ];
  }
}
