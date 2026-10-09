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
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            {error}
          </p>
        )}
        <label className="block text-xs font-medium text-gray-600">
          Pays source
          <select
            disabled={busy}
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              setDestinations([]);
              setPreview(null);
            }}
            className="mt-1 min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:bg-gray-50 disabled:opacity-50"
          >
            {countries.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-medium text-gray-600">
            Pays de destination
          </legend>
          {countries
            .filter((p) => p.code !== source)
            .map((p) => (
              <label
                key={p.code}
                className="flex items-center gap-2 text-sm text-gray-700"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 accent-[#FFC600]"
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
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 shrink-0 accent-[#FFC600]"
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
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Les nouveaux produits auront un stock de 0. Les stocks existants
          seront conservés. Les tarifs par grade renseignés dans le pays source
          seront copiés.
        </p>
        {preview && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p className="mb-2 font-semibold">Aperçu de la copie</p>
            {preview.countries.map((p) => (
              <p key={p.countryCode}>
                {p.countryCode} : {p.created} ajouts, {p.updated} mises à jour,{" "}
                {p.skipped} conservés
              </p>
            ))}
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-4">
          <button
            disabled={busy || !destinations.length}
            onClick={() => run(true)}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            Prévisualiser
          </button>
          {preview && (
            <button
              disabled={busy}
              onClick={() => run(false)}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black hover:bg-[#E6B200] focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
            >
              {busy ? "Copie…" : "Confirmer la copie"}
            </button>
          )}
        </div>
      </div>
    </ProductDialog>
  );
}
