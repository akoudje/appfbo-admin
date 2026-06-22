import api from "./api";

export const cashClosureService = {
  list: async (params = {}) =>
    (await api.get("/admin/cash-closures", { params })).data,

  getDraft: async (params = {}) =>
    (await api.get("/admin/cash-closures/draft", { params })).data,

  summary: async (params = {}) =>
    (await api.get("/admin/cash-closures/summary", { params })).data,

  update: async (closureId, body = {}) =>
    (await api.put(`/admin/cash-closures/${closureId}`, body)).data,

  submit: async (closureId) =>
    (await api.post(`/admin/cash-closures/${closureId}/submit`)).data,

  approve: async (closureId, body = {}) =>
    (await api.post(`/admin/cash-closures/${closureId}/approve`, body)).data,

  reject: async (closureId, body = {}) =>
    (await api.post(`/admin/cash-closures/${closureId}/reject`, body)).data,
};
