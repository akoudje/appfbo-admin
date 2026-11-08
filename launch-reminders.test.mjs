// Règles des rappels « colis payés à lancer » (src/lib/launchReminders.js).
import test from "node:test";
import assert from "node:assert/strict";

const lib = await import("./src/lib/launchReminders.js");
const { decideReminder, waitLevel, formatWait, summarizePending, ACTIVITY_QUIET_MS } = lib;

const MIN = 60000;
const T0 = Date.parse("2026-11-08T10:00:00Z");
const S = { warnAfterMinutes: 15, alertAfterMinutes: 25, reminderIntervalMinutes: 10, maxReminders: 3 };
const order = (id, minutesAgo, now = T0) => ({ id, paidAt: new Date(now - minutesAgo * MIN).toISOString() });
const idle = (now) => now - 10 * MIN;

test("niveaux : gris < 15, orange 15-24, retard >= 25", () => {
  assert.equal(waitLevel(14, S), "fresh");
  assert.equal(waitLevel(15, S), "warn");
  assert.equal(waitLevel(24, S), "warn");
  assert.equal(waitLevel(25, S), "overdue");
  assert.equal(formatWait(42), "42 min");
  assert.equal(formatWait(65), "1 h 05");
});

test("pas de son avant le seuil, un son au seuil", () => {
  let d = decideReminder({ pending: [order("a", 24)], settings: S, nowMs: T0, lastActivityAt: idle(T0) });
  assert.equal(d.ring, false);
  d = decideReminder({ pending: [order("a", 25)], settings: S, nowMs: T0, lastActivityAt: idle(T0) });
  assert.equal(d.ring, true);
  assert.equal(d.memory.a.count, 1);
});

test("plusieurs colis en retard : un seul son regroupé", () => {
  const d = decideReminder({ pending: [order("a", 30), order("b", 40), order("c", 5)], settings: S, nowMs: T0, lastActivityAt: idle(T0) });
  assert.equal(d.ring, true);
  assert.deepEqual(d.due.map((r) => r.id).sort(), ["a", "b"]);
});

test("1 son au seuil + 3 rappels espacés de 10 min, puis silence", () => {
  const pending = [order("a", 25)];
  let memory = {}, lastSoundAt = 0, rings = 0;
  for (let m = 0; m <= 120; m += 1) {
    const now = T0 + m * MIN;
    const d = decideReminder({ pending, settings: S, nowMs: now, memory, lastSoundAt, lastActivityAt: idle(now) });
    memory = d.memory; lastSoundAt = d.lastSoundAt;
    if (d.ring) rings += 1;
  }
  assert.equal(rings, 4);
});

test("agent actif : son retardé, mais d'un intervalle au plus", () => {
  const pending = [order("a", 25)];
  const active = (now) => now - 30 * 1000;
  let d = decideReminder({ pending, settings: S, nowMs: T0, lastActivityAt: active(T0) });
  assert.equal(d.ring, false);
  assert.equal(d.reason, "agent-active");
  d = decideReminder({ pending, settings: S, nowMs: T0 + 10 * MIN, lastActivityAt: active(T0 + 10 * MIN) });
  assert.equal(d.ring, true);
  assert.ok(ACTIVITY_QUIET_MS === 2 * MIN);
});

test("« Je m'en occupe », pause, caisse fermée, responsable : pas de son", () => {
  const pending = [order("a", 30)];
  const base = { pending, settings: S, nowMs: T0, lastActivityAt: idle(T0) };
  assert.equal(decideReminder({ ...base, memory: { a: { snoozedUntil: T0 + MIN } } }).ring, false);
  assert.equal(decideReminder({ ...base, pausedUntil: T0 + MIN }).ring, false);
  assert.equal(decideReminder({ ...base, registerOpen: false }).ring, false);
  assert.equal(decideReminder({ ...base, remindUser: false }).ring, false);
});

test("écart minimum de 5 min entre deux sons, tous colis confondus", () => {
  const d = decideReminder({ pending: [order("b", 25)], settings: S, nowMs: T0, lastSoundAt: T0 - 2 * MIN, lastActivityAt: idle(T0) });
  assert.equal(d.ring, false);
  assert.equal(d.reason, "global-gap");
});

test("colis lancé : oublié de la mémoire", () => {
  const d = decideReminder({ pending: [], settings: S, nowMs: T0, memory: { gone: { count: 2 } } });
  assert.deepEqual(d.memory, {});
});

test("résumé : compte et plus ancien", () => {
  const s = summarizePending([order("a", 5), order("b", 18), order("c", 42)], S, T0);
  assert.deepEqual(s, { total: 3, warn: 1, overdue: 1, attention: 2, oldestMinutes: 42 });
});
