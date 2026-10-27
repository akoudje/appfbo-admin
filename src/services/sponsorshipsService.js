import api from "./api";

// Parrainages à vérifier (droit SPONSORSHIP_REVIEW).
export const sponsorshipsService = {
  list: async (params = {}) => (await api.get("/admin/sponsorships", { params })).data,

  get: async (id) => (await api.get(`/admin/sponsorships/${id}`)).data,

  downloadDocument: async (id, documentId) =>
    api.get(`/admin/sponsorships/${id}/documents/${documentId}/file`, { responseType: "blob" }),

  requestChanges: async (id, note) => (await api.post(`/admin/sponsorships/${id}/request-changes`, { note })).data,

  reject: async (id, reason) => (await api.post(`/admin/sponsorships/${id}/reject`, { reason })).data,

  // Approbation + préfacturation de l'achat :
  // { recruitFboNumero, factureReference, invoiceAmountFcfa, paymentMode, deliveryMode }.
  // Réponse { ok: false, purchaseError } : approuvé, mais achat à relancer.
  approve: async (id, body) => (await api.post(`/admin/sponsorships/${id}/approve`, body)).data,

  // Annulation d'un parrainage approuvé dont l'achat n'est pas payé.
  cancel: async (id, reason) => (await api.post(`/admin/sponsorships/${id}/cancel`, { reason })).data,

  evaluate: async (id) => (await api.post(`/admin/sponsorships/${id}/evaluate`)).data,

  // Renvoi au parrain et au filleul de la notification du statut en cours
  // (approbation avec lien de paiement, ou validation) : channels ["SMS", "EMAIL"].
  // Réponse { kind: "APPROVAL" | "VALIDATION", results: [{ channel, who, ok, skipped, error }] }.
  resendNotification: async (id, channels) =>
    (await api.post(`/admin/sponsorships/${id}/resend-notification`, { channels })).data,

  agreementPdf: async (id) => api.get(`/admin/sponsorships/${id}/agreement.pdf`, { responseType: "blob" }),

  // Fiche + pièce d'identité (impression / traitement), à tout statut.
  dossierPdf: async (id) => api.get(`/admin/sponsorships/${id}/dossier.pdf`, { responseType: "blob", timeout: 120000 }),

  catalog: async (id) => (await api.get(`/admin/sponsorships/${id}/catalog`)).data,

  // Relance de l'achat : { items?, paymentMode, deliveryMode, factureReference, invoiceAmountFcfa, note? }
  counterPurchase: async (id, body) => (await api.post(`/admin/sponsorships/${id}/counter-purchase`, body)).data,

  // Soumission assistée au comptoir pour un parrain non reconnu par FBO
  // Service : formData avec les mêmes champs que la soumission client, plus
  // sponsorNumero/sponsorNom/sponsorGrade et les fichiers idFront/idBack/
  // passport/other.
  counterSubmit: async (formData) =>
    (await api.post("/admin/sponsorships/counter-submit", formData)).data,
};
