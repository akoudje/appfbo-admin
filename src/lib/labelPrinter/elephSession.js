import * as wire from "./elephProtocol.js";

// Transport contract: connect(id) -> { id, name, mtu, withResponse },
// subscribe(callback(bytes, error)) -> { remove() }, write(bytes), disconnect().
function createElephSession(
  transport,
  {
    onState = () => {},
    onDiagnostic = () => {},
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    queryTimeout = 3000,
    settleMs = 1500,
  } = {},
) {
  let context = null,
    subscription = null,
    reader = wire.createReplyReader(),
    info = wire.DEFAULT_INFO,
    connected = false,
    printing = false,
    generation = 0,
    fault = null,
    lastError = null;
  const emit = (value) =>
    onState({
      ...value,
      connected,
      printing,
      info,
      device: context ? { id: context.id, name: context.name } : null,
    });
  function ensure(current) {
    if (current !== generation || !context)
      throw new Error("Connexion P5 interrompue. Vérifiez les étiquettes avant de relancer.");
    if (lastError) throw lastError;
    if (fault) {
      const errors = wire.statusErrors(fault);
      const error = new Error("La P5 signale : " + (errors.join(", ") || "une erreur") + ".");
      error.printerFault = true;
      throw error;
    }
  }
  function fail(error) {
    lastError = error instanceof Error ? error : new Error(String(error));
    connected = false;
    onDiagnostic("Échec · " + lastError.message);
    reader.cancel();
    emit({ phase: "error", message: lastError.message });
  }
  function notification(bytes, error) {
    if (error) {
      fail(new Error("Connexion Bluetooth interrompue. Vérifiez les étiquettes avant de relancer."));
      return;
    }
    onDiagnostic("RX " + bytes.length + " octets");
    for (const status of reader.push(bytes)) {
      onDiagnostic("Statut " + Array.from(status, (v) => v.toString(16).padStart(2, "0")).join(""));
      if (wire.statusErrors(status).length) fault = status;
    }
  }
  // With-response writes are acknowledged by the printer, so they can use the
  // full ATT payload. Without response, keep TiMini's proven 20 B / 30 ms pacing.
  async function write(bytes, current, onProgress) {
    const chunk = context.withResponse ? Math.max(20, Math.min(180, (context.mtu || 23) - 3)) : 20;
    const delay = context.withResponse ? 0 : 30;
    for (let at = 0; at < bytes.length; at += chunk) {
      ensure(current);
      try {
        await transport.write(bytes.slice(at, at + chunk));
      } catch (error) {
        if (bytes.length > chunk) onDiagnostic("Arrêt à " + at + " / " + bytes.length + " octets");
        throw error;
      }
      if (delay) await sleep(delay);
      onProgress?.(Math.min(100, Math.round(((at + chunk) * 100) / bytes.length)));
    }
  }
  async function query(kind, packet, current) {
    const reply = reader.expect(kind);
    let timer;
    const timeout = new Promise((resolve) => {
      timer = setTimeout(resolve, queryTimeout, null);
    });
    try {
      await write(packet, current);
      return await Promise.race([reply, timeout]);
    } finally {
      clearTimeout(timer);
      reader.cancel();
    }
  }
  async function disconnect() {
    generation++;
    connected = false;
    printing = false;
    subscription?.remove?.();
    subscription = null;
    reader.cancel();
    await transport.disconnect().catch(() => {});
    context = null;
    emit({ phase: "disconnected" });
  }
  async function connect(id) {
    if (printing) throw new Error("Une impression est en cours.");
    await disconnect();
    lastError = null;
    fault = null;
    info = wire.DEFAULT_INFO;
    reader = wire.createReplyReader();
    const current = generation;
    emit({ phase: "connecting" });
    onDiagnostic("Connexion Bluetooth demandée");
    try {
      context = await transport.connect(id);
      ensure(current);
      subscription = transport.subscribe(notification);
      // Android must enable the notification descriptor before the first query.
      await sleep(500);
      const record = await query("info", wire.DEVICE_INFO_QUERY, current);
      ensure(current);
      const parsed = wire.parseDeviceInfo(record);
      if (parsed) {
        info = parsed;
        onDiagnostic(
          "JXIG · largeur " + parsed.width + " pts · " + parsed.dotsPerMm + " pts/mm · mode " +
            parsed.mode + " · version " + parsed.version,
        );
      } else onDiagnostic("JXIG sans réponse · profil par défaut 384 pts, 8 pts/mm, TSPL");
      connected = true;
      emit({ phase: "connected" });
      return { ...context, info };
    } catch (error) {
      await disconnect();
      fail(error);
      throw error;
    }
  }
  async function print(raster, onProgress = () => {}) {
    if (printing) throw new Error("Une impression est déjà en cours.");
    if (!connected || !context) throw new Error("Connectez la P5 avant impression.");
    const job = wire.printJob(raster, info),
      current = generation;
    printing = true;
    fault = null;
    emit({ phase: "printing" });
    try {
      const before = await query("status", wire.STATUS_QUERY, current);
      if (before && wire.statusErrors(before).length) fault = before;
      ensure(current);
      onDiagnostic("Envoi " + raster.width + "×" + raster.height + " · " + job.length + " octets");
      const started = Date.now();
      await write(job, current, onProgress);
      onDiagnostic("Envoyé en " + ((Date.now() - started) / 1000).toFixed(1) + " s");
      await sleep(settleMs);
      const after = await query("status", wire.STATUS_QUERY, current);
      if (after && wire.statusErrors(after).length) fault = after;
      ensure(current);
      return { confirmed: Boolean(after) };
    } catch (error) {
      // Paper or cover faults keep the link: fix the printer, then print again.
      if (error.printerFault) fault = null;
      else if (current === generation) fail(error);
      throw error;
    } finally {
      printing = false;
      emit({ phase: connected ? "connected" : "error" });
    }
  }
  return {
    connect,
    disconnect,
    print,
    get connected() {
      return connected;
    },
    get printing() {
      return printing;
    },
    get info() {
      return info;
    },
  };
}

export { createElephSession };
