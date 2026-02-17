import api from "./api";

export const ordersService = {
  getAll: async (params) => {
    const res = await api.get("/admin/orders", { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/admin/orders/${id}`);
    return res.data;
  },

  invoice: async (id) => {
    const res = await api.post(`/admin/orders/${id}/invoice`);
    return res.data;
  },

  pay: async (id) => {
    const res = await api.post(`/admin/orders/${id}/pay`);
    return res.data;
  },
};


