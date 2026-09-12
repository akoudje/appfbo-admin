import api from "./api";

export const cashRegisterStatusService = {
  get: async () => (await api.get("/admin/cash-register-status")).data,

  close: async (message = "") =>
    (await api.post("/admin/cash-register-status/close", { message })).data,

  open: async () => (await api.post("/admin/cash-register-status/open", {})).data,
};
