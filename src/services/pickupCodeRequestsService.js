import api from "./api";

export const pickupCodeRequestsService = {
  list: async (params = {}) =>
    (await api.get("/admin/pickup-code-resend-requests", { params })).data,

  update: async (id, body = {}) =>
    (await api.patch(`/admin/pickup-code-resend-requests/${id}`, body)).data,

  resendPickupCode: async (preorderId, body = {}) =>
    (await api.post(`/admin/orders/${preorderId}/resend-confirmation-sms`, body)).data,
};
