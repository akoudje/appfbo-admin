import api from "./api";

export const ticketEventsService = {
  listEvents: async () => (await api.get("/admin/ticket-events")).data,

  getEvent: async (id) => (await api.get(`/admin/ticket-events/${id}`)).data,

  saveEvent: async (body) => (await api.post("/admin/ticket-events", body)).data,

  saveTicketType: async (eventId, body) =>
    (await api.post(`/admin/ticket-events/${eventId}/ticket-types`, body)).data,

  deleteTicketType: async (eventId, ticketTypeId) =>
    (await api.delete(`/admin/ticket-events/${eventId}/ticket-types/${ticketTypeId}`)).data,

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

  syncWavePayment: async (orderId) =>
    (await api.post(`/admin/ticket-events/orders/${orderId}/wave/sync`, {})).data,

  cancelOrder: async (orderId, body = {}) =>
    (await api.post(`/admin/ticket-events/orders/${orderId}/cancel`, body)).data,

  checkInTicket: async (body = {}) =>
    (await api.post("/admin/ticket-events/check-in", body)).data,

  openCheckInSession: async (body = {}) =>
    (await api.post("/admin/ticket-events/check-in/sessions", body)).data,

  closeCheckInSession: async (sessionId) =>
    (await api.post(`/admin/ticket-events/check-in/sessions/${sessionId}/close`, {})).data,

  listCheckInLogs: async (params = {}) =>
    (await api.get("/admin/ticket-events/check-in/logs", { params })).data,

  getCheckInSummary: async (params = {}) =>
    (await api.get("/admin/ticket-events/check-in/summary", { params })).data,
};
