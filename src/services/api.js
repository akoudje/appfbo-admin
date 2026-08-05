// admin-app/src/services/api.js
// Axios API helper with country + auth headers

import axios from "axios";
import { getAdminToken, getAdminUser, clearAdminSession } from "./auth";

const COUNTRY_STORAGE_KEY = "countryCode";
const DEFAULT_COUNTRY_CODE = "CIV";

/* ============================
   Country helpers
============================ */

export function getCountryCode() {
  if (typeof window === "undefined") return DEFAULT_COUNTRY_CODE;
  const admin = getAdminUser();
  if (admin?.role && admin.role !== "SUPER_ADMIN" && admin.countryCode) {
    return String(admin.countryCode).trim().toUpperCase();
  }
  const raw = window.localStorage.getItem(COUNTRY_STORAGE_KEY);
  return (raw || DEFAULT_COUNTRY_CODE).trim().toUpperCase();
}

export function setCountryCode(code) {
  const admin = getAdminUser();
  const allowedCountry =
    admin?.role && admin.role !== "SUPER_ADMIN" && admin.countryCode
      ? admin.countryCode
      : code;
  const normalized = String(allowedCountry || DEFAULT_COUNTRY_CODE).trim().toUpperCase();
  if (typeof window !== "undefined") {
    window.localStorage.setItem(COUNTRY_STORAGE_KEY, normalized);
  }
  return normalized;
}

/* ============================
   Axios instance
============================ */

const DEFAULT_API =
  typeof window !== "undefined" && window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://appfbo-backend.onrender.com/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API,
  // 45s : les écrans facturier/caisse tirent plusieurs requêtes lourdes en
  // parallèle (jusqu'à 5-8) ; 30s coupait parfois avant que le backend ait
  // fini de répondre, affichant "Erreur serveur" à tort.
  timeout: 45000,
});

function redirectToLogin() {
  if (typeof window === "undefined") return;

  const isDesktopRuntime =
    window?.desktopBridge?.isDesktop === true || window.location.protocol === "file:";

  if (isDesktopRuntime) {
    window.location.hash = "#/login";
    return;
  }

  window.location.href = "/login";
}

/* ============================
   Request interceptor
============================ */

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  config.headers["X-Country"] = getCountryCode();

  const token = getAdminToken();
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }

  return config;
});

/* ============================
   Response interceptor
============================ */

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAdminSession();

      redirectToLogin();
    }

    return Promise.reject(error);
  }
);

export default api;
