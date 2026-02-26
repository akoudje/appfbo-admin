// src/components/ImportCsvModal.jsx

import { useEffect, useMemo, useState } from "react";
import { importCsv } from "../services/productsService";

function parseCsv(text) {
  const lines = text.replace(/\r/g, "").split("\n").filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const sep = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim());

  const rows = lines.slice(1).map((line) => {
    const cols = line.split(sep).map((c) => c.trim());
    const obj = {};
    headers.forEach((h, idx) => (obj[h] = cols[idx] ?? ""));
    return obj;
  });

  return { headers, rows };
}

function toBoolDefaultTrue(v) {
  const s = (v ?? "").toString().trim().toLowerCase();
  if (!s) return true;
  return ["1", "true", "oui", "yes", "y"].includes(s);
}

function toNullableString(v) {
  const s = (v ?? "").toString().trim();
  return s ? s : "";
}

function toNumberOrNaN(v) {
  const s = (v ?? "").toString().trim();
  if (s === "") return NaN;
  return Number(s);
}

function normalizeRow(r) {
  return {
    sku: toNullableString(r.sku),
    nom: toNullableString(r.nom),
    prixBaseFcfa: toNumberOrNaN(r.prixBaseFcfa),
    cc: toNullableString(r.cc),
    poidsKg: toNullableString(r.poidsKg),
    actif: toBoolDefaultTrue(r.actif),
    imageUrl: toNullableString(r.imageUrl),

    // ✅ nouveaux champs
    category: toNullableString(r.category) || "NON_CLASSE",
    stockQty:
      (r.stockQty ?? "").toString().trim() === ""
        ? "" // autorise vide => default serveur
        : toNumberOrNaN(r.stockQty),
    details: toNullableString(r.details),
  };
}

function extractApiErrorMessage(e) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Import échoué. Réessaie."
  );
}

function InlineAlert({ type = "success", title, message, onClose }) {
  const styles =
    type === "success"
      ? {
          wrap: "border-emerald-200 bg-emerald-50",
          title: "text-emerald-900",
          text: "text-emerald-800",
          icon: (
            <svg
              className="w-5 h-5 text-emerald-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ),
        }
      : {
          wrap: "border-red-200 bg-red-50",
          title: "text-red-900",
          text: "text-red-800",
          icon: (
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          ),
        };

  return (
    <div
      className={`border rounded-xl p-4 flex items-start gap-3 ${styles.wrap}`}
    >
      <div className="mt-0.5">{styles.icon}</div>
      <div className="flex-1 min-w-0">
        {title && (
          <div className={`text-sm font-semibold ${styles.title}`}>{title}</div>
        )}
        {message && (
          <div className={`text-sm mt-0.5 ${styles.text}`}>{message}</div>
        )}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function ImportCsvModal({ open, onClose, onDone }) {
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [banner, setBanner] = useState(null); // {type,title,message}

  const parsed = useMemo(() => parseCsv(rawText), [rawText]);
  const normalized = useMemo(() => parsed.rows.map(normalizeRow), [parsed.rows]);
  const preview = useMemo(() => normalized.slice(0, 5), [normalized]);

  const validate = (r) => {
    const e = [];
    if (!r.sku) e.push("sku");
    if (!r.nom) e.push("nom");

    if (!Number.isFinite(r.prixBaseFcfa) || r.prixBaseFcfa < 0)
      e.push("prixBaseFcfa");

    if (!r.cc || Number.isNaN(Number(r.cc))) e.push("cc");
    if (!r.poidsKg || Number.isNaN(Number(r.poidsKg))) e.push("poidsKg");

    // ✅ nouveaux champs
    if (!r.category) e.push("category");
    if (r.stockQty !== "") {
      const n = Number(r.stockQty);
      if (!Number.isFinite(n) || n < 0) e.push("stockQty");
      else if (!Number.isInteger(n)) e.push("stockQty(int)");
    }

    return e;
  };

  const invalidCount = useMemo(
    () => normalized.filter((r) => validate(r).length).length,
    [normalized],
  );

  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const close = () => {
    if (busy) return;
    onClose?.();
  };

  const submit = async () => {
    try {
      setBusy(true);
      setBanner(null);
      setResult(null);

      // ✅ prépare payload côté API (nullables)
      const rows = normalized.map((r) => ({
        sku: r.sku,
        nom: r.nom,
        prixBaseFcfa: Number(r.prixBaseFcfa),
        cc: r.cc,
        poidsKg: r.poidsKg,
        actif: Boolean(r.actif),

        imageUrl: r.imageUrl ? r.imageUrl : null,
        category: r.category || "NON_CLASSE",
        details: r.details ? r.details : null,
        stockQty:
          r.stockQty === "" || r.stockQty === null || r.stockQty === undefined
            ? 0
            : Number(r.stockQty),
      }));

      const res = await importCsv(rows);
      setResult(res);

      setBanner({
        type: "success",
        title: "Import terminé",
        message: `Créés: ${res?.created ?? 0} • Mis à jour: ${
          res?.updated ?? 0
        } • Erreurs: ${res?.errors?.length ?? 0}`,
      });

      onDone?.();
    } catch (e) {
      const msg = extractApiErrorMessage(e);
      setBanner({ type: "error", title: "Import échoué", message: msg });
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-3"
      onClick={(e) => e.target === e.currentTarget && close()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              Importer CSV
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Colonnes attendues :{" "}
              <span className="font-mono">
                sku, nom, prixBaseFcfa, cc, poidsKg, actif, imageUrl, category,
                stockQty, details
              </span>{" "}
              • séparateur <b>;</b> ou <b>,</b>
            </div>
          </div>

          <button
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            onClick={close}
            type="button"
            disabled={busy}
          >
            Fermer
          </button>
        </div>

        <div className="p-4 space-y-4">
          {banner && (
            <InlineAlert
              type={banner.type}
              title={banner.title}
              message={banner.message}
              onClose={() => setBanner(null)}
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">Colle ton CSV ici</div>
              <textarea
                className="w-full min-h-[240px] border border-gray-300 rounded-xl p-3 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={rawText}
                onChange={(e) => {
                  setRawText(e.target.value);
                  if (banner) setBanner(null);
                }}
                disabled={busy}
                placeholder={`sku;nom;prixBaseFcfa;cc;poidsKg;actif;imageUrl;category;stockQty;details
123-ABC;Aloe Vera Gel;15000;0.482;3.300;true;https://...;BUVABLE;12;Gel à boire...`}
              />
              <div className="mt-2 flex gap-2">
                <button
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  onClick={() => {
                    if (busy) return;
                    setRawText("");
                    setResult(null);
                    setBanner(null);
                  }}
                  disabled={busy}
                  type="button"
                >
                  Vider
                </button>
              </div>
            </div>

            <div className="border border-gray-200 rounded-2xl p-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">
                  Aperçu (5 premières lignes)
                </div>
                <div className="text-xs text-gray-600">
                  Lignes: <b>{normalized.length}</b> • Invalides:{" "}
                  <b className={invalidCount ? "text-rose-700" : ""}>
                    {invalidCount}
                  </b>
                </div>
              </div>

              <div className="mt-2 overflow-auto max-h-[240px] bg-white rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="text-gray-500 bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left p-2">SKU</th>
                      <th className="text-left p-2">Nom</th>
                      <th className="text-left p-2">Prix</th>
                      <th className="text-left p-2">Catégorie</th>
                      <th className="text-left p-2">Stock</th>
                      <th className="text-left p-2">Actif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, idx) => {
                      const v = validate(r);
                      const stockPreview =
                        r.stockQty === "" ? "—" : String(r.stockQty);
                      return (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="p-2 font-mono">{r.sku || "—"}</td>
                          <td className="p-2">{r.nom || "—"}</td>
                          <td className="p-2">
                            {Number.isFinite(r.prixBaseFcfa)
                              ? r.prixBaseFcfa
                              : "—"}
                          </td>
                          <td className="p-2">{r.category || "—"}</td>
                          <td className="p-2">{stockPreview}</td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border ${
                                r.actif
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {String(r.actif)}
                            </span>
                            {v.length ? (
                              <span className="text-rose-700 ml-2">
                                (invalid: {v.join(",")})
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                    {normalized.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-4 text-center text-gray-500">
                          Colle un CSV pour voir l’aperçu.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {result?.errors?.length ? (
                <div className="mt-2 text-xs text-rose-700">
                  ⚠️ {result.errors.length} ligne(s) en erreur (voir retour API).
                </div>
              ) : null}

              <div className="mt-3 flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  onClick={submit}
                  disabled={busy || normalized.length === 0}
                  title="Importe toutes les lignes (les invalides seront ignorées et retournées en erreurs)"
                  type="button"
                >
                  {busy ? "Import..." : "Importer"}
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                Le serveur fait un <b>upsert par SKU</b>.
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Astuce : mets <b>category</b> (ex: BUVABLE) et <b>stockQty</b> (entier
            ≥ 0). Pour l’image, privilégie l’upload sur la page d’édition.
          </div>
          <button
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            onClick={close}
            type="button"
            disabled={busy}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}