// Compteurs de travail en attente (menu latéral, page « Ma journée »),
// calculés une seule fois dans AdminLayout (useNavBadgeCounts) et partagés
// ici pour ne pas multiplier les appels ni les connexions temps réel.
import { createContext, useContext } from "react";

export const NavBadgeCountsContext = createContext(null);

const NEUTRAL = {
  loaded: false,
  billing: 0,
  cashier: 0,
  sponsorships: 0,
  escalations: 0,
  levels: {},
  cashierDetail: { toCollect: 0, toLaunch: 0, oldestLaunchPaidAt: null },
  reload: () => {},
};

export function useNavBadgeCountsContext() {
  return useContext(NavBadgeCountsContext) || NEUTRAL;
}
