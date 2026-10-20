import { useCallback, useEffect, useRef, useState } from "react";
import { navBadgesService } from "../services/navBadgesService";
import useRealtimeAlerts from "./useRealtimeAlerts";

// Évènements temps réel qui changent le nombre de dossiers en attente dans
// une des trois files suivies par le menu latéral. Sur réception, on
// recharge juste les compteurs (léger), jamais de liste complète — même
// principe que BillingQueuePage.
const RELEVANT_EVENT_KEYS = new Set([
  "billing_queue_new",
  "billing_escalation_resolved",
  "as400_certification_dispute_resolved",
  "cashier_collect_new",
  "cashier_launch_new",
  "preparation_queue_new",
  "sponsorship_submitted",
]);

const EMPTY_COUNTS = { billing: 0, cashier: 0, sponsorships: 0 };

export default function useNavBadgeCounts() {
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const inFlightRef = useRef(false);

  const reload = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const data = await navBadgesService.get();
      setCounts({
        billing: Number(data?.billing || 0),
        cashier: Number(data?.cashier || 0),
        sponsorships: Number(data?.sponsorships || 0),
      });
    } catch {
      // Pastilles best-effort : une erreur ne doit pas casser le menu.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useRealtimeAlerts({
    onEvent: (event) => {
      if (RELEVANT_EVENT_KEYS.has(String(event?.eventKey || ""))) {
        reload();
      }
    },
  });

  return counts;
}
