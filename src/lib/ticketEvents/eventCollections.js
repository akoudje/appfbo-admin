export const EVENT_COLLECTIONS = [
  ["ACTIVE", "Actifs"],
  ["DRAFT", "Brouillons"],
  ["ARCHIVES", "Archives"],
];

export function eventLifecycleStatus(event, now = Date.now()) {
  if (!event) return null;
  if (event.status === "DRAFT" || event.status === "CANCELLED") return event.status;
  if (event.endsAt && Date.parse(event.endsAt) <= now) return "ENDED";
  if (event.status === "CLOSED") return "CLOSED";
  if (event.salesCloseAt && Date.parse(event.salesCloseAt) <= now) return "SALES_CLOSED";
  return event.status;
}

export function eventCollection(event, now = Date.now()) {
  const status = eventLifecycleStatus(event, now);
  if (status === "DRAFT") return "DRAFT";
  return status === "PUBLISHED" ? "ACTIVE" : "ARCHIVES";
}

export function normalizeEventCollection(value) {
  return EVENT_COLLECTIONS.some(([key]) => key === value) ? value : "ACTIVE";
}

export function filterManagementEvents(events, { collection = "ACTIVE", q = "" } = {}, now = Date.now()) {
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const selectedCollection = normalizeEventCollection(collection);
  const term = normalize(q.trim());
  return events.filter(event => eventCollection(event, now) === selectedCollection && normalize(event.title).includes(term))
    .sort((a, b) => selectedCollection === "ACTIVE" ? Date.parse(a.startsAt) - Date.parse(b.startsAt) : Date.parse(b.startsAt) - Date.parse(a.startsAt));
}

export function resolveEventSelection(events, { collection, eventId } = {}, now = Date.now()) {
  const requestedEvent = events.find(event => event.id === eventId);
  const selectedCollection = collection == null && requestedEvent
    ? eventCollection(requestedEvent, now) : normalizeEventCollection(collection);
  const candidates = filterManagementEvents(events, { collection: selectedCollection }, now);
  return {
    collection: selectedCollection,
    eventId: candidates.some(event => event.id === eventId) ? eventId : candidates[0]?.id || "",
  };
}
