const fs = require("fs");
const path = require("path");
const { app, BrowserWindow, ipcMain, shell, safeStorage } = require("electron");

const isDev = !app.isPackaged;
const DEV_URL = process.env.ELECTRON_START_URL || "http://127.0.0.1:5173";
const SECURE_STORE_FILE = "secure-store.json";
const AUTH_TOKEN_KEY = "adminToken";

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
    },
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url).catch(() => {});
    }
    return { action: "deny" };
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

app.whenReady().then(() => {
  setupSecureAuthIpc();
  setupAutoUpdates();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
