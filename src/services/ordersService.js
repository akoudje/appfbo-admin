// admin-app/src/services/ordersService.js
import api from "./api";

export const ordersService = {
  getAll: async (params) => (await api.get("/admin/orders", { params })).data,
  getById: async (id) => (await api.get(`/admin/orders/${id}`)).data,

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
};