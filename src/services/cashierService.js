import api from "./api";

export const cashierService = {
  getWorkspace: async (params = {}) =>
    (await api.get("/admin/cashier/workspace", { params })).data,

  prepareForPacking: async (orderId, body = {}) =>
    (await api.post(`/admin/cashier/orders/${orderId}/prepare`, body)).data,
};
