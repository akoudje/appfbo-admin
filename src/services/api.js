import axios from "axios";

const COUNTRY_STORAGE_KEY = "countryCode";
const DEFAULT_COUNTRY_CODE = "CI";

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

const DEFAULT_API =
  window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://appfbo-backend.onrender.com/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers["X-Country"] = getCountryCode();
  return config;
});

export default api;

