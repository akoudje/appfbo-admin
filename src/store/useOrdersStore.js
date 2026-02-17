import { create } from "zustand";
import { ordersService } from "../services/ordersService";

export const useOrdersStore = create((set, get) => ({

  loading: false,
  error: "",

  // data
  orders: [],
  page: 1,
  pageSize: 20,
  totalPages: 1,
  totalCount: 0,

  // filters
  status: "",
  q: "",
  dateFrom: "",
  dateTo: "",

  setFilter: (patch) => set((s) => ({ ...s, ...patch, page: 1 })),

  setPage: (page) => set({ page }),

/**
 * fetch with current state
 */
  fetchOrders: async () => {
    const {
      page, pageSize, status, q, dateFrom, dateTo,
    } = get();

    set({ loading: true, error: "" });

    try {
      const res = await ordersService.getAll({
        page,
        pageSize,
        status: status || undefined,
        q: q || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sort: "createdAt",
        dir: "desc",
      });

      set({
        orders: res.data,
        page: res.page,
        pageSize: res.pageSize,
        totalPages: res.totalPages,
        totalCount: res.totalCount,
        loading: false,
      });
    } catch (e) {
      set({
        loading: false,
        error: "Impossible de charger les commandes",
      });
    }
  },

}));
