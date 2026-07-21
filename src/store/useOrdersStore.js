// admin-app/src/store/useOrdersStore.js
// Ce store gère la liste des commandes, les filtres et la pagination. Il utilise le service ordersService pour récupérer les données depuis l'API.

// admin-app/src/store/useOrdersStore.js
import { create } from "zustand";
import { ordersService } from "../services/ordersService";

export const useOrdersStore = create((set, get) => ({
  loading: false,
  error: "",

  // guards against out-of-order responses when requests overlap
  _requestId: 0,

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
  paymentStatus: "",
  billingWorkStatus: "",
  priority: "",
  as400Reference: "",
  as400Amount: "",
  lateWaveReview: false,
  assignedOnly: false,
  assignedToMe: false,
  invoicerId: "",
  sort: "createdAt",
  dir: "desc",

  setFilter: (patch) => set((state) => ({ ...state, ...patch, page: 1 })),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),

  clearError: () => set({ error: "" }),

  resetFilters: () =>
    set({
      page: 1,
      status: "",
      q: "",
      dateFrom: "",
      dateTo: "",
      paymentStatus: "",
      billingWorkStatus: "",
      priority: "",
      as400Reference: "",
      as400Amount: "",
      lateWaveReview: false,
      assignedOnly: false,
      assignedToMe: false,
      invoicerId: "",
      sort: "createdAt",
      dir: "desc",
    }),

  fetchOrders: async () => {
    const {
      page,
      pageSize,
      status,
      q,
      dateFrom,
      dateTo,
      paymentStatus,
      billingWorkStatus,
      priority,
      as400Reference,
      as400Amount,
      lateWaveReview,
      assignedOnly,
      assignedToMe,
      invoicerId,
      sort,
      dir,
    } = get();

    const requestId = get()._requestId + 1;
    set({ _requestId: requestId, loading: true, error: "" });

    try {
      const res = await ordersService.getAll({
        page,
        pageSize,
        status: status || undefined,
        q: q || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        paymentStatus: paymentStatus || undefined,
        billingWorkStatus: billingWorkStatus || undefined,
        priority: priority || undefined,
        as400Reference: as400Reference || undefined,
        as400Amount: as400Amount || undefined,
        lateWaveReview: lateWaveReview || undefined,
        assignedOnly: assignedOnly || undefined,
        assignedToMe: assignedToMe || undefined,
        invoicerId: invoicerId || undefined,
        sort: sort || "createdAt",
        dir: dir || "desc",
      });

      if (get()._requestId !== requestId) return; // stale response, a newer request superseded it

      set({
        orders: Array.isArray(res.data) ? res.data : [],
        page: Number(res.page) || 1,
        pageSize: Number(res.pageSize) || pageSize,
        totalPages: Number(res.totalPages) || 1,
        totalCount: Number(res.totalCount) || 0,
        loading: false,
      });
    } catch (error) {
      if (get()._requestId !== requestId) return;
      console.error("useOrdersStore.fetchOrders error:", error);
      set({
        loading: false,
        error: "Impossible de charger les commandes",
      });
    }
  },
}));
