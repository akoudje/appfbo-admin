import test from "node:test";
import assert from "node:assert/strict";
import {
  readEventAvailability,
  legacyEventAvailability,
  availabilityPresentation,
} from "./src/lib/ticketEvents/eventAvailability.js";

test("a single configured legacy ticket supplies available places without a global event capacity", () => {
  const event = {
    capacity: null,
    ticketTypes: [{ id: "standard", active: true, capacity: 3500 }],
  };
  const totals = {
    activeTickets: 220,
    usedTickets: 0,
    reservedTickets: 10,
    remainingCapacity: null,
  };
  const result = legacyEventAvailability(event, totals);
  assert.equal(result.remaining, 3270);
  assert.equal(result.source, "TICKET_TYPES");
  totals.reservedTickets = 0;
  assert.equal(legacyEventAvailability(event, totals).remaining, 3280);
  event.capacity = 300;
  totals.remainingCapacity = 70;
  assert.equal(legacyEventAvailability(event, totals).remaining, 70);
});

test("legacy categories are summed independently and inactive tariffs are excluded", () => {
  const event = {
    ticketTypes: [
      { active: true, capacity: 20, _count: { tickets: 25 } },
      { active: true, capacity: 30, _count: { tickets: 10 } },
      { active: false, capacity: 1000, _count: { tickets: 0 } },
    ],
  };
  assert.equal(
    legacyEventAvailability(event, { reservedTickets: 0 }).remaining,
    20,
  );
  assert.equal(legacyEventAvailability(event, { reservedTickets: 10 }), null);
});

test("zero, unlimited and unavailable figures have distinct presentations", () => {
  assert.equal(
    availabilityPresentation({ remaining: 0, source: "TICKET_TYPES" }).value,
    0,
  );
  assert.equal(
    availabilityPresentation({ remaining: null, source: "UNLIMITED" }).value,
    "Sans limite",
  );
  assert.equal(availabilityPresentation(null).value, "À confirmer");
  assert.equal(
    legacyEventAvailability(
      { ticketTypes: [{ active: false, capacity: 100 }] },
      {},
    ).remaining,
    0,
  );
  assert.equal(
    legacyEventAvailability(
      { capacity: null, ticketTypes: [{ active: true, capacity: null }] },
      {},
    ).remaining,
    null,
  );
});

test("invalid counters cannot be displayed as confirmed available places", () => {
  for (const remaining of [-1, undefined, "20", NaN, 1.5])
    assert.equal(
      readEventAvailability({ remaining, source: "TICKET_TYPES" }),
      null,
    );
  assert.equal(
    readEventAvailability({ remaining: 20, source: "UNLIMITED" }),
    null,
  );
  assert.equal(
    legacyEventAvailability(
      { ticketTypes: [{ active: true, capacity: 100 }] },
      { activeTickets: 10, usedTickets: 0 },
    ),
    null,
  );
});
