// src/components/marketing/HomeFeaturedEditor.jsx
// Visuels marketing > « Sélection produits » de la page d'accueil (pays
// courant) : section affichée ou non, produits choisis et leur ordre.
// Aucun produit choisi : le site prend un produit en stock par catégorie.

import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { marketingCampaignsService } from "../../services/marketingCampaignsService";
import { list as listProducts } from "../../services/productsService";

const formatFcfa = (value) => `${Number(value || 0).toLocaleString("fr-FR")} F`;

function availability(product) {
  if (!product) return { label: "Introuvable", tone: "text-red-700" };
  if (!product.actif) return { label: "Inactif : masqué", tone: "text-red-700" };
  if (Number(product.stockQty) <= 0) return { label: "En rupture : masqué", tone: "text-amber-700" };
  return { label: "Affiché", tone: "text-emerald-700" };
}

export default function HomeFeaturedEditor({ canWrite }) {
  const [state, setState] = useState({ loading: true, error: "" });
  const [enabled, setEnabled] = useState(true);
  const [productIds, setProductIds] = useState([]);
  const [saved, setSaved] = useState({ enabled: true, productIds: [] });
  const [maxProducts, setMaxProducts] = useState(10);
  const [catalog, setCatalog] = useState([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([marketingCampaignsService.getHomeFeatured(), listProducts({ take: 500 })])
      .then(([config, products]) => {
        if (!active) return;
        const ids = config.productIds || [];
        setEnabled(config.enabled !== false);
        setProductIds(ids);
        setSaved({ enabled: config.enabled !== false, productIds: ids });
        setMaxProducts(config.maxProducts || 10);
        setCatalog(Array.isArray(products) ? products : products?.items || []);
        setState({ loading: false, error: "" });
      })
      .catch((err) => active && setState({ loading: false, error: err?.response?.data?.message || "Chargement impossible." }));
    return () => {
      active = false;
    };
  }, []);

  const byId = useMemo(() => new Map(catalog.map((p) => [p.id, p])), [catalog]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return catalog
      .filter((p) => !productIds.includes(p.id) && `${p.nom} ${p.sku}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [catalog, productIds, query]);

  const dirty = enabled !== saved.enabled || productIds.join("|") !== saved.productIds.join("|");
  const full = productIds.length >= maxProducts;
  const locked = !canWrite || busy;

  const move = (index, delta) =>
    setProductIds((ids) => {
      const next = [...ids];
      const target = index + delta;
      if (target < 0 || target >= next.length) return ids;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const save = async () => {
    setBusy(true);
    setNotice("");
    try {
      const result = await marketingCampaignsService.saveHomeFeatured({ enabled, productIds });
      setSaved({ enabled: result.enabled !== false, productIds: result.productIds || [] });
      setProductIds(result.productIds || []);
      setNotice("Enregistré. Visible sur la page d'accueil d'ici 30 secondes.");
    } catch (err) {
      setNotice(err?.response?.data?.message || "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) return <p className="text-sm text-[#8d7a5c]">Chargement…</p>;
  if (state.error) return <p className="text-sm text-red-700">{state.error}</p>;

  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3">
        <input type="checkbox" checked={enabled} disabled={locked} onChange={(e) => setEnabled(e.target.checked)} className="mt-1 h-4 w-4 accent-[#FFC600]" />
        <span>
          <span className="block text-sm font-medium text-[#000000]">Afficher la section « Sélection produits »</span>
          <span className="block text-xs text-[#8d7a5c]">Décochée : la section n'apparaît plus sur la page d'accueil.</span>
        </span>
      </label>

      <div className={enabled ? "" : "pointer-events-none opacity-50"}>
        <div className="text-sm font-medium text-[#5D4B3C]">
          Produits affichés ({productIds.length}/{maxProducts})
        </div>
        <p className="text-xs text-[#8d7a5c]">
          Dans l'ordre de la liste. Les produits inactifs ou en rupture sont masqués automatiquement. Aucun produit choisi : un produit
          en stock par catégorie est affiché.
        </p>

        {productIds.length ? (
          <ol className="mt-3 divide-y divide-[#efe7d7] border border-[#e7dec8]">
            {productIds.map((id, index) => {
              const product = byId.get(id);
              const status = availability(product);
              return (
                <li key={id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-5 text-xs text-[#8d7a5c]">{index + 1}</span>
                  {product?.imageUrl ? <img src={product.imageUrl} alt="" className="h-10 w-10 bg-[#f6f2e8] object-contain" /> : <span className="h-10 w-10 bg-[#f6f2e8]" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-[#000000]">{product?.nom || "Produit supprimé"}</span>
                    <span className="block text-xs text-[#8d7a5c]">
                      Réf. {product?.sku || "—"} · {product ? formatFcfa(product.prixBaseFcfa) : ""} · <span className={status.tone}>{status.label}</span>
                    </span>
                  </span>
                  <button type="button" disabled={locked || index === 0} onClick={() => move(index, -1)} className="p-1.5 text-[#5D4B3C] disabled:opacity-30" aria-label="Monter">
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={locked || index === productIds.length - 1} onClick={() => move(index, 1)} className="p-1.5 text-[#5D4B3C] disabled:opacity-30" aria-label="Descendre">
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={locked} onClick={() => setProductIds((ids) => ids.filter((x) => x !== id))} className="p-1.5 text-red-700 disabled:opacity-30" aria-label="Retirer">
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 border border-dashed border-[#e7dec8] px-3 py-4 text-sm text-[#8d7a5c]">Sélection automatique (aucun produit choisi).</p>
        )}

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#8d7a5c]" aria-hidden="true" />
          <input
            value={query}
            disabled={locked || full}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={full ? `Maximum ${maxProducts} produits atteint` : "Ajouter un produit : nom ou référence…"}
            className="w-full border border-[#e7dec8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FFC600] focus:ring-4 focus:ring-[#FFC600]/20 disabled:bg-[#f6f2e8]"
          />
          {results.length ? (
            <ul className="absolute z-20 mt-1 w-full border border-[#e7dec8] bg-white shadow-lg">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setProductIds((ids) => (ids.length >= maxProducts ? ids : [...ids, p.id]));
                      setQuery("");
                    }}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-[#fff8e1]"
                  >
                    <Plus className="h-4 w-4 text-[#5D4B3C]" aria-hidden="true" />
                    <span className="flex-1 truncate">{p.nom}</span>
                    <span className="text-xs text-[#8d7a5c]">Réf. {p.sku} · <span className={availability(p).tone}>{availability(p).label}</span></span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={locked || !dirty}
          className="bg-[#FFC600] px-4 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Enregistrement…" : "Enregistrer la sélection"}
        </button>
        {dirty ? <span className="text-xs text-amber-700">Modifications non enregistrées</span> : null}
        {notice ? <span role="status" className="text-xs text-[#5D4B3C]">{notice}</span> : null}
      </div>
    </div>
  );
}
