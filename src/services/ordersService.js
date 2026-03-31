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
  /* ============================
     Lecture
  ============================ */

  getAll: async (params) =>
    (await api.get("/admin/orders", { params })).data,

  getById: async (id) =>
    (await api.get(`/admin/orders/${normalizeOrderId(id)}`)).data,

  getMessages: async (id) =>
    (await api.get(`/admin/orders/${normalizeOrderId(id)}/messages`)).data,

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

  replaceBillingItem: async (id, itemId, body) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/billing/items/${itemId}/replace`,
        body,
      )
    ).data,

  proof: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/proof`, body))
      .data,

  verifyPayment: async (id, body) =>
    (
      await api.post(
        `/admin/orders/${normalizeOrderId(id)}/verify-payment`,
        body
      )
    ).data,

  pay: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/pay`, body)).data,

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

  fulfill: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/fulfill`, body))
      .data,

  cancel: async (id, body) =>
    (await api.post(`/admin/orders/${normalizeOrderId(id)}/cancel`, body))
      .data,

  /* ============================
     Billing queue
  ============================ */

  claimNextBilling: async () =>
    (await api.post("/admin/billing/claim-next")).data,

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
