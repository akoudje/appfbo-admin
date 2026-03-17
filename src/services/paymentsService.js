// src/services/paymentsService.js
import api from "./api";

export const paymentsService = {
  initiateWave: async (orderId) =>
    (await api.post("/payments/wave/initiate", { orderId })).data,

  getWaveStatus: async (orderId) =>
    (await api.get(`/payments/wave/${orderId}/status`)).data,

  simulateWave: async (orderId, scenario) =>
    (await api.post(`/payments/wave/${orderId}/simulate`, { scenario })).data,
};