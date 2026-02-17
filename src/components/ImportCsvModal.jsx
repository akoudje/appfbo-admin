// ImportCsvModal.jsx

import { useMemo, useState } from "react";
import { importCsv } from "../services/productsService";

function parseCsv(text) {
  // CSV simple avec séparateur ; ou ,
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

function normalizeRow(r) {
  // Accepte colonnes: sku, nom, prixBaseFcfa, cc, poidsKg, actif, imageUrl
  const actifRaw = (r.actif ?? "").toString().trim().toLowerCase();
  const actif =
    actifRaw === "" ? true : ["1", "true", "oui", "yes", "y"].includes(actifRaw);

  return {
    sku: (r.sku ?? "").toString().trim(),
    nom: (r.nom ?? "").toString().trim(),
    prixBaseFcfa: Number((r.prixBaseFcfa ?? "").toString().trim()),
    cc: (r.cc ?? "").toString().trim(),
    poidsKg: (r.poidsKg ?? "").toString().trim(),
    actif,
    imageUrl: (r.imageUrl ?? "").toString().trim(),
  };
}

export default function ImportCsvModal({ open, onClose, onDone }) {
  const [rawText, setRawText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");

  const parsed = useMemo(() => parseCsv(rawText), [rawText]);
  const normalized = useMemo(() => parsed.rows.map(normalizeRow), [parsed.rows]);

  const preview = useMemo(() => normalized.slice(0, 5), [normalized]);

  const validate = (r) => {
    const e = [];
    if (!r.sku) e.push("sku");
    if (!r.nom) e.push("nom");
    if (!Number.isFinite(r.prixBaseFcfa) || r.prixBaseFcfa < 0) e.push("prixBaseFcfa");
    if (!r.cc || Number.isNaN(Number(r.cc))) e.push("cc");
    if (!r.poidsKg || Number.isNaN(Number(r.poidsKg))) e.push("poidsKg");
    return e;
  };

  const invalidCount = useMemo(
    () => normalized.filter((r) => validate(r).length).length,
    [normalized]
  );

  const submit = async () => {
    try {
      setBusy(true);
      setErr("");
      setResult(null);

      const rows = normalized.map((r) => ({
        ...r,
        imageUrl: r.imageUrl ? r.imageUrl : null,
      }));

      const res = await importCsv(rows);
      setResult(res);
      onDone?.();
    } catch (e) {
      setErr(e?.response?.data?.message || "Import échoué");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center justify-center p-3">
      <div className="w-full max-w-3xl card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold">Importer CSV</div>
          <button className="btn" onClick={onClose} type="button">Fermer</button>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Colonnes attendues : <span className="font-mono">sku, nom, prixBaseFcfa, cc, poidsKg, actif, imageUrl</span>
          <div className="text-xs text-gray-500 mt-1">
            Séparateur accepté : <b>;</b> ou <b>,</b>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs text-gray-500 mb-1">Colle ton CSV ici</div>
            <textarea
              className="input min-h-[220px] font-mono text-xs"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`sku;nom;prixBaseFcfa;cc;poidsKg;actif;imageUrl
123-ABC;Aloe Vera Gel;15000;0.482;3.300;true;https://...`}
            />
          </div>

          <div>
            <div className="card p-3">
              <div className="text-sm font-semibold">Aperçu (5 premières lignes)</div>
              <div className="text-xs text-gray-500 mt-1">
                Lignes: {normalized.length} • Invalides: {invalidCount}
              </div>

              <div className="mt-2 overflow-auto max-h-[190px]">
                <table className="w-full text-xs">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="text-left p-1">SKU</th>
                      <th className="text-left p-1">Nom</th>
                      <th className="text-left p-1">Prix</th>
                      <th className="text-left p-1">CC</th>
                      <th className="text-left p-1">Kg</th>
                      <th className="text-left p-1">Actif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, idx) => {
                      const v = validate(r);
                      return (
                        <tr key={idx} className="border-t">
                          <td className="p-1">{r.sku}</td>
                          <td className="p-1">{r.nom}</td>
                          <td className="p-1">{Number.isFinite(r.prixBaseFcfa) ? r.prixBaseFcfa : "—"}</td>
                          <td className="p-1">{r.cc || "—"}</td>
                          <td className="p-1">{r.poidsKg || "—"}</td>
                          <td className="p-1">
                            {String(r.actif)}
                            {v.length ? <span className="text-red-600 ml-2">(invalid: {v.join(",")})</span> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {err && <div className="text-sm text-red-600 mt-2">{err}</div>}

              {result && (
                <div className="mt-2 text-sm">
                  ✅ Import terminé — Créés: <b>{result.created}</b>, Mis à jour: <b>{result.updated}</b>, Erreurs: <b>{result.errors?.length || 0}</b>
                </div>
              )}

              <div className="mt-3 flex justify-end gap-2">
                <button className="btn" onClick={() => setRawText("")} disabled={busy}>
                  Vider
                </button>
                <button
                  className="btn-primary"
                  onClick={submit}
                  disabled={busy || normalized.length === 0}
                  title="Importe toutes les lignes (les invalides seront ignorées et retournées en erreurs)"
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
      </div>
    </div>
  );
}
