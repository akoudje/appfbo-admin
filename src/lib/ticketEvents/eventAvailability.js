const SOURCES = new Set([
  "EVENT",
  "TICKET_TYPES",
  "EVENT_AND_TICKET_TYPES",
  "UNLIMITED",
  "NO_ACTIVE_TICKETS",
]);
const places = (value) => Number.isSafeInteger(value) && value >= 0;

export function readEventAvailability(value) {
  if (!value || !SOURCES.has(value.source)) return null;
  if (value.source === "UNLIMITED")
    return value.remaining === null ? value : null;
  return places(value.remaining) ? value : null;
}

// Legacy summaries contain sold/used/reserved ticket counts, but not holds by category.
export function legacyEventAvailability(event, totals) {
  if (!Array.isArray(event?.ticketTypes) || !totals) return null;
  const types = event.ticketTypes.filter((type) => type.active !== false);
  if (!types.length) return { remaining: 0, source: "NO_ACTIVE_TICKETS" };
  if (!types.every((type) => type.capacity === null || places(type.capacity)))
    return null;
  const globalRemaining =
    event.capacity == null ? null : totals.remainingCapacity;
  if (globalRemaining !== null && !places(globalRemaining)) return null;
  const unlimited = types.some((type) => type.capacity === null);
  if (unlimited)
    return {
      remaining: globalRemaining,
      source: globalRemaining === null ? "UNLIMITED" : "EVENT",
    };
  let sum;
  if (event.ticketTypes.length === 1) {
    const counts = [
      totals.activeTickets,
      totals.usedTickets,
      totals.reservedTickets,
    ];
    if (!counts.every(places)) return null;
    sum = Math.max(
      0,
      types[0].capacity - counts.reduce((total, count) => total + count, 0),
    );
  } else {
    // Per-category holds require the new summary; never spread them arbitrarily.
    if (
      totals.reservedTickets !== 0 ||
      !types.every((type) => places(type._count?.tickets))
    )
      return null;
    sum = types.reduce(
      (total, type) => total + Math.max(0, type.capacity - type._count.tickets),
      0,
    );
  }
  return {
    remaining: globalRemaining === null ? sum : Math.min(globalRemaining, sum),
    source:
      globalRemaining === null ? "TICKET_TYPES" : "EVENT_AND_TICKET_TYPES",
  };
}

export function availabilityPresentation(value) {
  const availability = readEventAvailability(value);
  if (!availability)
    return {
      value: "À confirmer",
      hint: "Disponibilités temporairement indisponibles.",
    };
  return {
    value:
      availability.remaining === null ? "Sans limite" : availability.remaining,
    hint: {
      EVENT: "Capacité globale · réservations en cours déduites",
      TICKET_TYPES: "Billets actifs · réservations en cours déduites",
      EVENT_AND_TICKET_TYPES:
        "Limites de l’événement et des billets · réservations déduites",
      UNLIMITED: "Aucune limite de capacité configurée sur les billets actifs.",
      NO_ACTIVE_TICKETS: "Aucun billet actif disponible à la vente.",
    }[availability.source],
  };
}
