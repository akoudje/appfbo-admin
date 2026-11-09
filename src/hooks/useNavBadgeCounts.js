import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { navBadgesService } from "../services/navBadgesService";
import useRealtimeAlerts from "./useRealtimeAlerts";
import { LAUNCH_REMINDERS_REFRESH_EVENT } from "./useLaunchReminders";

// Évènements temps réel qui changent le nombre de dossiers en attente dans
// une des files suivies par le menu latéral et la page « Ma journée ». Sur
// réception, on recharge juste les compteurs (léger), jamais de liste
// complète — même principe que BillingQueuePage.
const RELEVANT_EVENT_KEYS = new Set([
  "billing_queue_new",
  "billing_escalated_new",
  "billing_escalation_resolved",
  "as400_certification_dispute_new",
  "as400_certification_dispute_resolved",
  "cashier_collect_new",
  "cashier_launch_new",
  "preparation_queue_new",
  "sponsorship_submitted",
]);

const EMPTY_COUNTS = {
  loaded: false,
  billing: 0,
  cashier: 0,
  sponsorships: 0,
  escalations: 0,
  levels: {},
  cashierDetail: { toCollect: 0, toLaunch: 0, oldestLaunchPaidAt: null },
};

// Le niveau d'urgence de la caisse (orange, rouge) évolue avec le temps qui
// passe, sans événement : rechargement léger chaque minute.
const REFRESH_INTERVAL_MS = 60_000;
const LEVELS = new Set(["none", "warn", "alert"]);

export default function useNavBadgeCounts() {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const inFlightRef = useRef(false);

  const reload = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await navBadgesService.get();
      const cashierLevel = String(data?.levels?.cashier || "none");
      setCounts({
        loaded: true,
        billing: Number(data?.billing || 0),
        cashier: Number(data?.cashier || 0),
        sponsorships: Number(data?.sponsorships || 0),
        escalations: Number(data?.escalations || 0),
        levels: { cashier: LEVELS.has(cashierLevel) ? cashierLevel : "none" },
        cashierDetail: {
          toCollect: Number(data?.cashierDetail?.toCollect || 0),
          toLaunch: Number(data?.cashierDetail?.toLaunch || 0),
          oldestLaunchPaidAt: data?.cashierDetail?.oldestLaunchPaidAt || null,
        },
      });
    } catch {
      // Pastilles best-effort : une erreur ne doit pas casser le menu.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    reload();
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "hidden") reload();
    }, REFRESH_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Lancement de préparation, fermeture de caisse… (voir
    // requestLaunchRemindersRefresh) : le compteur Caisse suit tout de suite.
    window.addEventListener(LAUNCH_REMINDERS_REFRESH_EVENT, reload);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(LAUNCH_REMINDERS_REFRESH_EVENT, reload);
    };
  }, [reload]);

  useRealtimeAlerts({
    onEvent: (event) => {
      if (RELEVANT_EVENT_KEYS.has(String(event?.eventKey || ""))) {
        reload();
      }
    },
  });

  return useMemo(() => ({ ...counts, reload }), [counts, reload]);
}
