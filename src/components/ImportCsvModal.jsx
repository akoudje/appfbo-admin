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
          <label className="cursor-pointer rounded-lg border px-3 py-2 text-sm">
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
            className="rounded-lg border px-3 py-2 text-sm"
          >
            Télécharger le modèle
          </button>
        </div>
        <label className="block text-sm">
          Contenu CSV
          <textarea
            rows={6}
            disabled={busy}
            value={text}
            onChange={(e) => change(e.target.value)}
            className="mt-1 w-full rounded-lg border p-3 font-mono text-xs"
            placeholder="sku;nom;prixBaseFcfa;cc;poidsKg"
          />
        </label>
        {(error || parsed.error) && (
          <p role="alert" className="text-sm text-red-700">
            {error || parsed.error}
          </p>
        )}
        {preview && (
          <div className="space-y-3 rounded-xl border p-3">
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
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Télécharger les erreurs
              </button>
            )}
            {shared && (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
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
        <div className="flex justify-end gap-2">
          <button
            disabled={busy || !parsed.rows.length || !!parsed.error}
            onClick={() => run(true)}
            className="rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            {busy ? "Traitement…" : "Prévisualiser"}
          </button>
          {preview && !preview.errors.length && (
            <button
              disabled={busy || (shared && !confirmed)}
              onClick={() => run(false)}
              className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold disabled:opacity-50"
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
