import api from "./api";

export const externalPaymentLinksService = {
  list: async (params = {}) =>
    (await api.get("/admin/external-payment-links", { params })).data,

  getQrConfig: async () =>
    (await api.get("/admin/external-payment-links/qr-config")).data,

  listCreators: async () =>
    (await api.get("/admin/external-payment-links/creators")).data,

  create: async (body) =>
    (await api.post("/admin/external-payment-links", body)).data,

  resendSms: async (id, body = {}) =>
    (await api.post(`/admin/external-payment-links/${id}/resend-sms`, body)).data,

  syncWave: async (id) =>
    (await api.post(`/admin/external-payment-links/${id}/sync-wave`, {})).data,

  attachToOrder: async (id, body = {}) =>
    (await api.post(`/admin/external-payment-links/${id}/attach-order`, body)).data,

  updateStatus: async (id, status) =>
    (await api.patch(`/admin/external-payment-links/${id}/status`, { status })).data,
};
