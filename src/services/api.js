import axios from "axios";

const DEFAULT_API =
  window.location.hostname === "localhost"
    ? "http://localhost:4000/api"
    : "https://appfbo-backend.onrender.com/api";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || DEFAULT_API,
  timeout: 15000,
});

export default api;

