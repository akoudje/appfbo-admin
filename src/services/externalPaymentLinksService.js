import api from "./api";

export const externalPaymentLinksService = {
  list: async (params = {}) =>
    (await api.get("/admin/external-payment-links", { params })).data,

  create: async (body) =>
    (await api.post("/admin/external-payment-links", body)).data,

  updateStatus: async (id, status) =>
    (await api.patch(`/admin/external-payment-links/${id}/status`, { status })).data,
};
