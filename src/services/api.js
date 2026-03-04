// admin-app/src/services/api.js
// Axios API helper with country + auth headers

import axios from "axios";


const COUNTRY_STORAGE_KEY = "countryCode";
const TOKEN_STORAGE_KEY = "adminToken";
const DEFAULT_COUNTRY_CODE = "CI";

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
   Auth helpers
============================ */

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAdminToken(token) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  }
}

export function clearAdminToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

/* ============================
   Axios instance
============================ */

const DEFAULT_API =
  window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://appfbo-backend.onrender.com/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API,
  timeout: 30000,
});

/* ============================
   Request interceptor
============================ */

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};

  // Country context (mandatory for backend)
  config.headers["X-Country"] = getCountryCode();

  // Admin auth token
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
      // Token expired / invalid
      clearAdminToken();

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
