// Mapping des actions de log à des titres lisibles

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