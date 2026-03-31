import api from "./api";

export const stockService = {
  getDashboard: async (params = {}) =>
    (await api.get("/admin/stock/dashboard", { params })).data,

  listMovements: async (params = {}) =>
    (await api.get("/admin/stock/movements", { params })).data,

  adjustStock: async (body) =>
    (await api.post("/admin/stock/adjust", body)).data,
};
