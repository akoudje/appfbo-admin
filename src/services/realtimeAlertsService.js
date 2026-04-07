import api from "./api";

export async function ackRealtimeAlertPlayback(payload = {}) {
  const body = {
    eventKey: payload.eventKey || null,
    orderId: payload.orderId || null,
    workspace: payload.workspace || null,
    played: payload.played !== false,
    reason: payload.reason || null,
  };

  return (await api.post("/admin/events/ack", body)).data;
}

export async function getRealtimeEventsHealth() {
  return (await api.get("/admin/events/health")).data;
}

