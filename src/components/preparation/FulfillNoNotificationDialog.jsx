// admin-app/src/components/preparation/FulfillNoNotificationDialog.jsx
// Boîte de dialogue de confirmation pour la clôture d'une commande (ou d'une sélection)
// sans notification SMS/email — remplace le window.confirm() natif du navigateur.

import { useEffect, useState } from "react";

function BellOffIcon() {
  return (
    <svg className="h-7 w-7 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.63 13A17.89 17.89 0 0118 8a6 6 0 00-9.33-5M6.26 6.26A5.86 5.86 0 006 8c0 7-3 9-3 9h14M18 8v0m-2.29 10.29a2 2 0 01-3.42 0M3 3l18 18"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function formatFcfa(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

/**
 * mode "single" : props.order est la commande ciblée.
 * mode "bulk"   : props.orders est la liste des commandes sélectionnées.
 */
export default function FulfillNoNotificationDialog({
  open,
  mode = "single",
  order = null,
  orders = [],
  busy = false,
  error = "",
  defaultNote = "",
  onCancel,
  onConfirm,
}) {
  // Le parent remonte ce composant (via une `key` liée à la commande ciblée)
  // à chaque nouvelle ouverture, donc cet état initial suffit à réinitialiser la note.
  const [note, setNote] = useState(defaultNote);

  useEffect(() => {
    if (!open) return undefined;
    const handleEsc = (e) => {
      if (e.key === "Escape" && !busy) onCancel?.();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const isBulk = mode === "bulk";
  const count = isBulk ? orders.length : 1;
  const totalAmount = isBulk
    ? orders.reduce((sum, row) => sum + Number(row?.totalFcfa || 0), 0)
    : Number(order?.totalFcfa || 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel?.()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="fulfill-no-notif-title"
      aria-describedby="fulfill-no-notif-description"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <BellOffIcon />
          </div>

          <h2 id="fulfill-no-notif-title" className="text-center text-lg font-semibold text-gray-900">
            Clôturer {isBulk ? `${count} commande${count > 1 ? "s" : ""}` : "sans notification"}
          </h2>
          <p id="fulfill-no-notif-description" className="mt-2 text-center text-sm text-gray-500">
            Aucun SMS ni email ne sera envoyé au FBO. À réserver aux colis déjà remis en main propre.
            Cette action reste tracée dans l'historique de la commande.
          </p>

          <div className="mt-5 rounded-xl border border-gray-100 bg-gray-50 p-4">
            {isBulk ? (
              <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                {orders.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-900">
                        {row.parcelNumber || row.preorderNumber || row.id}
                      </div>
                      <div className="truncate text-xs text-gray-500">{row.fboNomComplet || "—"}</div>
                    </div>
                    <div className="shrink-0 text-xs font-semibold text-gray-700">
                      {formatFcfa(row.totalFcfa)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium text-gray-900">
                    {order?.parcelNumber || order?.preorderNumber || order?.factureReference || order?.id}
                  </div>
                  <div className="truncate text-xs text-gray-500">
                    {order?.fboNomComplet || "—"} • FBO {order?.fboNumero || "—"}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-semibold text-gray-900">
                  {formatFcfa(order?.totalFcfa)}
                </div>
              </div>
            )}

            {isBulk ? (
              <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3 text-xs font-semibold text-gray-600">
                <span>Total</span>
                <span>{formatFcfa(totalAmount)}</span>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <label htmlFor="fulfill-no-notif-note" className="mb-1 block text-xs font-medium text-gray-700">
              Note de clôture (visible dans l'historique)
            </label>
            <textarea
              id="fulfill-no-notif-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={busy}
              rows={2}
              className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100"
              placeholder="Ex : commande remise en main propre au dépôt le..."
            />
          </div>

          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.(note)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Spinner />
                  <span>Clôture...</span>
                </>
              ) : (
                <span>Clôturer {isBulk ? `(${count})` : ""}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
