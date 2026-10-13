import test from "node:test";
import assert from "node:assert/strict";
import { eventCollection, eventLifecycleStatus, filterManagementEvents, resolveEventSelection } from "./src/lib/ticketEvents/eventCollections.js";
const now = Date.parse("2026-10-13T12:00:00Z");
const events = [
  { id: "closed", title: "Master class", status: "CLOSED", startsAt: "2026-07-05", endsAt: null },
  { id: "open", title: "Conférence", status: "PUBLISHED", startsAt: "2026-10-24", endsAt: null },
  { id: "future", title: "Prochainement", status: "PUBLISHED", startsAt: "2026-11-01", salesOpenAt: "2026-10-20" },
  { id: "draft", title: "Brouillon", status: "DRAFT", startsAt: "2026-01-01", endsAt: "2026-01-02" },
  { id: "cancelled", title: "Annulé", status: "CANCELLED", startsAt: "2026-12-01" },
  { id: "ended", title: "Terminé", status: "PUBLISHED", startsAt: "2026-07-05", endsAt: "2026-07-05T17:00Z" },
  { id: "sale-closed", title: "Ventes fermées", status: "PUBLISHED", startsAt: "2026-10-24", salesCloseAt: "2026-10-13T12:00:00Z" },
];
test("active, draft and archive collections partition every event without mutating it", () => {
  const original = structuredClone(events);
  assert.deepEqual(filterManagementEvents(events, {collection:"ACTIVE"}, now).map(e=>e.id), ["open","future"]);
  assert.deepEqual(filterManagementEvents(events, {collection:"DRAFT"}, now).map(e=>e.id), ["draft"]);
  assert.deepEqual(filterManagementEvents(events, {collection:"ARCHIVES"}, now).map(e=>e.id), ["cancelled","sale-closed","closed","ended"]);
  assert.deepEqual(events, original);
});
test("closed events without an end and published events with closed sales are archived", () => {
  assert.equal(eventCollection(events[0], now), "ARCHIVES");
  assert.equal(eventLifecycleStatus(events.at(-1), now), "SALES_CLOSED");
  assert.equal(eventLifecycleStatus(events[5], now), "ENDED");
  assert.equal(eventCollection(events[3], now), "DRAFT");
  assert.equal(eventCollection({status:"PUBLISHED", startsAt:"2026-07-05", endsAt:null}, now), "ACTIVE");
});
test("default selection chooses an active event even when archives are first in the response", () => {
  assert.deepEqual(resolveEventSelection(events, {}, now), {collection:"ACTIVE",eventId:"open"});
  assert.deepEqual(resolveEventSelection(events, {collection:"ACTIVE",eventId:"closed"}, now), {collection:"ACTIVE",eventId:"open"});
});
test("deep links to archived and draft events select their collection and preserve the event", () => {
  assert.deepEqual(resolveEventSelection(events, {eventId:"closed"}, now), {collection:"ARCHIVES",eventId:"closed"});
  assert.deepEqual(resolveEventSelection(events, {eventId:"draft"}, now), {collection:"DRAFT",eventId:"draft"});
});
test("empty collections never fall back to an event from another collection", () => {
  assert.deepEqual(resolveEventSelection([events[0]], {}, now), {collection:"ACTIVE",eventId:""});
  assert.deepEqual(resolveEventSelection([events[1]], {collection:"DRAFT"}, now), {collection:"DRAFT",eventId:""});
});
test("search ignores accents within the selected collection", () => {
  assert.deepEqual(filterManagementEvents(events, {collection:"ACTIVE",q:"conference"}, now).map(e=>e.id), ["open"]);
  assert.equal(filterManagementEvents(events, {collection:"ACTIVE",q:"master"}, now).length, 0);
});
