import api from "./api";

function countryConfig(countryCode) {
  const code = String(countryCode || "").trim().toUpperCase();
  return code ? { headers: { "X-Country": code } } : undefined;
}

export const settingsService = {
  getCountrySettings: async (countryCode) =>
    (await api.get("/admin/country-settings", countryConfig(countryCode))).data,

  updateCountrySettings: async (body, countryCode) =>
    (await api.patch("/admin/country-settings", body, countryConfig(countryCode))).data,

  getCountriesList: async () =>
    (await api.get("/admin/countries")).data,

  toggleCountry: async (code, actif) =>
    (await api.patch(`/admin/countries/${code}`, { actif })).data,
};
