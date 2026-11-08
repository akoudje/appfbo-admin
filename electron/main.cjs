const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, ipcMain, shell, safeStorage, Notification, nativeImage } = require("electron");

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_START_URL || "http://127.0.0.1:5173";
const SECURE_STORE_FILE = "secure-store.json";
const AUTH_TOKEN_KEY = "adminToken";
const APP_USER_MODEL_ID = "com.foreverciv.admin";

// Les rappels « colis payés à lancer » doivent sonner sans clic préalable
// (fenêtre réduite, poste laissé ouvert) : pas de blocage autoplay ici.
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

// Une seule instance : deux fenêtres sonneraient chacune de leur côté.
const hasInstanceLock = app.requestSingleInstanceLock();
if (!hasInstanceLock) app.quit();

let mainWindow = null;
let pendingUpdateVersion = null;
const liveNotifications = new Set();

function revealMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function isAllowedExternalUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch (_error) {
    return false;
  }
}

function getSecureStorePath() {
  return path.join(app.getPath("userData"), SECURE_STORE_FILE);
}

function readSecureStore() {
  try {
    const storePath = getSecureStorePath();
    if (!fs.existsSync(storePath)) return {};

    const raw = fs.readFileSync(storePath, "utf8");
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeSecureStore(data) {
  const storePath = getSecureStorePath();
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2), "utf8");
}

function secureSetValue(key, value) {
  const store = readSecureStore();
  const normalized = String(value || "");

  if (!normalized) {
    delete store[key];
    writeSecureStore(store);
    return;
  }

  if (safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(normalized).toString("base64");
    store[key] = { cipher: "electron-safeStorage", value: encrypted };
  } else {
    store[key] = { cipher: "plain", value: normalized };
  }

  writeSecureStore(store);
}

function secureGetValue(key) {
  const store = readSecureStore();
  const entry = store[key];
  if (!entry || typeof entry !== "object") return null;

  if (entry.cipher === "electron-safeStorage") {
    try {
      if (!safeStorage.isEncryptionAvailable()) return null;
      const decrypted = safeStorage.decryptString(Buffer.from(String(entry.value || ""), "base64"));
      return decrypted || null;
    } catch (_error) {
      return null;
    }
  }

  if (entry.cipher === "plain") {
    return String(entry.value || "") || null;
  }

  return null;
}

function secureDeleteValue(key) {
  const store = readSecureStore();
  if (!Object.prototype.hasOwnProperty.call(store, key)) return;
  delete store[key];
  writeSecureStore(store);
}

function setupSecureAuthIpc() {
  ipcMain.on("desktop:authToken:getSync", (event) => {
    event.returnValue = secureGetValue(AUTH_TOKEN_KEY);
  });

  ipcMain.on("desktop:authToken:setSync", (event, token) => {
    secureSetValue(AUTH_TOKEN_KEY, token);
    event.returnValue = true;
  });

  ipcMain.on("desktop:authToken:clearSync", (event) => {
    secureDeleteValue(AUTH_TOKEN_KEY);
    event.returnValue = true;
  });
}

function setupAutoUpdates() {
  if (isDev) return;
  if (String(process.env.ELECTRON_AUTO_UPDATE_ENABLED || "true").toLowerCase() === "false") return;

  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (_error) {
    console.warn("[desktop] electron-updater non installé, auto-update ignoré.");
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("error", (error) => {
    console.error("[desktop] auto-update error:", error?.message || error);
  });

  autoUpdater.on("update-available", (info) => {
    console.log("[desktop] update available:", info?.version || "unknown");
  });

  autoUpdater.on("update-downloaded", (info) => {
    console.log("[desktop] update downloaded:", info?.version || "unknown");
    // Les postes restent ouverts toute la journée : on propose de redémarrer
    // plutôt que d'attendre la fermeture de l'application.
    pendingUpdateVersion = info?.version || "nouvelle version";
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("desktop:update-ready", { version: pendingUpdateVersion });
    }
  });

  ipcMain.handle("desktop:update:install", () => {
    if (!pendingUpdateVersion) return false;
    setImmediate(() => autoUpdater.quitAndInstall(false, true));
    return true;
  });

  autoUpdater
    .checkForUpdatesAndNotify()
    .catch((error) => console.error("[desktop] check update failed:", error?.message || error));

  setInterval(() => {
    autoUpdater
      .checkForUpdates()
      .catch((error) => console.error("[desktop] periodic check failed:", error?.message || error));
  }, 4 * 60 * 60 * 1000);
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: "#ffffff",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: isDev,
      // Fenêtre réduite : les minuteries des rappels et le son continuent.
      backgroundThrottling: false,
    },
  });
  mainWindow = win;
  win.on("focus", () => win.flashFrame(false));
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });
  win.webContents.on("did-finish-load", () => {
    if (pendingUpdateVersion) win.webContents.send("desktop:update-ready", { version: pendingUpdateVersion });
  });

  win.webContents.setWindowOpenHandler(({ url, frameName }) => {
    if (url === "about:blank" && frameName === "parcel-label") {
      return { action: "allow", overrideBrowserWindowOptions: { width: 850, height: 850, autoHideMenuBar: true, webPreferences: { preload: undefined, nodeIntegration: false, contextIsolation: true, sandbox: true } } };
    }
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
  });

  win.webContents.on("did-create-window", (child, details) => {
    if (details.frameName !== "parcel-label") return;
    child.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    child.webContents.on("will-navigate", (event) => event.preventDefault());
  });

  // Electron has no native Web Bluetooth chooser: pick the first Eleph-label
  // printer (P5_XXXX) found, or cancel the request after 15 s.
  let bluetoothChoice = null;
  function finishBluetoothChoice(deviceId) {
    if (!bluetoothChoice) return;
    clearTimeout(bluetoothChoice.timer);
    const { callback } = bluetoothChoice;
    bluetoothChoice = null;
    callback(deviceId);
  }
  win.webContents.on("select-bluetooth-device", (event, devices, callback) => {
    event.preventDefault();
    if (!bluetoothChoice) {
      bluetoothChoice = { callback, timer: setTimeout(() => finishBluetoothChoice(""), 15000) };
    }
    bluetoothChoice.callback = callback;
    const printer = devices.find((device) => /^P\d+[A-Z]*_[0-9A-F]{4}$/i.test(device.deviceName || ""));
    if (printer) finishBluetoothChoice(printer.deviceId);
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (isDev && url.startsWith(DEV_URL)) return;
    if (!isDev && url.startsWith("file://")) return;
    event.preventDefault();
  });

  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "index.html"), {
      hash: "/login",
    });
  }
}

ipcMain.handle("desktop:openExternal", async (_event, url) => {
  if (!isAllowedExternalUrl(url)) {
    throw new Error("URL externe invalide");
  }
  await shell.openExternal(url);
  return true;
});

// Rappels « colis payés à lancer » (voir LaunchRemindersProvider) :
//  - pastille du nombre de colis sur l'icône de la barre des tâches ;
//  - clignotement de l'icône au moment d'un rappel, arrêté dès que l'agent
//    revient sur la fenêtre ;
//  - notification Windows native ; un clic ramène la fenêtre sur la page
//    indiquée (espace caisse).
function setupAttentionIpc() {
  ipcMain.on("desktop:attention:badge", (_event, payload = {}) => {
    if (!mainWindow || mainWindow.isDestroyed() || process.platform !== "win32") return;
    const count = Number(payload.count || 0);
    if (count > 0 && typeof payload.imageDataUrl === "string" && payload.imageDataUrl.startsWith("data:image/png")) {
      mainWindow.setOverlayIcon(nativeImage.createFromDataURL(payload.imageDataUrl), `${count} colis payés à lancer`);
    } else {
      mainWindow.setOverlayIcon(null, "");
    }
  });

  ipcMain.on("desktop:attention:flash", () => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isFocused()) return;
    mainWindow.flashFrame(true);
  });

  ipcMain.handle("desktop:notify", (_event, payload = {}) => {
    if (!Notification.isSupported()) return false;
    const notification = new Notification({
      title: String(payload.title || "Forever Admin").slice(0, 120),
      body: String(payload.body || "").slice(0, 300),
      silent: true, // le son doux est joué par l'application elle-même
    });
    const route = typeof payload.route === "string" && payload.route.startsWith("/") ? payload.route : null;
    // Référence gardée jusqu'au clic ou à la fermeture : sinon le ramasse-miettes
    // supprime la notification et le clic n'est plus reçu (Windows).
    liveNotifications.add(notification);
    const release = () => liveNotifications.delete(notification);
    notification.on("click", () => {
      release();
      revealMainWindow();
      if (route && mainWindow) mainWindow.webContents.send("desktop:navigate", route);
    });
    notification.on("close", release);
    notification.show();
    setTimeout(release, 10 * 60 * 1000);
    return true;
  });

  ipcMain.on("desktop:appVersion:getSync", (event) => {
    event.returnValue = app.getVersion();
  });
}

app.on("second-instance", () => revealMainWindow());

app.whenReady().then(() => {
  if (!hasInstanceLock) return;
  if (process.platform === "win32") app.setAppUserModelId(APP_USER_MODEL_ID);
  setupSecureAuthIpc();
  setupAttentionIpc();
  setupAutoUpdates();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
