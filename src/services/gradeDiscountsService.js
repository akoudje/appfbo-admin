// services/gradeDiscountsService.js

import api from "./api";

export const gradeDiscountsService = {
  getByCountryCode: async () =>
    (
      await api.get("/admin/grade-discounts")
    ).data,

  saveByCountryCode: async (...args) => {
    const items = args.length > 1 ? args[1] : args[0];
    return (await api.put("/admin/grade-discounts", { items })).data;
  },
};
