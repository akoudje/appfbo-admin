// admin-app/src/services/ordersService.js
// Service d'API pour les commandes, fournissant des méthodes pour récupérer les commandes, leurs détails, leurs messages, et pour effectuer des actions sur les commandes (ex: facturer, préparer, expédier). Ce service utilise une instance d'API préconfigurée pour faire des requêtes vers les endpoints correspondants de l'API backend.
// Service d'API pour les commandes + flux de paiement Wave

// admin-app/src/services/ordersService.js
// Service API commandes + paiement Wave (version PATCHÉE et sécurisée)

import api from "./api";

/* =========================================================
   Helpers
========================================================= */

/**
 * Permet d'accepter soit un id string, soit un objet order
 * ex:
 *   "abc123"
 *   { id: "abc123" }
 */
function normalizeOrderId(idOrOrder) {
  if (!idOrOrder) return null;
  if (typeof idOrOrder === "string") return idOrOrder;
  if (typeof idOrOrder === "object" && idOrOrder.id) return idOrOrder.id;
  return null;
}

/* =========================================================
   Service
========================================================= */

export const ordersService = {
  getShipments: async params => (await api.get('/admin/orders/shipments', { params })).data,
  uploadShippingReceipt: async (id, file) => { const body = new FormData(); body.append('file', file); return (await api.post(`/admin/orders/${normalizeOrderId(id)}/shipping-receipt`, body)).data; },
  downloadShippingReceipt: async id => api.get(`/admin/orders/${normalizeOrderId(id)}/shipping-receipt`, { responseType: 'blob' }),
  /* ============================
     Lecture
  ============================ */

  getAll: async (params) =>
    (await api.get("/admin/orders", { params })).data,

  getSubmittedExport: async (params = {}) =>
    (await api.get("/admin/orders/submitted-export", { params })).data,

  // Réservation des dossiers libres de la file avant impression (facturier) :
  // mêmes filtres que l'export. Réponse { claimedCount, activeCount, maxActive }.
  claimSubmittedForPrint: async (params = {}) =>
    (await api.post("/admin/orders/submitted-export/claim", null, { params })).data,

  getOverduePickups: async () =>
    (await api.get("/admin/orders/pickup-overdue")).data,

  getById: async (id, config = {}) =>
    (await api.get(`/admin/orders/${normalizeOrderId(id)}`, config)).data,

  getMessages: async (id, config = {}) =>
    (await api.get(`/admin/orders/${normalizeOrderId(id)}/messages`, config)).data,

  exportView: async (params) => api.get("/admin/orders/export", { params, responseType: "blob" }),

  downloadBankProofFile: async (id, proofId) =>
    await api.get(
      `/admin/orders/${normalizeOrderId(id)}/bank-proofs/${proofId}/file`,
      { responseType: "blob" },
    ),

  downloadLegacyManualProofFile: async (id) =>
    await api.get(`/admin/orders/${normalizeOrderId(id)}/manual-proof/file`, {
      responseType: "blob",
    }),

  getInvoicePreview: async (id, params = {}) =>
    (
      await api.get(`/admin/orders/${normalizeOrderId(id)}/invoice-preview`, {
        params,
      })
    ).data,

  downloadDeliveryNotePdf: async (id) =>
    await api.get(`/admin/orders/${normalizeOrderId(id)}/delivery-note.pdf`, {
      responseType: "blob",
    }),

  /* ============================
     Workflow commande
  ============================ */

  invoice: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/invoice`, body))
      .data,

  enqueueAs400Request: async (id, body = {}) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/as400-requests`,
        body,
      )
    ).data,

  correctAs400Invoice: async (id, body) =>
    (
      await api.patch(
        `/admin/orders/${normalizeOrderId(id)}/as400-invoice`,
        body,
      )
    ).data,

  relaunchPayment: async (id, body = {}) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/relaunch-payment`,
        body,
      )
    ).data,

  replaceBillingItem: async (id, itemId, body) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/billing/items/${itemId}/replace`,
        body,
      )
    ).data,

  resendInvoiceSms: async (id, body = {}) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/resend-invoice-sms`, body))
      .data,

  updateNotificationContacts: async (id, body = {}) =>
    (
      await api.patch(
        `/admin/orders/${normalizeOrderId(id)}/notification-contacts`,
        body,
      )
    ).data,

  switchPaymentToManual: async (id) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/switch-payment-to-manual`,
      )
    ).data,

  switchPaymentToWave: async (id, body = {}) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/switch-payment-to-wave`,
        body,
      )
    ).data,

  switchPaymentToBankTransfer: async (id) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/switch-payment-to-bank-transfer`,
      )
    ).data,

  resendConfirmationSms: async (id, body = {}) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/resend-confirmation-sms`,
        body,
      )
    ).data,

  proof: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/proof`, body))
      .data,

  uploadBankProof: async (id, { file, reference, declaredAmountFcfa, note } = {}) => {
    const formData = new FormData();
    if (file) formData.append("file", file);
    if (reference) formData.append("reference", reference);
    if (declaredAmountFcfa) formData.append("declaredAmountFcfa", declaredAmountFcfa);
    if (note) formData.append("note", note);

    return (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/bank-proof/upload`,
        formData,
      )
    ).data;
  },

  verifyPayment: async (id, body) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/verify-payment`,
        body
      )
    ).data,

  pay: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/pay`, body)).data,

  shippingQuote: async (id, body) => (await api.post(`/admin/orders/${normalizeOrderId(id)}/shipping-quote`, body)).data,
  syncShippingPayment: async (id) => (await api.post(`/admin/orders/${normalizeOrderId(id)}/shipping-payment/sync`)).data,
  notifyShippingPayment: async (id) => (await api.post(`/admin/orders/${normalizeOrderId(id)}/shipping-payment/notify`)).data,

  prepare: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/prepare`, body))
      .data,

  updatePreparationChecklistItem: async (id, body) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/preparation/checklist`,
        body,
      )
    ).data,

  bulkUpdatePreparationChecklist: async (id, body) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/preparation/checklist/bulk`,
        body,
      )
    ).data,

  createPreparationAnomaly: async (id, body) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/preparation/anomalies`,
        body,
      )
    ).data,

  resolvePreparationAnomaly: async (id, anomalyId, body = {}) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/preparation/anomalies/${anomalyId}/resolve`,
        body,
      )
    ).data,

  createBackorderCredit: async (id, body) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/preparation/backorder-credits`,
        body,
      )
    ).data,

  cancelBackorderCredit: async (id, creditId, body = {}) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/preparation/backorder-credits/${creditId}/cancel`,
        body,
      )
    ).data,

  listBackorderCredits: async (params = {}) =>
    (await api.get(`/admin/backorder-credits`, { params })).data,

  prepareBackorderCredit: async (creditId) =>
    (await api.post(`/admin/backorder-credits/${creditId}/prepare`)).data,

  fulfillBackorderCredit: async (creditId, body) =>
    (await api.post(`/admin/backorder-credits/${creditId}/fulfill`, body))
      .data,

  fulfill: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/fulfill`, body))
      .data,

  fulfillNoNotification: async (id, body = {}) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/fulfill-no-notification`,
        body,
      )
    ).data,

  cancel: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/cancel`, body))
      .data,

  reactivate: async (id) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/reactivate`)).data,

  applyPickupPenalty: async (id, body = {}) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/pickup-penalty`,
        body,
      )
    ).data,

  /* ============================
     Billing queue
  ============================ */

  claimNextBilling: async () =>
    (await api.post("/admin/billing/claim-next")).data,

  // Superviseurs : facturiers du pays { invoicers: [{ id, fullName, role,
  // connected, autoDispatch, load, maxActive }] } et attribution manuelle.
  listBillingInvoicers: async () =>
    (await api.get("/admin/billing/invoicers")).data,

  // Bilan d'activité { from, to, invoicerId? } (invoicerId : superviseurs).
  getBillingReport: async (params = {}) =>
    (await api.get("/admin/billing/report", { params })).data,

  // Supervision { from, to } : file, totaux et une ligne par facturier.
  getBillingSupervision: async (params = {}) =>
    (await api.get("/admin/billing/supervision", { params })).data,

  assignBilling: async (id, invoicerId) =>
    (await api.post(`/admin/billing/${normalizeOrderId(id)}/assign`, { invoicerId })).data,

  startBilling: async (id) =>
    (await api.post(`/admin/billing/${normalizeOrderId(id)}/start`)).data,

  releaseBilling: async (id, body = {}) =>
    (
      await api.post(
        `/admin/billing/${normalizeOrderId(id)}/release`,
        body
      )
    ).data,

  escalateBilling: async (id, body = {}) =>
    (
      await api.post(
        `/admin/billing/${normalizeOrderId(id)}/escalate`,
        body
      )
    ).data,

  resolveAs400CertificationDispute: async (id, body = {}) =>
    (
      await api.post(
        `/admin/billing/${normalizeOrderId(id)}/as400-certification/resolve`,
        body,
      )
    ).data,

  resolveBillingEscalation: async (id, body = {}) =>
    (
      await api.post(
        `/admin/billing/${normalizeOrderId(id)}/escalate/resolve`,
        body,
      )
    ).data,

  /* ============================
     Wave payments
  ============================ */

  /**
   * Initier ou réinitier un paiement Wave
   * ⚠️ NOTE:
   * - NE PAS appeler après invoice()
   *   car invoice backend initie déjà Wave
   */
  initiateWavePayment: async (orderId, body = {}) => {
    const id = normalizeOrderId(orderId);
    return (
      await api.post("/payments/wave/initiate", {
        orderId: id,
        ...body,
      })
    ).data;
  },

  /**
   * Synchroniser le statut Wave avec le provider
   */
  syncWavePaymentStatus: async (orderId) => {
    const id = normalizeOrderId(orderId);
    return (await api.get(`/payments/wave/${id}/status`)).data;
  },

  getPaymentTransactions: async (orderId, params = {}) => {
    const id = normalizeOrderId(orderId);
    return (await api.get(`/payments/wave/${id}/transactions`, { params })).data;
  },

  /**
   * Simulation dev/test (Wave mock)
   */
  simulateWavePayment: async (orderId, scenario) => {
    const id = normalizeOrderId(orderId);
    return (
      await api.post(`/payments/wave/${id}/simulate`, {
        scenario,
      })
    ).data;
  },
};
