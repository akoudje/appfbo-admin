// admin-app/src/services/usersService.js

import api from "./api";

export const usersService = {
  getAll: async (params) => (await api.get("/admin/users", { params })).data,

  getById: async (id) => (await api.get(`/admin/users/${id}`)).data,

  create: async (body) => (await api.post("/admin/users", body)).data,

  update: async (id, body) => (await api.put(`/admin/users/${id}`, body)).data,

  updateStatus: async (id, actif) =>
    (await api.patch(`/admin/users/${id}/status`, { actif })).data,
};