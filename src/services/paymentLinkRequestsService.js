import api from "./api";

export const paymentLinkRequestsService = {
  list: async (params = {}) =>
    (await api.get("/admin/payment-link-resend-requests", { params })).data,

  update: async (id, body = {}) =>
    (await api.patch(`/admin/payment-link-resend-requests/${id}`, body)).data,
};
