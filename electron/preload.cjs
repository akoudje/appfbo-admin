const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopBridge", {
  openExternal: (url) => ipcRenderer.invoke("desktop:openExternal", url),
  isDesktop: true,
  authToken: {
    get: () => ipcRenderer.sendSync("desktop:authToken:getSync"),
    set: (token) => ipcRenderer.sendSync("desktop:authToken:setSync", token),
    clear: () => ipcRenderer.sendSync("desktop:authToken:clearSync"),
  },
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
