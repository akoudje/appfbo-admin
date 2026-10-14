import api from "./api";

export const cashierService = {
  getWorkspace: async (params = {}) =>
    (await api.get("/admin/cashier/workspace", { params })).data,

  getPaidToday: async (params = {}) =>
    (await api.get("/admin/cashier/paid-today", { params })).data,

  prepareForPacking: async (orderId, body = {}) =>
    (await api.post(`/admin/cashier/orders/${orderId}/prepare`, body)).data,

  reportAs400CertificationMissing: async (orderId, body = {}) =>
    (await api.post(`/admin/cashier/orders/${orderId}/as400-certification/missing`, body)).data,

  // Bilan emballages, avec les droits caisse (même format que reportsService).
  getPackagingSummary: async (params = {}) =>
    (await api.get("/admin/cashier/packaging-summary", { params })).data,

  exportPackagingSummary: async (params = {}) =>
    api.get("/admin/cashier/packaging-summary/export", { params, responseType: "blob" }),
};
