// Rappels « colis payés à lancer » : calculs purs (sans React), partagés par
// le bandeau global, l'espace caisse et le moteur de rappels sonores.
//
// Principe validé avec l'exploitation : un agent qui traite sa file à temps
// ne doit presque jamais entendre de son. Montée progressive :
//   - avant `warnAfterMinutes` : durée affichée discrètement, rien d'autre ;
//   - de `warnAfterMinutes` à `alertAfterMinutes` : pastille orange, sans son ;
//   - à `alertAfterMinutes` : un son doux + une notification, regroupés pour
//     tous les colis en retard ;
//   - puis au plus `maxReminders` rappels espacés de `reminderIntervalMinutes`,
//     et ensuite plus aucun son pour ce colis.
// Pas de son quand l'agent travaille (activité récente, retard limité à un
// intervalle), quand il a dit « Je m'en occupe », pendant une pause, ou
// caisse fermée.

export const DEFAULT_LAUNCH_ALERT_SETTINGS = Object.freeze({
  warnAfterMinutes: 15,
  alertAfterMinutes: 25,
  reminderIntervalMinutes: 10,
  maxReminders: 3,
});

// L'agent a cliqué ou tapé récemment : il est occupé, il n'a pas oublié.
export const ACTIVITY_QUIET_MS = 2 * 60 * 1000;
// Écart minimum entre deux sons, tous colis confondus.
export const GLOBAL_SOUND_GAP_MS = 5 * 60 * 1000;
// « Je m'en occupe » : le temps de faire la certification AS400.
export const SNOOZE_ORDER_MS = 10 * 60 * 1000;
// Pause des rappels : 15 min au plus, renouvelable.
export const PAUSE_MAX_MS = 15 * 60 * 1000;

export function normalizeSettings(settings) {
  const s = { ...DEFAULT_LAUNCH_ALERT_SETTINGS, ...(settings || {}) };
  const int = (v, fallback, min = 1) => (Number.isInteger(Number(v)) && Number(v) >= min ? Number(v) : fallback);
  const alertAfterMinutes = int(s.alertAfterMinutes, 25);
  let warnAfterMinutes = int(s.warnAfterMinutes, 15);
  if (warnAfterMinutes >= alertAfterMinutes) warnAfterMinutes = Math.max(1, alertAfterMinutes - 1);
  return {
    warnAfterMinutes,
    alertAfterMinutes,
    // Remontée au responsable de comptoir (2 × le seuil, fourni par le serveur).
    escalateAfterMinutes: int(s.escalateAfterMinutes, alertAfterMinutes * 2),
    reminderIntervalMinutes: int(s.reminderIntervalMinutes, 10),
    maxReminders: int(s.maxReminders, 3, 0),
  };
}

export function waitMinutes(paidAt, nowMs) {
  const t = new Date(paidAt || 0).getTime();
  if (!Number.isFinite(t) || t <= 0) return null;
  return Math.max(0, Math.floor((nowMs - t) / 60000));
}

// "fresh" | "warn" | "overdue" (null si pas de date de paiement).
export function waitLevel(minutes, settings) {
  if (minutes === null || minutes === undefined) return null;
  const s = normalizeSettings(settings);
  if (minutes >= s.alertAfterMinutes) return "overdue";
  if (minutes >= s.warnAfterMinutes) return "warn";
  return "fresh";
}

export function formatWait(minutes) {
  if (minutes === null || minutes === undefined) return "";
  if (minutes < 1) return "moins d’une minute";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

// Résumé pour le bandeau et le titre d'onglet.
export function summarizePending(pending, settings, nowMs) {
  const escalateAfter = normalizeSettings(settings).escalateAfterMinutes;
  let warn = 0;
  let overdue = 0;
  let escalated = 0;
  let oldestMinutes = null;
  for (const row of pending || []) {
    const minutes = waitMinutes(row.paidAt, nowMs);
    const level = waitLevel(minutes, settings);
    if (minutes !== null && minutes >= escalateAfter) escalated += 1;
    if (level === "overdue") overdue += 1;
    else if (level === "warn") warn += 1;
    if (minutes !== null && (oldestMinutes === null || minutes > oldestMinutes)) oldestMinutes = minutes;
  }
  return { total: (pending || []).length, warn, overdue, escalated, attention: warn + overdue, oldestMinutes };
}

// Décide s'il faut sonner maintenant. `memory` : { [orderId]: { count,
// lastAt, snoozedUntil } } (persisté par l'appelant), `lastSoundAt` : dernier
// son joué, tous colis confondus. Ne modifie rien : renvoie le nouvel état.
export function decideReminder({
  pending,
  settings,
  nowMs,
  memory = {},
  lastSoundAt = 0,
  lastActivityAt = 0,
  pausedUntil = 0,
  busy = false,
  registerOpen = true,
  remindUser = true,
}) {
  const s = normalizeSettings(settings);
  const ids = new Set((pending || []).map((row) => row.id));
  // Les colis lancés (ou sortis de la file) sont oubliés.
  const nextMemory = {};
  for (const [id, entry] of Object.entries(memory || {})) if (ids.has(id)) nextMemory[id] = entry;

  const result = (ring, reason, due = []) => ({ ring, reason, due, memory: nextMemory, lastSoundAt });
  if (!remindUser) return result(false, "not-reminded-role");
  if (!registerOpen) return result(false, "register-closed");

  const intervalMs = s.reminderIntervalMinutes * 60000;
  const due = (pending || []).filter((row) => {
    if (waitLevel(waitMinutes(row.paidAt, nowMs), s) !== "overdue") return false;
    const entry = nextMemory[row.id] || {};
    if (Number(entry.snoozedUntil || 0) > nowMs) return false;
    const count = Number(entry.count || 0);
    if (count > s.maxReminders) return false; // 1 son au seuil + maxReminders rappels
    return count === 0 || nowMs - Number(entry.lastAt || 0) >= intervalMs;
  });
  if (!due.length) return result(false, "nothing-due");
  if (Number(pausedUntil || 0) > nowMs) return result(false, "paused", due);
  // L'activité ne retarde le son que d'un intervalle au plus : un agent qui
  // facture sans arrêt doit quand même finir par être rappelé.
  const oldestDueSince = Math.min(
    ...due.map((row) => {
      const entry = nextMemory[row.id] || {};
      return Number(entry.count || 0) === 0
        ? new Date(row.paidAt).getTime() + s.alertAfterMinutes * 60000
        : Number(entry.lastAt || 0) + intervalMs;
    }),
  );
  const deferredTooLong = nowMs - oldestDueSince >= intervalMs;
  if (!deferredTooLong && (busy || nowMs - Number(lastActivityAt || 0) < ACTIVITY_QUIET_MS))
    return result(false, "agent-active", due);
  if (nowMs - Number(lastSoundAt || 0) < GLOBAL_SOUND_GAP_MS) return result(false, "global-gap", due);

  for (const row of due) {
    const entry = nextMemory[row.id] || {};
    nextMemory[row.id] = { ...entry, count: Number(entry.count || 0) + 1, lastAt: nowMs };
  }
  return { ring: true, reason: "due", due, memory: nextMemory, lastSoundAt: nowMs };
}

export function reminderMessage(summary) {
  const n = summary.overdue || summary.attention || summary.total;
  const plural = n > 1;
  const head = `${n} colis payé${plural ? "s" : ""} prêt${plural ? "s" : ""} à lancer`;
  return summary.oldestMinutes !== null && summary.oldestMinutes !== undefined
    ? `${head} · le plus ancien attend depuis ${formatWait(summary.oldestMinutes)}`
    : head;
}
