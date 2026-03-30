import api from "./api";

export const marketingCampaignsService = {
  get: async () => (await api.get("/admin/marketing-campaigns")).data,

  save: async (body) => (await api.put("/admin/marketing-campaigns", body)).data,
};
