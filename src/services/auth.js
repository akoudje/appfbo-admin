// src/services/auth.js
const TOKEN_KEY = "adminToken";

export function getAdminToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token) {
  if (typeof window === "undefined") return null;
  if (!token) return null;
  window.localStorage.setItem(TOKEN_KEY, token);
  return token;
}

export function clearAdminToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export function isAuthed() {
  return Boolean(getAdminToken());
}