//statsService.js

import api from "./api";

export const statsService = {
  get: async (params) => {
    const res = await api.get("/admin/stats", { params });
    return res.data;
  },
};
