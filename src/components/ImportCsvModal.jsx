import { useMemo, useRef, useState } from "react";
import { importCsv } from "../services/productsService";
import {
  parseProductCsv,
  CSV_TEMPLATE,
  downloadText,
} from "../lib/products/productCsv";
import ProductDialog from "./products/ProductDialog";
function ImportForm({ onClose, onDone }) {
  const [text, setText] = useState(""),
    [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const lock = useRef(false);
  const parsed = useMemo(() => {
    try {
      return { rows: parseProductCsv(text) };
    } catch (e) {
      return { rows: [], error: e.message };
    }
  }, [text]);
  function change(value) {
    setText(value);
    setPreview(null);
    setConfirmed(false);
    setError("");
  }
  async function run(dryRun) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await importCsv(parsed.rows, {
        dryRun,
        confirmSharedChanges: confirmed,
        previewToken: preview?.previewToken,
      });
      if (dryRun) setPreview(result);
      else {
        onDone?.(
          `Import terminé : ${result.created} créations, ${result.updated} mises à jour.`,
        );
        onClose();
      }
    } catch (e) {
      setError(
        e.response?.data?.message || "Impossible de traiter le fichier.",
      );
      if (e.response?.data?.errors) setPreview(e.response.data);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const shared = preview?.rows?.some((row) => row.sharedChanges?.length);
  return (
    <ProductDialog title="Importer des produits" onClose={onClose} busy={busy}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Prévisualisez les changements avant de confirmer. Les colonnes
          absentes ou facultatives vides sont conservées. Le stock des produits
          existants ne sera pas modifié.
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-[#FFC600]/40">
            Choisir un fichier CSV
            <input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  setError("Fichier limité à 2 Mo.");
                  return;
                }
                change(await file.text());
                e.target.value = "";
              }}
            />
          </label>
          <button
            disabled={busy}
            onClick={() => downloadText(CSV_TEMPLATE, "modele-produits.csv")}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            Télécharger le modèle
          </button>
        </div>
        <label className="block text-xs font-medium text-gray-600">
          Contenu CSV
          <textarea
            rows={6}
            disabled={busy}
            value={text}
            onChange={(e) => change(e.target.value)}
            className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white p-3 font-mono text-xs text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:bg-gray-50 disabled:opacity-50"
            placeholder="sku;nom;prixBaseFcfa;cc;poidsKg"
          />
        </label>
        {(error || parsed.error) && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error || parsed.error}
          </p>
        )}
        {preview && (
          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-gray-700">
            <p className="text-sm font-semibold">
              {preview.created} créations · {preview.updated} mises à jour ·{" "}
              {preview.errors.length} erreurs
            </p>
            <div className="max-h-40 overflow-y-auto space-y-2 text-xs">
              {preview.rows?.map((row) => (
                <p key={row.line}>
                  Ligne {row.line} · {row.sku} ·{" "}
                  {row.action === "CREATE" ? "Création" : "Mise à jour"}
                  {row.stockIgnored ? " · Stock conservé" : ""}
                </p>
              ))}
              {preview.errors.map((row) => (
                <p key={row.index} className="text-red-700">
                  Ligne {row.index} · {row.sku} : {row.errors.join(", ")}
                </p>
              ))}
            </div>
            {preview.errors.length > 0 && (
              <button
                onClick={() =>
                  downloadText(
                    "Ligne;SKU;Erreur\n" +
                      preview.errors
                        .map((row) =>
                          [row.index, row.sku, row.errors.join(", ")]
                            .map(
                              (v) =>
                                '"' + String(v).replaceAll('"', '""') + '"',
                            )
                            .join(";"),
                        )
                        .join("\n"),
                    "erreurs-import.csv",
                  )
                }
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40"
              >
                Télécharger les erreurs
              </button>
            )}
            {shared && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#FFC600]"
                  disabled={busy}
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                Je confirme les changements des informations communes à tous les
                pays.
              </label>
            )}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
          <button
            disabled={busy || !parsed.rows.length || !!parsed.error}
            onClick={() => run(true)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            {busy ? "Traitement…" : "Prévisualiser"}
          </button>
          {preview && !preview.errors.length && (
            <button
              disabled={busy || (shared && !confirmed)}
              onClick={() => run(false)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black hover:bg-[#E6B200] focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
            >
              Confirmer l’import
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          1 000 lignes maximum. Les tarifs spécifiques se retirent depuis la
          fiche produit.
        </p>
      </div>
    </ProductDialog>
  );
}
export default function ImportCsvModal({ open, ...props }) {
  return open ? <ImportForm {...props} /> : null;
}
