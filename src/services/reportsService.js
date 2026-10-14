import api from "./api";

export const reportsService = {
  getDailySales: async (params = {}) =>
    (await api.get("/admin/reports/daily-sales", { params })).data,

  getPackagingSummary: async () =>
    (await api.get("/admin/reports/packaging-summary")).data,
};
