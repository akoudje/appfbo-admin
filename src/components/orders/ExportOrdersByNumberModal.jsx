// src/components/orders/ExportOrdersByNumberModal.jsx
// Modal permettant de coller une liste de numéros de précommande (PO-XXX-...)
// et d'ouvrir l'export imprimable correspondant, quel que soit leur statut.

import { useEffect, useMemo, useState } from "react";

function parsePreorderNumbers(rawText) {
  return Array.from(
    new Set(
      String(rawText || "")
        .split(/[\s,;]+/)
        .map((n) => n.trim())
        .filter(Boolean),
    ),
  );
}

export default function ExportOrdersByNumberModal({ open, onClose }) {
  const [rawText, setRawText] = useState("");

  const handleClose = () => {
    setRawText("");
    onClose?.();
  };

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const numbers = useMemo(() => parsePreorderNumbers(rawText), [rawText]);

  if (!open) return null;

  const openExport = () => {
    if (numbers.length === 0) return;
    const params = new URLSearchParams();
    params.set("preorderNumbers", numbers.join(","));
    window.open(
      `/orders/submitted-export/print?${params.toString()}`,
      "_blank",
      "noreferrer",
    );
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-3"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Exporter des commandes par numéro
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Colle une liste de numéros de commande (ex: PO-CIV-20260914-0046),
              séparés par des espaces, virgules ou retours à la ligne.
              Fonctionne quel que soit leur statut.
            </div>
          </div>
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={handleClose}
            type="button"
          >
            Fermer
          </button>
        </div>

        <div className="p-4 space-y-3">
          <textarea
            className="w-full min-h-[180px] border border-gray-300 rounded-xl p-3 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`PO-CIV-20260914-0046\nPO-CIV-20260914-0111\nPO-CIV-20260914-0112`}
          />
          <div className="text-xs text-gray-600">
            {numbers.length} numéro{numbers.length > 1 ? "s" : ""} détecté
            {numbers.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={handleClose}
            type="button"
          >
            Annuler
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
            onClick={openExport}
            disabled={numbers.length === 0}
            type="button"
          >
            Générer l'export
          </button>
        </div>
      </div>
    </div>
  );
}
