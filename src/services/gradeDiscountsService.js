// services/gradeDiscountsService.js

import api from "./api";

export const gradeDiscountsService = {
  getByCountryCode: async (countryCode) =>
    (
      await api.get("/admin/grade-discounts", {
        params: { countryCode },
      })
    ).data,

  saveByCountryCode: async (countryCode, items) =>
    (
      await api.put(
        "/admin/grade-discounts",
        { items },
        {
          params: { countryCode },
        }
      )
    ).data,
};