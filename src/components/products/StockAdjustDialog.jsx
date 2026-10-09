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
        <p className="break-words font-semibold text-gray-900">
          {product.nom}{" "}
          <span className="text-sm text-gray-500">· {product.sku}</span>
        </p>
        <p className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
          Stock actuel : <strong>{product.stockQty}</strong> unités
        </p>
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <label className="block text-xs font-medium text-gray-600">
          Nouvelle quantité
          <input
            autoFocus
            inputMode="numeric"
            value={target}
            disabled={busy}
            onChange={(e) => setTarget(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:bg-gray-50 disabled:opacity-50"
            required
          />
        </label>
        <label className="block text-xs font-medium text-gray-600">
          Motif de l’ajustement
          <textarea
            value={note}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            required
            rows={3}
            className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:bg-gray-50 disabled:opacity-50"
          />
        </label>
        <p className="text-xs text-gray-500">
          L’ajustement sera enregistré dans l’historique avec votre identité.
        </p>
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            disabled={
              busy || !note.trim() || target === String(product.stockQty)
            }
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black hover:bg-[#E6B200] focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            {busy ? "Enregistrement…" : "Confirmer l’ajustement"}
          </button>
        </div>
      </form>
    </ProductDialog>
  );
}
