// useProductsStore.js
// This store manages the list of products, with filters and pagination

import api from "./api";

export const productsService = {
  getAll: async () => {
    const res = await api.get("/admin/products");

    return res.data;
  },
};
