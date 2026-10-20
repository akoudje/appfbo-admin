import api from "./api";

// Pastilles du menu latéral (facturation/caisse/parrainages en attente).
export const navBadgesService = {
  get: async () => (await api.get("/admin/nav-badges")).data,
};
