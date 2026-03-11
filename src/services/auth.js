// src/services/auth.js
// Helpers centralisés pour l'auth admin + user courant

const TOKEN_KEY = "adminToken";
const ADMIN_USER_KEY = "admin_user";

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

export function getAdminUser() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(ADMIN_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAdminUser(user) {
  if (typeof window === "undefined") return null;
  if (!user) return null;

  window.localStorage.setItem(ADMIN_USER_KEY, JSON.stringify(user));
  return user;
}

export function clearAdminUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_USER_KEY);
}

export function clearAdminSession() {
  clearAdminToken();
  clearAdminUser();
}