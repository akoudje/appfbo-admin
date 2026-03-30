import api from "./api";

export const settingsService = {
  getCountrySettings: async () =>
    (await api.get("/admin/country-settings")).data,

  updateCountrySettings: async (body) =>
    (await api.patch("/admin/country-settings", body)).data,
};
