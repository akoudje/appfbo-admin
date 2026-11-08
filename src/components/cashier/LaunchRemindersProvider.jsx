// Rappels « colis payés à lancer » pour l'agent de vente, actifs sur TOUTES
// les pages de l'administration (un agent qui facture dans la file de
// facturation doit aussi être rappelé), d'où leur place dans AdminLayout.
//
// Règles (voir lib/launchReminders.js) : son doux regroupé au seuil, rappels
// espacés et plafonnés, silence pendant que l'agent travaille, « Je m'en
// occupe » par colis, pause de 15 min au plus, rien caisse fermée. Le
// lancement reste manuel (certification AS400) : rien n'est lancé ici.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAdminAuth from "../../hooks/useAdminAuth";
import { usePermission } from "../../hooks/usePermission";
import { Permission } from "../../auth/permissions";
import { cashierService } from "../../services/cashierService";
import { playSoundPattern, readSoundPreferences } from "../../hooks/useSoundAlerts";
import { unlockGlobalSoundSession } from "../../lib/soundEngine";
import {
  desktopFlash,
  desktopNotify,
  desktopSetBadge,
  isDesktopApp,
  onDesktopNavigate,
} from "../../lib/desktopBridge";
import { LAUNCH_REMINDERS_REFRESH_EVENT, LaunchRemindersContext } from "../../hooks/useLaunchReminders";
import {
  DEFAULT_LAUNCH_ALERT_SETTINGS,
  PAUSE_MAX_MS,
  SNOOZE_ORDER_MS,
  decideReminder,
  normalizeSettings,
  reminderMessage,
  summarizePending,
  waitLevel,
  waitMinutes,
} from "../../lib/launchReminders";

const POLL_MS = 60 * 1000;
const TICK_MS = 20 * 1000;
const STORAGE_PREFIX = "cashier_launch_reminders_v1";
const TITLE_PREFIX_RE = /^\(\d+\)\s+/;

function readState(key) {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeState(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible (navigation privée) : rappels en mémoire seulement.
  }
}

function notificationPermission() {
  // Application de bureau : notifications Windows natives, sans autorisation.
  if (isDesktopApp()) return "granted";
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission;
}

export function LaunchRemindersProvider({ children }) {
  const { admin } = useAdminAuth();
  const canUse = usePermission(Permission.PAYMENT_VALIDATE);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const storageKey = `${STORAGE_PREFIX}:${admin?.id || "anonymous"}`;

  const [data, setData] = useState(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [stateVersion, setStateVersion] = useState(0);
  const [notifPermission, setNotifPermission] = useState(notificationPermission);

  const offsetRef = useRef(0); // horloge serveur - horloge du poste
  const lastActivityRef = useRef(0);
  const persistedRef = useRef({});
  const pathnameRef = useRef(pathname);
  const navigateRef = useRef(navigate);
  useEffect(() => {
    pathnameRef.current = pathname;
    navigateRef.current = navigate;
  }, [pathname, navigate]);

  // Relu dans le stockage à chaque fois : plusieurs onglets ouverts partagent
  // le même état et ne sonnent donc pas chacun de leur côté.
  const currentState = useCallback(() => {
    const stored = readState(storageKey);
    return Object.keys(stored).length ? stored : persistedRef.current || {};
  }, [storageKey]);

  const updatePersisted = useCallback(
    (updater) => {
      const next = updater(currentState());
      persistedRef.current = next;
      writeState(storageKey, next);
      setStateVersion((v) => v + 1);
    },
    [storageKey, currentState],
  );

  const refresh = useCallback(async () => {
    if (!canUse) return;
    try {
      const res = await cashierService.getLaunchAlerts();
      const serverNow = new Date(res?.serverNow || 0).getTime();
      if (Number.isFinite(serverNow) && serverNow > 0) offsetRef.current = serverNow - Date.now();
      setData(res);
      setNowMs(Date.now() + offsetRef.current);
    } catch {
      // Best-effort : un échec ne doit jamais gêner l'agent.
    }
  }, [canUse]);

  // Interrogation légère, y compris onglet en arrière-plan (c'est justement
  // là qu'un rappel est utile).
  useEffect(() => {
    if (!canUse) return undefined;
    const first = setTimeout(refresh, 0);
    const timer = setInterval(refresh, POLL_MS);
    const onRefresh = () => refresh();
    window.addEventListener(LAUNCH_REMINDERS_REFRESH_EVENT, onRefresh);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
      window.removeEventListener(LAUNCH_REMINDERS_REFRESH_EVENT, onRefresh);
    };
  }, [canUse, refresh]);

  // Activité de l'agent (clic, frappe) : il travaille, on ne le dérange pas.
  // Le premier geste débloque aussi le son du navigateur.
  useEffect(() => {
    if (!canUse) return undefined;
    const onActivity = () => {
      lastActivityRef.current = Date.now() + offsetRef.current;
      unlockGlobalSoundSession().catch(() => {});
    };
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, [canUse]);

  const rawSettings = data?.settings;
  const rawPending = data?.pending;
  const settings = useMemo(
    () => normalizeSettings(rawSettings || DEFAULT_LAUNCH_ALERT_SETTINGS),
    [rawSettings],
  );
  const pending = useMemo(() => (Array.isArray(rawPending) ? rawPending : []), [rawPending]);
  const remindUser = Boolean(data?.remindUser);
  const escalateToUser = Boolean(data?.escalateToUser);
  const registerOpen = data?.registerOpen !== false;

  const ring = useCallback(
    async (summary) => {
      const prefs = readSoundPreferences("cashier");
      // Les rappels de retard ne suivent pas « alertes désactivées » (pas de
      // coupure totale) : seuls la pause de 15 min et le volume s'appliquent.
      const volume = Math.max(0.05, Math.min(1, prefs.volume)) * 0.8;
      if (prefs.volume > 0) await playSoundPattern("launch_reminder", volume);
      // Application de bureau : icône qui clignote + notification native.
      desktopFlash();
      if (desktopNotify({ title: "Colis payés à lancer", body: reminderMessage(summary), route: "/cashier" })) return;
      if (notificationPermission() === "granted") {
        try {
          const notification = new window.Notification("Colis payés à lancer", {
            body: reminderMessage(summary),
            tag: "cashier-launch-reminder",
            renotify: true,
          });
          notification.onclick = () => {
            window.focus();
            navigateRef.current("/cashier");
            notification.close();
          };
        } catch {
          // Notifications non disponibles dans ce contexte.
        }
      }
    },
    [],
  );

  // Horloge + décision de rappel.
  useEffect(() => {
    if (!canUse) return undefined;
    const tick = () => {
      const now = Date.now() + offsetRef.current;
      setNowMs(now);
      if (!data) return;
      const state = currentState();
      const decision = decideReminder({
        pending,
        settings,
        nowMs: now,
        memory: state.memory || {},
        lastSoundAt: Number(state.lastSoundAt || 0),
        lastActivityAt: lastActivityRef.current,
        pausedUntil: Number(state.pausedUntil || 0),
        busy: String(pathnameRef.current || "").startsWith("/orders/"),
        registerOpen,
        remindUser,
      });
      const memoryChanged = JSON.stringify(decision.memory) !== JSON.stringify(state.memory || {});
      if (decision.ring || memoryChanged) {
        updatePersisted((prev) => ({ ...prev, memory: decision.memory, lastSoundAt: decision.lastSoundAt }));
      }
      if (decision.ring) ring(summarizePending(decision.due, settings, now));
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [canUse, data, pending, settings, registerOpen, remindUser, ring, updatePersisted, currentState]);

  const summary = useMemo(() => summarizePending(pending, settings, nowMs), [pending, settings, nowMs]);

  // Application de bureau : pastille du nombre de colis sur l'icône de la
  // barre des tâches, et clic sur une notification → espace caisse.
  const badgeCount = canUse && remindUser ? summary.total : 0;
  useEffect(() => {
    desktopSetBadge(badgeCount);
  }, [badgeCount]);
  useEffect(() => () => desktopSetBadge(0), []);
  useEffect(() => onDesktopNavigate((route) => navigateRef.current(route)), []);

  // Compteur dans le titre de l'onglet, visible depuis les autres onglets.
  useEffect(() => {
    if (!canUse || typeof document === "undefined") return undefined;
    const count = remindUser ? summary.total : 0;
    const apply = () => {
      const base = document.title.replace(TITLE_PREFIX_RE, "");
      const next = count > 0 ? `(${count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const titleEl = document.querySelector("title");
    const observer = titleEl ? new MutationObserver(apply) : null;
    observer?.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => {
      observer?.disconnect();
      document.title = document.title.replace(TITLE_PREFIX_RE, "");
    };
  }, [canUse, remindUser, summary.total]);

  const snoozeOrder = useCallback(
    (orderId) => {
      const until = Date.now() + offsetRef.current + SNOOZE_ORDER_MS;
      updatePersisted((prev) => ({
        ...prev,
        memory: { ...(prev.memory || {}), [orderId]: { ...((prev.memory || {})[orderId] || {}), snoozedUntil: until } },
      }));
      setNowMs(Date.now() + offsetRef.current);
    },
    [updatePersisted],
  );

  const pause = useCallback(() => {
    updatePersisted((prev) => ({ ...prev, pausedUntil: Date.now() + offsetRef.current + PAUSE_MAX_MS }));
  }, [updatePersisted]);

  const resume = useCallback(() => {
    updatePersisted((prev) => ({ ...prev, pausedUntil: 0 }));
  }, [updatePersisted]);

  const requestNotifications = useCallback(async () => {
    if (notificationPermission() !== "default") return;
    try {
      const result = await window.Notification.requestPermission();
      setNotifPermission(result);
    } catch {
      setNotifPermission(notificationPermission());
    }
  }, []);

  // Relu à chaque tic d'horloge : suit aussi une pause posée dans un autre onglet.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const persisted = useMemo(() => currentState(), [currentState, stateVersion, nowMs]);
  const pausedUntil = Number(persisted?.pausedUntil || 0) > nowMs ? Number(persisted.pausedUntil) : 0;

  const value = useMemo(
    () => ({
      enabled: canUse && Boolean(data),
      settings,
      pending,
      summary,
      nowMs,
      remindUser,
      escalateToUser,
      registerOpen,
      pausedUntil,
      notifPermission,
      refresh,
      snoozeOrder,
      pause,
      resume,
      requestNotifications,
      snoozedUntil: (orderId) => {
        const until = Number(persisted?.memory?.[orderId]?.snoozedUntil || 0);
        return until > nowMs ? until : 0;
      },
      waitOf: (paidAt) => {
        const minutes = waitMinutes(paidAt, nowMs);
        return { minutes, level: waitLevel(minutes, settings) };
      },
    }),
    [canUse, data, settings, pending, summary, nowMs, remindUser, escalateToUser, registerOpen, pausedUntil, notifPermission, refresh, snoozeOrder, pause, resume, requestNotifications, persisted],
  );

  return <LaunchRemindersContext.Provider value={value}>{children}</LaunchRemindersContext.Provider>;
}
