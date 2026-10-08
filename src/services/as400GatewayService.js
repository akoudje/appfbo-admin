import api from "./api";

export const as400GatewayService = {
  getConfig: async () =>
    (await api.get("/admin/as400/config")).data,

  updateConfig: async (body = {}) =>
    (await api.put("/admin/as400/config", body)).data,

  listRequests: async (params = {}, config = {}) =>
    (await api.get("/admin/as400/requests", { ...config, params })).data,

  getRequest: async (id) =>
    (await api.get(`/admin/as400/requests/${id}`)).data,

  enqueueRequest: async (body = {}) =>
    (await api.post("/admin/as400/requests", body)).data,

  markWaitingHuman: async (id, body = {}) =>
    (await api.post(`/admin/as400/requests/${id}/waiting-human`, body)).data,

  cancelRequest: async (id, body = {}) =>
    (await api.post(`/admin/as400/requests/${id}/cancel`, body)).data,
};
