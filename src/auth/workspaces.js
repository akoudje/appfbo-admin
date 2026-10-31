import { AdminRole } from "./permissions";

// Superviseurs de la facturation : supervision, attribution manuelle des
// dossiers, bilan de chaque facturier (même liste que l'API).
export const BILLING_SUPERVISOR_ROLES = [
  AdminRole.BILLING_MANAGER,
  AdminRole.SALES_DIRECTOR,
  AdminRole.SUPER_ADMIN,
  AdminRole.TECH_ADMIN,
];

// Rapport des commandes réglées par une autre filiale (ex. FLP Burkina) :
// même liste que l'API (settlement.controller.js).
export const SETTLEMENT_REPORT_ROLES = [
  AdminRole.BILLING_MANAGER,
  AdminRole.SUPER_ADMIN,
  AdminRole.TECH_ADMIN,
  AdminRole.FINANCE_MANAGER,
  AdminRole.SALES_DIRECTOR,
];

// Supervision caisse (point de caisse de tous les encaissements) : la
// responsable caisse, la finance et la direction.
export const CASH_SUPERVISION_ROLES = [
  AdminRole.COUNTER_MANAGER,
  AdminRole.FINANCE_MANAGER,
  AdminRole.OPERATIONS_DIRECTOR,
  AdminRole.SUPER_ADMIN,
  AdminRole.TECH_ADMIN,
];

const DASHBOARD_ROLES = new Set([
  AdminRole.SUPER_ADMIN,
  AdminRole.TECH_ADMIN,
  AdminRole.OPERATIONS_DIRECTOR,
  AdminRole.SALES_DIRECTOR,
  AdminRole.FINANCE_MANAGER,
]);

export function getDefaultWorkspaceRoute(role) {
  switch (role) {
    case AdminRole.INVOICER:
    case AdminRole.FACTURIER_CAISSIER:
    case AdminRole.BILLING_MANAGER:
      return "/billing";
    case AdminRole.CAISSIERE:
      return "/cashier";
    case AdminRole.COUNTER_MANAGER:
      return "/cash-supervision";
    case AdminRole.FINANCE_MANAGER:
      return "/reports/daily-sales";
    case AdminRole.ORDER_PREPARER:
      return "/preparation";
    case AdminRole.STOCK_MANAGER:
      return "/stock";
    case AdminRole.MARKETING_MANAGER:
    case AdminRole.MARKETING_ASSISTANT:
    case AdminRole.ADMIN_ASSISTANT:
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
      return new Set(["billing", "as400", "external-payment-links", "sponsorships"]);
    case AdminRole.BILLING_MANAGER:
      return new Set(["orders", "billing", "as400", "external-payment-links", "reports", "fbo-documents", "sponsorships"]);
    case AdminRole.COUNTER_MANAGER:
    case AdminRole.FINANCE_MANAGER:
      return new Set(["orders", "cashier", "external-payment-links", "cash-closures", "reports"]);
    case AdminRole.CAISSIERE:
      return new Set(["cashier", "external-payment-links", "cash-closures", "billing"]);
    // Facturation + caisse, sans Gateway AS400, demandes de lien de paiement
    // ni point et clôture de caisse (traités par les responsables).
    case AdminRole.FACTURIER_CAISSIER:
      return new Set(["billing", "external-payment-links", "sponsorships", "cashier"]);
    case AdminRole.ORDER_PREPARER:
      return new Set(["preparation"]);
    case AdminRole.STOCK_MANAGER:
      return new Set(["stock"]);
    case AdminRole.MARKETING_MANAGER:
      return new Set(["marketing", "sms-campaigns", "ticket-events", "products", "reports", "fbo-documents"]);
    case AdminRole.MARKETING_ASSISTANT:
      return new Set(["marketing", "sms-campaigns", "ticket-events", "reports"]);
    case AdminRole.ADMIN_ASSISTANT:
      return new Set(["marketing", "sms-campaigns", "ticket-events", "reports", "fbo-documents"]);
    default:
      return new Set([
        "dashboard",
        "orders",
        "billing",
        "as400",
        "cashier",
        "external-payment-links",
        "cash-closures",
        "preparation",
        "stock",
        "products",
        "reports",
        "fbo-documents",
        "sponsorships",
        "settings",
        "marketing",
        "sms-campaigns",
        "ticket-events",
      ]);
  }
}

export function getDefaultOrderTabForRole(role) {
  switch (role) {
    case AdminRole.INVOICER:
    case AdminRole.FACTURIER_CAISSIER:
    case AdminRole.BILLING_MANAGER:
      return "billing";
    case AdminRole.CAISSIERE:
    case AdminRole.COUNTER_MANAGER:
    case AdminRole.FINANCE_MANAGER:
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
        { key: "workflow", label: "Traitement" },
        { key: "billing", label: "Facturation" },
        { key: "history", label: "Historique" },
        ...(canAccessCancel && !["FULFILLED", "CANCELLED"].includes(orderStatus)
          ? [{ key: "cancel", label: "Annulation" }]
          : []),
      ];
    case AdminRole.CAISSIERE:
    case AdminRole.COUNTER_MANAGER:
    case AdminRole.FINANCE_MANAGER:
      return [
        { key: "payment", label: "Règlement" },
        { key: "history", label: "Historique" },
      ];
    case AdminRole.FACTURIER_CAISSIER:
      return [
        { key: "workflow", label: "Traitement" },
        { key: "billing", label: "Facturation" },
        { key: "payment", label: "Règlement" },
        { key: "history", label: "Historique" },
        ...(canAccessCancel && !["FULFILLED", "CANCELLED"].includes(orderStatus)
          ? [{ key: "cancel", label: "Annulation" }]
          : []),
      ];
    case AdminRole.ORDER_PREPARER:
    case AdminRole.STOCK_MANAGER:
      return [
        { key: "preparation", label: "Préparation" },
        { key: "fulfillment", label: "Remise" },
        { key: "history", label: "Historique" },
      ];
    default:
      return [
        { key: "overview", label: "Résumé" },
        { key: "workflow", label: "Traitement" },
        { key: "billing", label: "Facturation" },
        { key: "payment", label: "Règlement" },
        { key: "preparation", label: "Préparation" },
        { key: "fulfillment", label: "Remise" },
        { key: "history", label: "Historique" },
        ...(canAccessCancel && !["FULFILLED", "CANCELLED"].includes(orderStatus)
          ? [{ key: "cancel", label: "Annulation" }]
          : []),
      ];
  }
}

// Permission derrière chaque onglet "métier" de la fiche commande. Utilisé
// pour réintégrer un onglet absent de la liste par défaut du rôle quand
// l'utilisateur a reçu ce droit spécifiquement (permissionAllow, page
// Utilisateurs) — même principe que getWorkspaceNavKeys/Sidebar.filterItems,
// appliqué ici aux onglets de la fiche commande (cf. bug CAISSIERE/Facturation
// : droit INVOICE_CREATE accordé mais onglet "Facturation" absent de la liste
// de son rôle).
const ORDER_TABS_BY_PERMISSION = [
  { key: "billing", label: "Facturation", permission: "INVOICE_CREATE" },
  { key: "payment", label: "Règlement", permission: "PAYMENT_VALIDATE" },
  { key: "preparation", label: "Préparation", permission: "PREPARATION_UPDATE" },
  { key: "fulfillment", label: "Remise", permission: "PREPARATION_UPDATE" },
  { key: "cancel", label: "Annulation", permission: "PREORDER_UPDATE_STATUS" },
];

export function getExtraOrderTabsFromOverride(permissionAllow = []) {
  const allow = new Set(Array.isArray(permissionAllow) ? permissionAllow : []);
  return ORDER_TABS_BY_PERMISSION.filter((tab) => allow.has(tab.permission));
}
