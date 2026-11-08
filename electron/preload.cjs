const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  openExternal: (url) => ipcRenderer.invoke("desktop:openExternal", url),
  isDesktop: true,
  authToken: {
    get: () => ipcRenderer.sendSync("desktop:authToken:getSync"),
    set: (token) => ipcRenderer.sendSync("desktop:authToken:setSync", token),
    clear: () => ipcRenderer.sendSync("desktop:authToken:clearSync"),
  },
  appVersion: ipcRenderer.sendSync("desktop:appVersion:getSync"),
  // Le son peut être joué sans clic préalable (voir main.cjs, autoplay-policy).
  autoplayAllowed: true,
  attention: {
    setBadge: (count, imageDataUrl) => ipcRenderer.send("desktop:attention:badge", { count, imageDataUrl }),
    flash: () => ipcRenderer.send("desktop:attention:flash"),
  },
  notify: (payload) => ipcRenderer.invoke("desktop:notify", payload),
  onNavigate: (callback) => {
    const listener = (_event, route) => callback(route);
    ipcRenderer.on("desktop:navigate", listener);
    return () => ipcRenderer.removeListener("desktop:navigate", listener);
  },
  updates: {
    onReady: (callback) => {
      const listener = (_event, info) => callback(info);
      ipcRenderer.on("desktop:update-ready", listener);
      return () => ipcRenderer.removeListener("desktop:update-ready", listener);
    },
    install: () => ipcRenderer.invoke("desktop:update:install"),
  },
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
