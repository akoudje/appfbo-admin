import api from "./api";

// Parrainages à vérifier (droit SPONSORSHIP_REVIEW).
export const sponsorshipsService = {
  list: async (params = {}) => (await api.get("/admin/sponsorships", { params })).data,

  get: async (id) => (await api.get(`/admin/sponsorships/${id}`)).data,

  downloadDocument: async (id, documentId) =>
    api.get(`/admin/sponsorships/${id}/documents/${documentId}/file`, { responseType: "blob" }),

  requestChanges: async (id, note) => (await api.post(`/admin/sponsorships/${id}/request-changes`, { note })).data,

  reject: async (id, reason) => (await api.post(`/admin/sponsorships/${id}/reject`, { reason })).data,

  approve: async (id, recruitFboNumero) =>
    (await api.post(`/admin/sponsorships/${id}/approve`, { recruitFboNumero })).data,

  evaluate: async (id) => (await api.post(`/admin/sponsorships/${id}/evaluate`)).data,

  agreementPdf: async (id) => api.get(`/admin/sponsorships/${id}/agreement.pdf`, { responseType: "blob" }),

  // Fiche + pièce d'identité (impression / traitement), à tout statut.
  dossierPdf: async (id) => api.get(`/admin/sponsorships/${id}/dossier.pdf`, { responseType: "blob", timeout: 120000 }),

  catalog: async (id) => (await api.get(`/admin/sponsorships/${id}/catalog`)).data,

  // { items?, paymentMode, deliveryMode, factureReference, invoiceAmountFcfa, note? }
  counterPurchase: async (id, body) => (await api.post(`/admin/sponsorships/${id}/counter-purchase`, body)).data,
};
