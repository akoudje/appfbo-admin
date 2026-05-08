import api from "./api";

export const marketingCampaignsService = {
  get: async () => (await api.get("/admin/marketing-campaigns")).data,

  save: async (body) => (await api.put("/admin/marketing-campaigns", body)).data,

  publish: async (body) => (await api.post("/admin/marketing-campaigns/publish", body)).data,

  sendSmsTest: async (campaignId, body) =>
    (await api.post(`/admin/marketing-campaigns/sms/${campaignId}/send-test`, body)).data,

  sendSmsCampaign: async (campaignId, body = {}) =>
    (await api.post(`/admin/marketing-campaigns/sms/${campaignId}/send`, body)).data,

  uploadAsset: async ({ file, slot }) => {
    const formData = new FormData();
    formData.append("file", file);
    if (slot) formData.append("slot", slot);

    return (await api.post("/admin/marketing-campaigns/assets", formData)).data;
  },
};
