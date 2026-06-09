import api from "./api";

export const ticketEventsService = {
  listEvents: async () => (await api.get("/admin/ticket-events")).data,

  getEvent: async (id) => (await api.get(`/admin/ticket-events/${id}`)).data,

  saveEvent: async (body) => (await api.post("/admin/ticket-events", body)).data,

  saveTicketType: async (eventId, body) =>
    (await api.post(`/admin/ticket-events/${eventId}/ticket-types`, body)).data,

  uploadPoster: async ({ file, slug }) => {
    const formData = new FormData();
    formData.append("file", file);
    if (slug) formData.append("slug", slug);
    return (await api.post("/admin/ticket-events/assets", formData)).data;
  },

  listOrders: async (params = {}) =>
    (await api.get("/admin/ticket-events/orders", { params })).data,

  expireOrders: async (body = {}) =>
    (await api.post("/admin/ticket-events/orders/expire", body)).data,

  markOrderPaid: async (orderId, body = {}) =>
    (await api.post(`/admin/ticket-events/orders/${orderId}/paid`, body)).data,

  cancelOrder: async (orderId, body = {}) =>
    (await api.post(`/admin/ticket-events/orders/${orderId}/cancel`, body)).data,

  checkInTicket: async (body = {}) =>
    (await api.post("/admin/ticket-events/check-in", body)).data,
};
