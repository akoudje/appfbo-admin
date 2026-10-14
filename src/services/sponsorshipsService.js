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
};
