import api from "./api";

export const reportsService = {
  getDailySales: async (params = {}) =>
    (await api.get("/admin/reports/daily-sales", { params })).data,

  // params : { period: "day" | "month" | "year", date } — sans params, total depuis le début.
  getPackagingSummary: async (params = {}) =>
    (await api.get("/admin/reports/packaging-summary", { params })).data,

  exportPackagingSummary: async (params = {}) =>
    api.get("/admin/reports/packaging-summary/export", { params, responseType: "blob" }),

  // params : { period: "day" | "week" | "month" | "custom", date | dateFrom/dateTo,
  // source?, paymentMode?, invoicerId? }
  getCashSupervision: async (params = {}) =>
    (await api.get("/admin/reports/cash-supervision", { params })).data,

  exportCashSupervision: async (params = {}) =>
    api.get("/admin/reports/cash-supervision/export", { params, responseType: "blob" }),

  // Même période que getCashSupervision ; seul filtre : invoicerId.
  getCashRecovery: async (params = {}) =>
    (await api.get("/admin/reports/cash-supervision/recovery", { params })).data,

  // Pouls du jour : { lastPaidAt, signature } (rafraîchissement en direct).
  getCashSupervisionPulse: async () =>
    (await api.get("/admin/reports/cash-supervision/pulse")).data,

  // Même période que getCashSupervision.
  getCashClosuresOverview: async (params = {}) =>
    (await api.get("/admin/reports/cash-supervision/closures", { params })).data,
};
