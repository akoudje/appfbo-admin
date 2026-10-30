import { useEffect, useRef, useState } from "react";
import { Bluetooth, Loader2, Printer, X } from "lucide-react";
import { FORMATS, DEFAULT_FORMAT, labelDimensions } from "../../lib/labelPrinter/p5Layout.js";
import { defaultLabelDestination, labelData, renderLabel, testLabelData } from "../../lib/labelPrinter/p5Label.js";
import { p5Printer, useP5Printer } from "../../lib/labelPrinter/p5Printer.js";
import { webBluetoothSupport } from "../../lib/labelPrinter/webBluetooth.js";

const FORMAT_STORAGE_KEY = "p5-label-format-v1";
const SHIPPING_MODES = ["EXPEDITION_POSTE", "EXPEDITION_CODITRANS"];

function readFormat() {
  try {
    const stored = window.localStorage.getItem(FORMAT_STORAGE_KEY);
    return FORMATS[stored] ? stored : DEFAULT_FORMAT;
  } catch {
    return DEFAULT_FORMAT;
  }
}

// Same QR target as the printable parcel label (utils/parcelLabel.js).
function orderUrl(order) {
  const origin = window.location.protocol === "file:"
    ? import.meta.env.VITE_ADMIN_PUBLIC_URL || "https://admin.forevercivstore.com"
    : window.location.origin;
  return new URL(`/orders/${encodeURIComponent(order.id)}`, origin).href;
}

// Mounted only while open, so its fields start from the order once and are not
// reset by background reloads of the order.
export default function P5PrintDialog({ order, onClose }) {
  const printer = useP5Printer();
  const [format, setFormat] = useState(readFormat);
  const [count, setCount] = useState("1");
  const [destination, setDestination] = useState(() => defaultLabelDestination(order));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [awaitingTest, setAwaitingTest] = useState(false);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const previewRef = useRef(null);
  const delivery = SHIPPING_MODES.includes(order?.deliveryMode) || order?.deliveryMode === "LIVRAISON";
  const unsupported = webBluetoothSupport();

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [busy, onClose]);

  if (!order) return null;

  const chooseFormat = (next) => {
    setFormat(next);
    try {
      window.localStorage.setItem(FORMAT_STORAGE_KEY, next);
    } catch {
      /* Storage can be unavailable (private mode). */
    }
  };

  const showPreview = (canvas) => {
    const host = previewRef.current;
    if (!host) return;
    canvas.className = "mx-auto h-auto max-w-full border border-gray-300 bg-white [image-rendering:pixelated]";
    canvas.style.width = Math.round(canvas.width * 0.9) + "px";
    host.replaceChildren(canvas);
  };

  const run = async (action) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (next) {
      setError(next?.message || "Impossible de communiquer avec la P5.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const connect = () =>
    run(async () => {
      await p5Printer.connect();
      setNotice("P5 connectée. Imprimez le test si ce n’est pas encore fait pour ce rouleau.");
    });

  const printTest = () =>
    run(async () => {
      const { canvas, raster } = renderLabel(testLabelData(), labelDimensions(format, p5Printer.info), "FOREVER P5 TEST");
      showPreview(canvas);
      await p5Printer.print(raster, setProgress);
      setAwaitingTest(true);
    });

  const printLabels = () =>
    run(async () => {
      const total = Number(count);
      labelData(order, { destination, count: total }, 1);
      const dimensions = labelDimensions(format, p5Printer.info);
      for (let index = 1; index <= total; index++) {
        setNotice(`Étiquette ${index} / ${total}`);
        const { canvas, raster } = renderLabel(labelData(order, { destination, count: total }, index), dimensions, orderUrl(order));
        showPreview(canvas);
        await p5Printer.print(raster, setProgress);
      }
      setNotice(`${total} étiquette(s) imprimée(s). Vérifiez le résultat.`);
    });

  const confirmTest = (ok) => {
    setAwaitingTest(false);
    p5Printer.setValidated(ok);
    if (ok) setNotice("Test validé. Vous pouvez imprimer les étiquettes de colis.");
    else setError("Test non validé. Vérifiez que le format choisi correspond au rouleau, puis réessayez.");
  };

  const info = printer.info;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(event) => event.target === event.currentTarget && !busy && onClose?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="p5-print-title"
    >
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="p5-print-title" className="text-base font-semibold text-gray-900">Étiquette P5 Bluetooth</h3>
            <p className="mt-1 text-xs text-gray-600">
              Imprimante Eleph-label P5. Fermez Eleph-label sur le téléphone avant de connecter.
            </p>
          </div>
          <button type="button" aria-label="Fermer" disabled={busy} onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-40">
            <X size={18} />
          </button>
        </div>

        {unsupported ? (
          <p role="alert" className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{unsupported}</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              <span className="flex items-center gap-2 text-gray-700">
                <Bluetooth size={16} className={printer.connected ? "text-emerald-600" : "text-gray-400"} />
                {printer.connected
                  ? `${printer.device?.name || "P5"}${info?.known ? ` · tête ${Math.round(info.width / info.dotsPerMm)} mm` : ""}`
                  : printer.phase === "connecting" ? "Connexion…" : "Non connectée"}
              </span>
              {printer.connected ? (
                <button type="button" disabled={busy} onClick={() => p5Printer.disconnect()} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-40">
                  Déconnecter
                </button>
              ) : (
                <button type="button" disabled={busy} onClick={connect} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-40">
                  Connecter la P5
                </button>
              )}
            </div>

            <fieldset>
              <legend className="text-xs font-semibold uppercase tracking-wide text-gray-600">Format du rouleau</legend>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {Object.entries(FORMATS).map(([key, spec]) => (
                  <label key={key} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${format === key ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-900"}`}>
                    <input type="radio" name="p5-format" value={key} checked={format === key} disabled={busy} onChange={() => chooseFormat(key)} className="sr-only" />
                    {spec.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-[110px_1fr] gap-3">
              <label className="text-sm">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Colis</span>
                <input type="number" min="1" max="50" step="1" value={count} disabled={busy} onChange={(event) => setCount(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
              </label>
              {delivery ? (
                <label className="text-sm">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">Adresse de livraison</span>
                  <input value={destination} maxLength={180} disabled={busy} onChange={(event) => setDestination(event.target.value)} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" />
                </label>
              ) : null}
            </div>

            <div ref={previewRef} aria-label="Aperçu de l’étiquette" className="empty:hidden rounded-lg bg-gray-100 p-3" />

            {awaitingTest ? (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                <p>Le texte et le QR tiennent-ils sur une seule étiquette ?</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => confirmTest(true)} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white">Oui, valider</button>
                  <button type="button" onClick={() => confirmTest(false)} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold">Non</button>
                </div>
              </div>
            ) : null}

            {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
            {notice ? <p role="status" className="text-sm text-emerald-700">{notice}</p> : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" disabled={busy || !printer.connected} onClick={printTest} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 disabled:opacity-40">
                Imprimer un test
              </button>
              <button type="button" disabled={busy || !printer.connected || !printer.validated} onClick={printLabels} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                {busy && progress ? `Transfert ${progress} %` : "Imprimer les étiquettes"}
              </button>
            </div>
            {printer.connected && !printer.validated ? (
              <p className="text-right text-xs text-amber-700">Validez d’abord le test imprimé.</p>
            ) : null}

            <details open={showDiagnostic} onToggle={(event) => setShowDiagnostic(event.currentTarget.open)} className="text-xs text-gray-600">
              <summary className="cursor-pointer">Diagnostic Bluetooth</summary>
              <p className="mt-1">Sans données de commande. À transmettre en cas de problème.</p>
              <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-gray-100 p-2 font-mono">{p5Printer.diagnostic() || "—"}</pre>
              <button type="button" onClick={() => navigator.clipboard?.writeText(p5Printer.diagnostic()).catch(() => {})} className="mt-2 rounded border border-gray-300 px-2 py-1">
                Copier
              </button>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
