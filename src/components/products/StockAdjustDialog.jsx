import { useEffect, useRef, useState } from "react";
import ProductDialog from "./ProductDialog";
import { stockService } from "../../services/stockService";
export default function StockAdjustDialog({ product, onClose, onSaved }) {
  const [target, setTarget] = useState(String(product.stockQty)),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reserved, setReserved] = useState(null),
    [needsConfirm, setNeedsConfirm] = useState(false);
  const lock = useRef(false);

  // Unités déjà vendues (préparation non lancée) : encore comptées dans le stock.
  useEffect(() => {
    let active = true;
    stockService
      .getReserved(product.id)
      .then((data) => active && setReserved(data))
      .catch(() => active && setReserved(null));
    return () => {
      active = false;
    };
  }, [product.id]);

  const targetQty = /^\d+$/.test(target) ? Number(target) : null;
  const belowPaid = reserved && targetQty !== null && targetQty < reserved.paidQty;
  async function submit(e, { confirmBelowReserved = false } = {}) {
    e?.preventDefault?.();
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
        ...(confirmBelowReserved ? { confirmBelowReserved: true } : {}),
      });
      onSaved();
    } catch (e) {
      setNeedsConfirm(e.response?.data?.code === "STOCK_BELOW_RESERVED");
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
          {reserved && reserved.paidQty + reserved.pendingQty > 0 ? (
            <span className="mt-1 block text-xs text-gray-600">
              Dont déjà vendues, préparation non lancée :{" "}
              <strong>{reserved.paidQty}</strong> payée{reserved.paidQty > 1 ? "s" : ""}
              {reserved.pendingQty > 0 ? (
                <>
                  {" "}· <strong>{reserved.pendingQty}</strong> en attente de paiement
                </>
              ) : null}
              {reserved.paid.length > 0 ? (
                <span className="block font-mono text-[11px] text-gray-500">
                  {reserved.paid.map((o) => o.preorderNumber).join(", ")}
                </span>
              ) : null}
            </span>
          ) : null}
        </p>
        {belowPaid && !needsConfirm ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            En dessous de {reserved.paidQty}, la caisse ne pourra plus lancer les commandes déjà payées.
            Pour arrêter les ventes sans bloquer ces commandes, laissez au moins {reserved.paidQty} unité
            {reserved.paidQty > 1 ? "s" : ""}.
          </p>
        ) : null}
        {error && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
            {needsConfirm ? (
              <button
                type="button"
                disabled={busy}
                onClick={(event) => submit(event, { confirmBelowReserved: true })}
                className="mt-2 block rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Le produit manque physiquement : confirmer quand même
              </button>
            ) : null}
          </p>
        )}
        <label className="block text-xs font-medium text-gray-600">
          Nouvelle quantité
          <input
            autoFocus
            inputMode="numeric"
            value={target}
            disabled={busy}
            onChange={(e) => {
              setTarget(e.target.value);
              setNeedsConfirm(false);
            }}
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
