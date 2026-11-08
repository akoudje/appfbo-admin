// Accès à l'application de bureau (Electron, voir electron/preload.cjs).
// Dans le navigateur, chaque fonction est sans effet et renvoie false : les
// appelants retombent sur l'équivalent web (Notification HTML5, etc.).

function bridge() {
  return typeof window !== "undefined" && window.desktopBridge?.isDesktop === true
    ? window.desktopBridge
    : null;
}

export function isDesktopApp() {
  return Boolean(bridge());
}

export function desktopAppVersion() {
  return bridge()?.appVersion || null;
}

// Le son peut-il être joué sans clic préalable de l'utilisateur ?
export function desktopAutoplayAllowed() {
  return bridge()?.autoplayAllowed === true;
}

// Notification Windows native ; un clic ramène la fenêtre sur `route`.
export function desktopNotify({ title, body, route }) {
  const api = bridge();
  if (typeof api?.notify !== "function") return false;
  api.notify({ title, body, route }).catch(() => {});
  return true;
}

export function desktopFlash() {
  const api = bridge();
  if (typeof api?.attention?.flash !== "function") return false;
  api.attention.flash();
  return true;
}

// Pastille ronde (ambre, chiffre blanc) dessinée ici puis posée par Electron
// sur l'icône de la barre des tâches.
function badgeImage(count) {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#d97706";
  ctx.beginPath();
  ctx.arc(16, 16, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  const label = count > 99 ? "99+" : String(count);
  ctx.font = `bold ${label.length > 2 ? 13 : label.length > 1 ? 17 : 21}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, 16, 17);
  return canvas.toDataURL("image/png");
}

export function desktopSetBadge(count) {
  const api = bridge();
  if (typeof api?.attention?.setBadge !== "function") return false;
  const n = Math.max(0, Number(count) || 0);
  api.attention.setBadge(n, n > 0 ? badgeImage(n) : null);
  return true;
}

export function onDesktopNavigate(callback) {
  const api = bridge();
  return typeof api?.onNavigate === "function" ? api.onNavigate(callback) : () => {};
}

export function onDesktopUpdateReady(callback) {
  const api = bridge();
  return typeof api?.updates?.onReady === "function" ? api.updates.onReady(callback) : () => {};
}

export function installDesktopUpdate() {
  const api = bridge();
  if (typeof api?.updates?.install !== "function") return Promise.resolve(false);
  return api.updates.install();
}
