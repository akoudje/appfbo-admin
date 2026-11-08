import api from "./api";

export const cashRegisterStatusService = {
  get: async () => (await api.get("/admin/cash-register-status")).data,

  // Ce que la fermeture va annuler / laisser en attente (voir CloseRegisterDialog).
  preview: async () => (await api.get("/admin/cash-register-status/close-preview")).data,

  // `confirmNoUnrecordedCash` : exigé par le serveur dès qu'une préfacture
  // serait annulée (sinon 409 CLOSURE_CONFIRMATION_REQUIRED).
  close: async (message = "", { confirmNoUnrecordedCash = false } = {}) =>
    (
      await api.post("/admin/cash-register-status/close", {
        message,
        confirmNoUnrecordedCash,
      })
    ).data,

  open: async () => (await api.post("/admin/cash-register-status/open", {})).data,
};
