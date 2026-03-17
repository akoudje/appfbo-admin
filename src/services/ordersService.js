// admin-app/src/services/ordersService.js
// Service d'API pour les commandes, fournissant des méthodes pour récupérer les commandes, leurs détails, leurs messages, et pour effectuer des actions sur les commandes (ex: facturer, préparer, expédier). Ce service utilise une instance d'API préconfigurée pour faire des requêtes vers les endpoints correspondants de l'API backend.
// Service d'API pour les commandes + flux de paiement Wave

import api from "./api";

export const ordersService = {
  // lecture
  getAll: async (params) => (await api.get("/admin/orders", { params })).data,

  getById: async (id) => (await api.get(`/admin/orders/${id}`)).data,

  getMessages: async (id) =>
    (await api.get(`/admin/orders/${id}/messages`)).data,

  // workflow commande
  invoice: async (id, body) =>
    (await api.post(`/admin/orders/${id}/invoice`, body)).data,

  proof: async (id, body) =>
    (await api.post(`/admin/orders/${id}/proof`, body)).data,

  verifyPayment: async (id, body) =>
    (await api.post(`/admin/orders/${id}/verify-payment`, body)).data,

  pay: async (id, body) =>
    (await api.post(`/admin/orders/${id}/pay`, body)).data,

  prepare: async (id, body) =>
    (await api.post(`/admin/orders/${id}/prepare`, body)).data,

  fulfill: async (id, body) =>
    (await api.post(`/admin/orders/${id}/fulfill`, body)).data,

  cancel: async (id, body) =>
    (await api.post(`/admin/orders/${id}/cancel`, body)).data,

  // billing queue
  claimNextBilling: async () =>
    (await api.post("/admin/billing/claim-next")).data,

  startBilling: async (id) =>
    (await api.post(`/admin/billing/${id}/start`)).data,

  releaseBilling: async (id, body = {}) =>
    (await api.post(`/admin/billing/${id}/release`, body)).data,

  escalateBilling: async (id, body = {}) =>
    (await api.post(`/admin/billing/${id}/escalate`, body)).data,

  // wave payments
  initiateWavePayment: async (orderId, body = {}) =>
    (await api.post("/payments/wave/initiate", { orderId, ...body })).data,

  syncWavePaymentStatus: async (orderId) =>
    (await api.get(`/payments/wave/${orderId}/status`)).data,

  simulateWavePayment: async (orderId, scenario) =>
    (await api.post(`/payments/wave/${orderId}/simulate`, { scenario })).data,
};