// Mapping des actions de log à des titres lisibles
// src/lib/orders/orderHistory.helpers.js

export function getOrderHistoryItem(log) {
  const meta = log?.meta || {};

  const base = {
    title: "Événement",
    tone: "gray",
    icon: "🧾",
    details: [],
  };

  switch (log?.action) {
    case "CREATE_DRAFT":
      return {
        ...base,
        title: "Brouillon créé",
        tone: "gray",
        icon: "📝",
        details: [],
      };

    case "SET_ITEMS":
      return {
        ...base,
        title: "Panier mis à jour",
        tone: "gray",
        icon: "🛒",
        details: meta.qty ? [`Quantité : ${meta.qty}`] : [],
      };

    case "REPRICE":
      return {
        ...base,
        title: "Totaux recalculés",
        tone: "blue",
        icon: "💰",
        details: [],
      };

    case "SUBMIT":
      return {
        ...base,
        title: "Commande soumise",
        tone: "blue",
        icon: "📨",
        details: [],
      };

    case "INVOICE":
      return {
        ...base,
        title: "Préfacture créée",
        tone: "blue",
        icon: "🧾",
        details: [
          meta.factureReference && `Référence facture : ${meta.factureReference}`,
          meta.paymentProvider && `Provider : ${meta.paymentProvider}`,
          meta.paymentFlow === "AUTO" && "Paiement automatique",
          meta.paymentFlow === "MANUAL" && "Paiement manuel",
        ].filter(Boolean),
      };

    case "RECEIVE_PAYMENT_PROOF":
      return {
        ...base,
        title: "Preuve de paiement reçue",
        tone: "blue",
        icon: "📎",
        details: [
          meta.paymentRef && `Référence paiement : ${meta.paymentRef}`,
        ].filter(Boolean),
      };

    case "VERIFY_PAYMENT":
      return {
        ...base,
        title: "Paiement confirmé",
        tone: "emerald",
        icon: "✅",
        details: [
          meta.paymentRef && `Référence paiement : ${meta.paymentRef}`,
          meta.paydunyaStatus && `Statut provider : ${meta.paydunyaStatus}`,
        ].filter(Boolean),
      };

    case "MARK_PAID":
      return {
        ...base,
        title: "Paiement enregistré",
        tone: "emerald",
        icon: "💵",
        details: [
          meta.paymentMode && `Mode : ${meta.paymentMode}`,
          meta.paymentFlow && `Flux : ${meta.paymentFlow}`,
        ].filter(Boolean),
      };

    case "PREPARE":
      return {
        ...base,
        title: "Commande préparée",
        tone: "amber",
        icon: "📦",
        details: [
          meta.stockDeducted === true ? "Stock décrémenté" : null,
        ].filter(Boolean),
      };

    case "STOCK_DEBIT":
      return {
        ...base,
        title: "Sortie de stock",
        tone: "amber",
        icon: "📤",
        details: [
          meta.qty && `Quantité : ${meta.qty}`,
        ].filter(Boolean),
      };

    case "STOCK_CREDIT":
      return {
        ...base,
        title: "Retour en stock",
        tone: "red",
        icon: "📥",
        details: [
          meta.qty && `Quantité : ${meta.qty}`,
        ].filter(Boolean),
      };

    case "FULFILL":
      return {
        ...base,
        title: "Commande clôturée",
        tone: "emerald",
        icon: "🏁",
        details: [
          meta.deliveryTracking && `Tracking : ${meta.deliveryTracking}`,
        ].filter(Boolean),
      };

    case "CANCEL":
      return {
        ...base,
        title: "Commande annulée",
        tone: "red",
        icon: "⛔",
        details: [
          meta.stockRollback === true ? "Stock réintégré" : null,
        ].filter(Boolean),
      };

    default:
      return {
        ...base,
        title: log?.action || "Événement",
        tone: "gray",
        icon: "ℹ️",
        details: [],
      };
  }
}
export function formatOrderLog(log) {
  switch (log.action) {
    case "INVOICE":
      return {
        title: "Préfacture créée",
        details: [
          log.meta?.factureReference && `Référence : ${log.meta.factureReference}`,
          log.meta?.paymentProvider && `Provider : ${log.meta.paymentProvider}`,
          log.meta?.paymentFlow && `Flux : ${log.meta.paymentFlow}`,
        ].filter(Boolean),
      };

    case "VERIFY_PAYMENT":
      return {
        title: "Paiement confirmé",
        details: [
          log.meta?.paymentRef && `Référence paiement : ${log.meta.paymentRef}`,
          log.meta?.paydunyaStatus && `Statut : ${log.meta.paydunyaStatus}`,
        ].filter(Boolean),
      };

    default:
      return {
        title: LOG_LABELS[log.action] || log.action,
        details: log.note ? [log.note] : [],
      };
  }
}