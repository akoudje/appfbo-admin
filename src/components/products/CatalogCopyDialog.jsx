import { useEffect, useRef, useState } from "react";
import api, { getCountryCode } from "../../services/api";
import { copyFromCountry } from "../../services/productsService";
import ProductDialog from "./ProductDialog";
export default function CatalogCopyDialog({ onClose, onSaved }) {
  const [countries, setCountries] = useState([]),
    [source, setSource] = useState(getCountryCode()),
    [destinations, setDestinations] = useState([]),
    [overwrite, setOverwrite] = useState(false),
    [preview, setPreview] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const abort = new AbortController();
    api
      .get("/admin/countries", { signal: abort.signal })
      .then((res) => setCountries(res.data.filter((p) => p.actif)))
      .catch(() => {
        if (!abort.signal.aborted) setError("Impossible de charger les pays.");
      });
    return () => abort.abort();
  }, []);
  async function run(dryRun) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await copyFromCountry({
        sourceCode: source,
        destinationCodes: destinations,
        overwrite,
        dryRun,
        previewToken: preview?.previewToken,
      });
      if (dryRun) setPreview(result);
      else
        onSaved(
          "Copie du catalogue terminée. Les stocks existants sont conservés.",
        );
    } catch (e) {
      setError(e.response?.data?.message || "Copie impossible.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ProductDialog
      title="Copier le catalogue vers d’autres pays"
      onClose={onClose}
      busy={busy}
    >
      <div className="space-y-4">
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <label className="block text-sm">
          Pays source
          <select
            disabled={busy}
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setDestinations([]);
              setPreview(null);
            }}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          >
            {countries.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            Pays de destination
          </legend>
          {countries
            .filter((p) => p.code !== source)
            .map((p) => (
              <label key={p.code} className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={destinations.includes(p.code)}
                  onChange={(e) => {
                    setDestinations((v) =>
                      e.target.checked
                        ? [...v, p.code]
                        : v.filter((code) => code !== p.code),
                    );
                    setPreview(null);
                  }}
                />
                {p.name} ({p.code})
              </label>
            ))}
        </fieldset>
        <label className="flex gap-2 text-sm">
          <input
            type="checkbox"
            disabled={busy}
            checked={overwrite}
            onChange={(e) => {
              setOverwrite(e.target.checked);
              setPreview(null);
            }}
          />
          Mettre aussi à jour les prix, limites et activations des produits déjà
          présents
        </label>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Les nouveaux produits auront un stock de 0. Les stocks existants
          seront conservés. Les tarifs par grade renseignés dans le pays source
          seront copiés.
        </p>
        {preview && (
          <div className="rounded-xl border p-3 text-sm">
            <p className="mb-2 font-semibold">Aperçu de la copie</p>
            {preview.countries.map((p) => (
              <p key={p.countryCode}>
                {p.countryCode} : {p.created} ajouts, {p.updated} mises à jour,{" "}
                {p.skipped} conservés
              </p>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button
            disabled={busy || !destinations.length}
            onClick={() => run(true)}
            className="rounded-lg border px-4 py-2 disabled:opacity-50"
          >
            Prévisualiser
          </button>
          {preview && (
            <button
              disabled={busy}
              onClick={() => run(false)}
              className="rounded-lg bg-yellow-400 px-4 py-2 font-semibold"
            >
              {busy ? "Copie…" : "Confirmer la copie"}
            </button>
          )}
        </div>
      </div>
    </ProductDialog>
  );
}
