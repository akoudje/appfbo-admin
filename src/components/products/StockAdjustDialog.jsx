import { useRef, useState } from "react";
import ProductDialog from "./ProductDialog";
import { stockService } from "../../services/stockService";
export default function StockAdjustDialog({ product, onClose, onSaved }) {
  const [target, setTarget] = useState(String(product.stockQty)),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    if (!/^\d+$/.test(target) || !note.trim()) {
      setError(
        "Renseignez une quantité entière positive ou nulle et un motif.",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await stockService.adjustStock({
        productId: product.id,
        targetStockQty: Number(target),
        expectedStockQty: product.stockQty,
        note: note.trim(),
      });
      onSaved();
    } catch (e) {
      setError(e.response?.data?.message || "Impossible d’ajuster le stock.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ProductDialog title="Ajuster le stock" onClose={onClose} busy={busy}>
      <form onSubmit={submit} className="space-y-4">
        <p className="font-medium">
          {product.nom}{" "}
          <span className="text-sm text-gray-500">· {product.sku}</span>
        </p>
        <p className="rounded-xl bg-gray-50 p-3 text-sm">
          Stock actuel : <strong>{product.stockQty}</strong> unités
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <label className="block text-sm">
          Nouvelle quantité
          <input
            autoFocus
            inputMode="numeric"
            value={target}
            disabled={busy}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            required
          />
        </label>
        <label className="block text-sm">
          Motif de l’ajustement
          <textarea
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            required
            rows={3}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </label>
        <p className="text-xs text-gray-500">
          L’ajustement sera enregistré dans l’historique avec votre identité.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border px-4 py-2"
          >
            Annuler
          </button>
          <button
            disabled={
              busy || !note.trim() || target === String(product.stockQty)
            }
            className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold disabled:opacity-50"
          >
            {busy ? "Enregistrement…" : "Confirmer l’ajustement"}
          </button>
        </div>
      </form>
    </ProductDialog>
  );
}
