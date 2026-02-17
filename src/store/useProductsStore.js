import api from "./api";

export const ordersService = {
  getAll: async () => {
    const res = await api.get("/admin/orders");

    return res.data;
  },
};
