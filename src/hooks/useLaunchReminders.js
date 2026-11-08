// Accès aux rappels « colis payés à lancer » (voir
// components/cashier/LaunchRemindersProvider.jsx).
import { createContext, useContext } from "react";
import { DEFAULT_LAUNCH_ALERT_SETTINGS } from "../lib/launchReminders";

export const LaunchRemindersContext = createContext(null);

export const LAUNCH_REMINDERS_REFRESH_EVENT = "cashier-launch-reminders:refresh";

// Hors provider (pages sans AdminLayout) : valeur neutre, rien ne s'affiche.
const NEUTRAL = {
  enabled: false,
  settings: DEFAULT_LAUNCH_ALERT_SETTINGS,
  pending: [],
  summary: { total: 0, warn: 0, overdue: 0, escalated: 0, attention: 0, oldestMinutes: null },
  nowMs: 0,
  remindUser: false,
  escalateToUser: false,
  registerOpen: true,
  pausedUntil: 0,
  notifPermission: "unsupported",
  refresh: () => {},
  snoozeOrder: () => {},
  pause: () => {},
  resume: () => {},
  requestNotifications: () => {},
  snoozedUntil: () => 0,
  waitOf: () => ({ minutes: null, level: null }),
};

export function useLaunchReminders() {
  return useContext(LaunchRemindersContext) || NEUTRAL;
}

// À appeler après une action qui change la file (lancement, fermeture de
// caisse) : le bandeau se met à jour sans attendre la minute suivante.
export function requestLaunchRemindersRefresh() {
  window.dispatchEvent(new Event(LAUNCH_REMINDERS_REFRESH_EVENT));
}
