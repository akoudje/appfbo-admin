// src/services/auth.js
// Helpers centralisés pour l'auth admin + user courant

const TOKEN_KEY = "adminToken";
const ADMIN_USER_KEY = "admin_user";

function notifyAdminSession() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event("admin-session-change"));
}

function getDesktopBridge() {
  if (typeof window === "undefined") return null;
  const bridge = window.desktopBridge;
  if (!bridge || bridge.isDesktop !== true) return null;
  return bridge;
}

export function getAdminToken() {
  if (typeof window === "undefined") return null;

  const bridge = getDesktopBridge();
  if (bridge?.authToken?.get) {
    const token = bridge.authToken.get();
    return token ? String(token) : null;
  }

  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token) {
  if (typeof window === "undefined") return null;
  if (!token) return null;

  const normalized = String(token);
  const bridge = getDesktopBridge();

  if (bridge?.authToken?.set) {
    bridge.authToken.set(normalized);
    notifyAdminSession();
    return normalized;
  }

  window.localStorage.setItem(TOKEN_KEY, normalized);
  notifyAdminSession();
  return normalized;
}

export function clearAdminToken() {
  if (typeof window === "undefined") return;

  const bridge = getDesktopBridge();
  if (bridge?.authToken?.clear) {
    bridge.authToken.clear();
    notifyAdminSession();
    return;
  }

  window.localStorage.removeItem(TOKEN_KEY);
  notifyAdminSession();
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
  notifyAdminSession();
  return user;
}

export function clearAdminUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ADMIN_USER_KEY);
  notifyAdminSession();
}

export function clearAdminSession() {
  clearAdminToken();
  clearAdminUser();
}
