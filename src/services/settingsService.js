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

  // Clôtures du mois commercial (une par mois, heure du pays).
  getCommercialMonths: async (countryCode) =>
    (await api.get("/admin/country-settings/commercial-months", countryConfig(countryCode))).data,

  saveCommercialMonth: async (month, body, countryCode) =>
    (await api.put("/admin/country-settings/commercial-months/" + month, body, countryConfig(countryCode))).data,

  deleteCommercialMonth: async (month, countryCode) =>
    (await api.delete("/admin/country-settings/commercial-months/" + month, countryConfig(countryCode))).data,

  // Exception en cours : mode "OPEN" ou "CLOSED" jusqu'à until "HH:MM"
  // (heure du pays, 24:00 = minuit), ou null pour revenir à l'horaire.
  setSubmissionOverride: async (mode, until, countryCode) =>
    (await api.post("/admin/country-settings/submission-override", { mode, until }, countryConfig(countryCode))).data,

  getHistory: async (countryCode) => (await api.get("/admin/country-settings/history", countryConfig(countryCode))).data,

  getCountriesList: async () =>
    (await api.get("/admin/countries")).data,

  toggleCountry: async (code, actif) =>
    (await api.patch(`/admin/countries/${code}`, { actif })).data,
};
