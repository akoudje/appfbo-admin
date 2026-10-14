import api from "./api";

export const reportsService = {
  getDailySales: async (params = {}) =>
    (await api.get("/admin/reports/daily-sales", { params })).data,

  // params : { period: "day" | "month" | "year", date } — sans params, total depuis le début.
  getPackagingSummary: async (params = {}) =>
    (await api.get("/admin/reports/packaging-summary", { params })).data,

  exportPackagingSummary: async (params = {}) =>
    api.get("/admin/reports/packaging-summary/export", { params, responseType: "blob" }),
};
