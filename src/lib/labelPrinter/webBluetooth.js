import { SERVICE, WRITE_CHAR, NOTIFY_CHAR } from "./elephProtocol.js";

export function webBluetoothSupport() {
  if (typeof navigator === "undefined" || !navigator.bluetooth)
    return "Ce navigateur ne gère pas le Bluetooth. Utilisez Chrome ou Edge sur ordinateur ou Android, ou l’application Forever Admin Desktop.";
  if (typeof window !== "undefined" && !window.isSecureContext)
    return "Le Bluetooth exige une connexion sécurisée (https).";
  return "";
}

// Eleph-label printers advertise as "<model>_<4 hex>" (e.g. P5_30FF) and
// expose the JX profile on BLE service 18F0 (write 2AF1, notify 2AF0).
// requestDevice must run from a click: connect() is only called from one.
export function createWebBluetoothTransport({ onDiagnostic = () => {} } = {}) {
  let device = null,
    writer = null,
    notifier = null,
    withResponse = false;
  return {
    async connect() {
      const unsupported = webBluetoothSupport();
      if (unsupported) throw new Error(unsupported);
      try {
        device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: "P5" }, { namePrefix: "P1_" }, { services: [SERVICE] }],
          optionalServices: [SERVICE],
        });
      } catch (error) {
        throw new Error(
          error?.name === "NotFoundError"
            ? "Aucune imprimante sélectionnée. Allumez la P5, fermez Eleph-label sur le téléphone et réessayez."
            : "Recherche Bluetooth impossible : " + (error?.message || "erreur inconnue"),
        );
      }
      const server = await device.gatt.connect();
      let service;
      try {
        service = await server.getPrimaryService(SERVICE);
        writer = await service.getCharacteristic(WRITE_CHAR);
        notifier = await service.getCharacteristic(NOTIFY_CHAR);
      } catch {
        device.gatt.disconnect();
        device = null;
        throw new Error("Cette imprimante n’expose pas le profil Eleph-label (P5) pris en charge.");
      }
      withResponse = Boolean(writer.properties.write);
      onDiagnostic(
        "Profil Eleph trouvé · écriture " + (withResponse ? "avec" : "sans") + " accusé" +
          (writer.properties.write && writer.properties.writeWithoutResponse ? " (sans accusé possible)" : "") +
          " · notifications " +
          [notifier.properties.notify && "N", notifier.properties.indicate && "I"].filter(Boolean).join("/"),
      );
      await notifier.startNotifications();
      // Web Bluetooth cannot read or request the MTU. Above the negotiated MTU,
      // Chrome on Windows falls back to long (prepared) writes, which stalled the
      // P5 mid-label. 20-byte writes always fit one ATT packet, as in TiMini-Print.
      return { id: device.id, name: device.name || "P5", mtu: 23, withResponse };
    },
    subscribe(callback) {
      const onValue = (event) => {
        const view = event.target.value;
        callback(new Uint8Array(view.buffer, view.byteOffset, view.byteLength).slice());
      };
      const onDisconnect = () => callback(null, new Error("disconnected"));
      notifier.addEventListener("characteristicvaluechanged", onValue);
      device.addEventListener("gattserverdisconnected", onDisconnect);
      const current = { notifier, device };
      return {
        remove() {
          current.notifier.removeEventListener("characteristicvaluechanged", onValue);
          current.device.removeEventListener("gattserverdisconnected", onDisconnect);
        },
      };
    },
    async write(bytes) {
      if (!device?.gatt.connected || !writer) throw new Error("Imprimante déconnectée.");
      if (withResponse) await writer.writeValueWithResponse(bytes);
      else await writer.writeValueWithoutResponse(bytes);
    },
    async disconnect() {
      const current = device;
      device = null;
      writer = null;
      notifier = null;
      if (current?.gatt.connected) current.gatt.disconnect();
    },
  };
}
