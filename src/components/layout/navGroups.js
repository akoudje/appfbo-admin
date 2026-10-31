// admin-app/src/components/layout/navGroups.js
// Pages regroupées sous une seule entrée du menu latéral et reliées par des
// onglets en haut de page (PageTabs). Chaque onglet garde les droits de
// l'ancienne entrée de menu : il n'est affiché qu'aux rôles qui la voyaient.
import { Permission } from "../../auth/permissions";
import { SETTLEMENT_REPORT_ROLES } from "../../auth/workspaces";

export const NAV_GROUPS = {
  billing: [
    { key: "billing", to: "/billing", label: "File de facturation", permission: Permission.INVOICE_CREATE },
    {
      key: "billing",
      to: "/billing/payment-link-requests",
      label: "Renvois de lien",
      permission: Permission.INVOICE_CREATE,
      deniedRoles: ["FACTURIER_CAISSIER"],
    },
  ],
  settlements: [
    { key: "billing", to: "/billing/settlements", label: "Commandes réglées", permission: Permission.INVOICE_CREATE },
    {
      key: "reports",
      to: "/reports/settlements",
      label: "Rapport et montant dû",
      permission: Permission.EXPORT_READ,
      allowedRoles: SETTLEMENT_REPORT_ROLES,
    },
  ],
  cash: [
    { key: "cashier", to: "/cashier", label: "Caisse", permission: Permission.PAYMENT_VALIDATE },
    {
      key: "cash-closures",
      to: "/cash-closures",
      label: "Clôture caisse",
      permission: Permission.PAYMENT_VALIDATE,
      deniedRoles: ["FACTURIER_CAISSIER"],
    },
  ],
  preparation: [
    { key: "preparation", to: "/preparation", label: "File de préparation", permission: Permission.PREPARATION_UPDATE },
    { key: "preparation", to: "/preparation/shipments", label: "Expéditions", permission: Permission.PREPARATION_UPDATE },
    {
      key: "preparation",
      to: "/preparation/pickup-overdue",
      label: "Retraits en retard",
      permission: Permission.PREPARATION_UPDATE,
    },
    {
      key: "preparation",
      to: "/preparation/pickup-code-requests",
      label: "Codes retrait",
      permission: Permission.PREPARATION_UPDATE,
    },
  ],
};

export function findNavGroup(pathname) {
  return Object.values(NAV_GROUPS).find((tabs) => tabs.some((tab) => tab.to === pathname)) || null;
}
