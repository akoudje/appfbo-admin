import { useSyncExternalStore } from "react";
import { createElephSession } from "./elephSession.js";
import { createWebBluetoothTransport } from "./webBluetooth.js";

// One Bluetooth link for the whole admin tab, so the P5 stays connected while
// the preparer moves from one order to the next.
const STORE = "p5-printer-v1";
const listeners = new Set();
let diagnostic = [];
let snapshot = { connected: false, printing: false, phase: "disconnected", info: null, device: null, validated: false };

function readValidated() {
  try {
    return JSON.parse(window.localStorage.getItem(STORE) || "{}");
  } catch {
    return {};
  }
}
function publish(patch) {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}
function record(message) {
  diagnostic = [...diagnostic, new Date().toISOString().slice(11, 19) + " " + message].slice(-100);
  publish({});
}

const session = createElephSession(createWebBluetoothTransport({ onDiagnostic: record }), {
  onDiagnostic: record,
  onState: (next) => {
    const saved = readValidated();
    publish({ ...next, validated: Boolean(next.device && saved.name === next.device.name && saved.validated) });
  },
});

export const p5Printer = {
  async connect() {
    diagnostic = ["Forever Admin · P5 Eleph-label · " + navigator.userAgent.split(") ")[0] + ")"];
    return session.connect();
  },
  disconnect: () => session.disconnect(),
  print: (raster, onProgress) => session.print(raster, onProgress),
  get info() {
    return session.info;
  },
  setValidated(validated) {
    try {
      window.localStorage.setItem(STORE, JSON.stringify({ name: snapshot.device?.name, validated }));
    } catch {
      /* Storage can be unavailable (private mode). */
    }
    publish({ validated });
  },
  diagnostic: () => diagnostic.join("\n"),
};

export function useP5Printer() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => snapshot,
  );
}
