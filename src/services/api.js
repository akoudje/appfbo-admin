// admin-app/src/services/api.js
// Axios API helper with country + auth headers

import axios from "axios";
import { getAdminToken, clearAdminSession } from "./auth";

const COUNTRY_STORAGE_KEY = "countryCode";
const DEFAULT_COUNTRY_CODE = "CIV";

/* ============================
   Country helpers
============================ */

export function getCountryCode() {
  if (typeof window === "undefined") return DEFAULT_COUNTRY_CODE;
  const raw = window.localStorage.getItem(COUNTRY_STORAGE_KEY);
  return (raw || DEFAULT_COUNTRY_CODE).trim().toUpperCase();
}

export function setCountryCode(code) {
  const normalized = String(code || DEFAULT_COUNTRY_CODE).trim().toUpperCase();
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
  timeout: 30000,
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
