// Fermeture de caisse : montre d'abord ce qui va se passer, puis exige une
// confirmation explicite avant d'annuler les préfactures non payées.
//
// Origine : le 04/11/2026, 23 commandes servies et payées en espèces ont été
// annulées par la fermeture, l'argent n'ayant pas encore été saisi. Une
// alerte ne peut pas repérer des espèces non saisies ; seul l'agent le sait,
// d'où cette vérification au moment de fermer.

import { useEffect, useState } from "react";
import { cashRegisterStatusService } from "../../services/cashRegisterStatusService";
import { formatWait, waitMinutes } from "../../lib/launchReminders";

function formatFcfa(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function modeLabel(mode) {
  const map = {
    ESPECES: "Espèces",
    WAVE: "Wave",
    ORANGE_MONEY: "Orange Money",
    BANK_TRANSFER: "Virement",
    ECOBANK_PAY: "Ecobank Pay",
    PI_SPI: "PI SPI",
  };
  return map[String(mode || "").toUpperCase()] || mode || "—";
}

// Monté seulement quand la fermeture est demandée (voir
// CashRegisterStatusPanel) : chaque ouverture repart d'un état vierge et
// recharge la liste.
export default function CloseRegisterDialog({ open = true, isPersonal, busy, onCancel, onConfirm }) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loadedAt, setLoadedAt] = useState(0);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    cashRegisterStatusService
      .preview()
      .then((res) => {
        if (cancelled) return;
        setPreview(res?.preview || null);
        setLoadedAt(Date.now());
      })
      .catch(() => {
        if (!cancelled) setPreviewError("La liste des commandes concernées n’a pas pu être chargée.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const toCancel = preview?.toCancel || [];
  const paidNotLaunched = preview?.paidNotLaunched || [];
  // Sans aperçu (erreur), on reste prudent : confirmation exigée.
  const needsConfirmation = previewError ? true : toCancel.length > 0;
  const canSubmit = !loading && !busy && (!needsConfirmation || confirmed);
  const label = isPersonal ? "ma caisse" : "la caisse";

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="close-register-title"
          className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl"
        >
          <div className="border-b border-gray-100 p-4">
            <h3 id="close-register-title" className="text-base font-semibold text-gray-900">
              Fermer {label} ?
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Vérifiez la liste ci-dessous avant de fermer. Les préfactures non payées seront annulées
              {isPersonal ? " (seulement les vôtres)" : ""} et les clients devront resoumettre leur précommande.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
            {loading ? <p className="text-gray-500">Chargement des commandes concernées…</p> : null}
            {previewError ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">{previewError}</p>
            ) : null}

            {preview ? (
              <section>
                <h4 className="font-semibold text-gray-900">
                  {toCancel.length === 0
                    ? "Aucune préfacture à annuler."
                    : `${toCancel.length} préfacture${toCancel.length > 1 ? "s" : ""} non payée${toCancel.length > 1 ? "s" : ""} sera${toCancel.length > 1 ? "ont" : ""} annulée${toCancel.length > 1 ? "s" : ""} · ${formatFcfa(preview.toCancelAmountFcfa)}`}
                </h4>
                {toCancel.length > 0 ? (
                  <div className="mt-2 overflow-hidden rounded-xl border border-gray-200">
                    <table className="min-w-full text-xs">
                      <thead className="bg-gray-50 text-left uppercase tracking-wide text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Commande</th>
                          <th className="px-3 py-2">Client</th>
                          <th className="px-3 py-2">Paiement</th>
                          <th className="px-3 py-2 text-right">Montant</th>
                        </tr>
                      </thead>
                      <tbody>
                        {toCancel.map((row) => {
                          const isCash = row.preorderPaymentMode === "ESPECES";
                          return (
                            <tr key={row.id} className={`border-t border-gray-100 ${isCash ? "bg-amber-50" : ""}`}>
                              <td className="px-3 py-2">
                                <div className="font-semibold text-gray-900">{row.label}</div>
                                {row.factureReference ? <div className="text-gray-500">AS400 {row.factureReference}</div> : null}
                              </td>
                              <td className="px-3 py-2 text-gray-700">{row.fboNomComplet || "—"}</td>
                              <td className={`px-3 py-2 ${isCash ? "font-semibold text-amber-900" : "text-gray-700"}`}>
                                {modeLabel(row.preorderPaymentMode)}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatFcfa(row.amountFcfa)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </section>
            ) : null}

            {paidNotLaunched.length > 0 ? (
              <section className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-blue-900">
                <div className="font-semibold">
                  {paidNotLaunched.length} colis payé{paidNotLaunched.length > 1 ? "s" : ""} pas encore lancé{paidNotLaunched.length > 1 ? "s" : ""} en préparation
                </div>
                <div className="mt-1 text-xs">
                  Ils ne seront pas annulés, mais restent à certifier et lancer :{" "}
                  {paidNotLaunched
                    .slice(0, 8)
                    .map((row) => {
                      const minutes = waitMinutes(row.paidAt, loadedAt);
                      return minutes === null ? row.label : `${row.label} (${formatWait(minutes)})`;
                    })
                    .join(", ")}
                  {paidNotLaunched.length > 8 ? `, et ${paidNotLaunched.length - 8} autre(s)` : ""}.
                </div>
              </section>
            ) : null}

            {needsConfirmation ? (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-300 p-3">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-gray-900"
                />
                <span className="text-gray-800">
                  Je confirme qu’aucun de ces clients n’a payé en espèces sans que l’encaissement soit saisi.
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Si un client a payé, enregistrez d’abord l’encaissement avec « Encaisser », puis fermez la caisse.
                  </span>
                </span>
              </label>
            ) : null}
          </div>

          <div className="flex justify-end gap-2 border-t border-gray-100 p-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onConfirm({ confirmNoUnrecordedCash: needsConfirmation && confirmed })}
              disabled={!canSubmit}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Fermeture…" : `Fermer ${label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
