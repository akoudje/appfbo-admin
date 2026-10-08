export const ORDER_STATUSES = {
  DRAFT: { label: "Brouillon", cls: "bg-gray-100 text-gray-700" },
  SUBMITTED: { label: "Soumise", cls: "bg-blue-100 text-blue-800" },
  INVOICED: { label: "Préfacturée", cls: "bg-violet-100 text-violet-800" },
  PAYMENT_PENDING: {
    label: "Paiement en attente",
    cls: "bg-amber-100 text-amber-800",
  },
  PAYMENT_PROOF_RECEIVED: {
    label: "Preuve reçue",
    cls: "bg-amber-100 text-amber-800",
  },
  PAID: { label: "Payée", cls: "bg-emerald-100 text-emerald-800" },
  READY: { label: "Colis prêt", cls: "bg-teal-100 text-teal-800" },
  FULFILLED: { label: "Remise effectuée", cls: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Annulée", cls: "bg-red-100 text-red-800" },
};
const LABELS = {
  LOW: "Faible",
  NORMAL: "Normale",
  HIGH: "Haute",
  URGENT: "Urgente",
  NONE: "Non démarrée",
  QUEUED: "En file",
  ASSIGNED: "Assignée",
  IN_PROGRESS: "En cours",
  WAITING_CUSTOMER_DATA: "Informations client attendues",
  WAITING_PAYMENT: "Paiement attendu",
  ESCALATED: "À revoir",
  RELEASED: "À réassigner",
  COMPLETED: "Terminée",
  DONE: "Terminée",
  ESPECES: "Espèces",
  CASH: "Espèces",
  MOBILE_MONEY: "Mobile money",
  WAVE: "Wave",
  BANK_TRANSFER: "Virement bancaire",
  ECOBANK_PAY: "Ecobank Pay",
  PI_SPI: "PI-SPI",
  RETRAIT_SITE_FLP: "Retrait en agence",
  LIVRAISON: "Livraison",
  PICKUP: "Retrait",
  DELIVERY: "Livraison",
  MANUAL: "Paiement manuel",
  ORANGE_MONEY: "Orange Money",
  MTN_MOMO: "MTN MoMo",
  MOOV_MONEY: "Moov Money",
  UNPAID: "Non payé",
  PARTIALLY_PAID: "Partiellement payé",
  REFUNDED: "Remboursé",
  FAILED: "Échec du paiement",
};
export function orderLabel(value) {
  if (!value) return "—";
  return (
    ORDER_STATUSES[value]?.label ||
    LABELS[value] ||
    String(value)
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (letter) => letter.toUpperCase())
  );
}
export function numericAmount(value) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}
export function orderAmounts(order) {
  const confirmed = numericAmount(order?.as400InvoiceTotalFcfa);
  const expected = numericAmount(order?.activePayment?.amountExpectedFcfa);
  const indicative =
    numericAmount(order?.indicativeTotalFcfa) ??
    numericAmount(order?.totalFcfa);
  return {
    confirmed,
    expected,
    indicative,
    display: expected ?? confirmed ?? indicative,
    label:
      expected !== null
        ? "À payer / règlement"
        : confirmed !== null
          ? "Confirmé AS400"
          : "Indicatif",
  };
}
export function orderNextAction(order, access = {}) {
  if (!order) return null;
  if (order.billingWorkStatus === "ESCALATED")
    return {
      label: "Revoir le dossier",
      tab: access.billing ? "billing" : "history",
      tone: "warning",
    };
  if (order.status === "SUBMITTED" && access.billing)
    return { label: "Préparer la facture", tab: "billing" };
  if (
    ["INVOICED", "PAYMENT_PENDING", "PAYMENT_PROOF_RECEIVED"].includes(
      order.status,
    )
  ) {
    if (access.payment)
      return { label: "Vérifier le paiement", tab: "payment" };
    if (access.billing) return { label: "Suivre le règlement", tab: "billing" };
  }
  if (order.status === "PAID") {
    if (!order.preparationLaunchedAt && access.payment)
      return { label: "Lancer en caisse", route: "/cashier" };
    if (order.preparationLaunchedAt && access.preparation)
      return { label: "Préparer le colis", tab: "preparation" };
  }
  if (order.status === "READY" && access.preparation)
    return { label: "Confirmer la remise", tab: "fulfillment" };
  const tab = ["FULFILLED", "CANCELLED"].includes(order.status)
    ? "history"
    : access.overview !== false
      ? "overview"
      : access.billing
        ? "billing"
        : access.payment
          ? "payment"
          : access.preparation
            ? "preparation"
            : "history";
  return { label: "Consulter", tab };
}
