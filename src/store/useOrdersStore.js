import { create } from "zustand";
import { ordersService } from "../services/ordersService";
import {
  DEFAULT_ORDER_FILTERS,
  orderRequestParams,
} from "../lib/orders/orderFilters";
import { ordersScopeKey } from "../hooks/orders/useOrdersScope";
export const useOrdersStore = create((set, get) => ({
  ...DEFAULT_ORDER_FILTERS,
  orders: [],
  stats: null,
  totalCount: 0,
  totalPages: 1,
  loading: false,
  error: "",
  loadedAt: null,
  _requestId: 0,
  _context: "",
  setFilter: (patch) => set({ ...patch, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  clearError: () => set({ error: "" }),
  resetFilters: () => set({ ...DEFAULT_ORDER_FILTERS }),
  fetchOrders: async (filters = get()) => {
    const selected = Object.fromEntries(
      Object.keys(DEFAULT_ORDER_FILTERS).map((key) => [
        key,
        filters[key] ?? DEFAULT_ORDER_FILTERS[key],
      ]),
    );
    const context = ordersScopeKey(),
      requestId = get()._requestId + 1;
    set({
      ...selected,
      _requestId: requestId,
      _context: context,
      loading: true,
      error: "",
      stats: null,
      ...(get()._context !== context
        ? { orders: [], totalCount: 0, totalPages: 1, loadedAt: null }
        : {}),
    });
    try {
      const result = await ordersService.getAll({
        ...orderRequestParams(selected),
        includeStats: true,
      });
      if (get()._requestId !== requestId || ordersScopeKey() !== context)
        return;
      set({
        orders: Array.isArray(result.data) ? result.data : [],
        stats: result.stats || null,
        totalCount: Number(result.totalCount) || 0,
        totalPages: Math.max(1, Number(result.totalPages) || 1),
        loadedAt: new Date().toISOString(),
        loading: false,
      });
    } catch (error) {
      if (get()._requestId !== requestId || ordersScopeKey() !== context)
        return;
      set({
        loading: false,
        orders: [],
        stats: null,
        totalCount: 0,
        totalPages: 1,
        error:
          error?.response?.data?.message ||
          "Impossible de charger les commandes. Réessayez.",
      });
    }
  },
}));
