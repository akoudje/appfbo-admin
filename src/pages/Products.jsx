import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  Search,
  Plus,
  RefreshCw,
  Download,
  Package,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as products from "../services/productsService";
import useAdminAuth from "../hooks/useAdminAuth";
import { getCountryCode } from "../services/api";
import { Permission } from "../auth/permissions";
import { useConfirm } from "../hooks/useDialogs";
import useOrdersScope, { ordersScopeKey } from "../hooks/orders/useOrdersScope";
import {
  CATEGORIES,
  categoryLabel,
  readFilters,
  filterSearch,
} from "../lib/products/productModel";
import { normalizeProductsResponse } from "../lib/products/productListResponse";
import { formatFcfa } from "../lib/format";
import ProductThumb from "../components/ProductThumb";
import ImportCsvModal from "../components/ImportCsvModal";
import ProductDialog from "../components/products/ProductDialog";
import StockAdjustDialog from "../components/products/StockAdjustDialog";
import CatalogCopyDialog from "../components/products/CatalogCopyDialog";
import ProductHistory from "../components/products/ProductHistory";
const control =
  "h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50";
const secondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50";
const views = [
  ["all", "Tous", {}],
  ["active", "Actifs", { actif: "true" }],
  ["inactive", "Inactifs", { actif: "false" }],
  ["out", "Ruptures", { stock: "out" }],
  ["low", "Stock faible", { stock: "low" }],
  ["incomplete", "À compléter", { incomplete: "true" }],
];
const emptyData = { items: [], totalCount: 0, stats: {} };
function Actions({ product, canWrite, edit, toggle, stock, details, busy }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => details(product)}
        className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 hover:border-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40"
      >
        Consulter
      </button>
      {canWrite && (
        <>
          <button
            disabled={busy}
            onClick={() => edit(product)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 hover:border-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            Modifier
          </button>
          <button
            disabled={busy}
            onClick={() => stock(product)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 hover:border-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            Ajuster le stock
          </button>
          <button
            disabled={busy}
            onClick={() => toggle(product)}
            className={`rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold hover:border-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50 ${product.actif ? "text-red-700" : "text-green-700"}`}
          >
            {product.actif ? "Désactiver" : "Réactiver"}
          </button>
        </>
      )}
    </div>
  );
}
function ProductIdentity({ product }) {
  return (
    <div className="flex items-center gap-3">
      <ProductThumb
        url={product.imageUrl}
        alt={product.nom}
        className="h-12 w-12 shrink-0 rounded-lg border border-gray-200 bg-white object-contain"
      />
      <div className="min-w-0">
        <p className="break-words font-semibold text-gray-900">{product.nom}</p>
        <p className="mt-1 font-mono text-xs text-gray-500">{product.sku}</p>
      </div>
    </div>
  );
}
function Status({ product }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs ${product.actif ? "bg-green-50 text-green-800" : "bg-gray-100 text-gray-600"}`}
    >
      {product.actif ? "Actif" : "Inactif"}
    </span>
  );
}
function Stock({ product }) {
  const qty = Number(product.stockQty);
  return (
    <span
      className={`text-sm font-medium ${qty === 0 ? "text-red-700" : qty <= 5 ? "text-amber-700" : "text-gray-800"}`}
    >
      {qty} unités{qty === 0 ? " · Rupture" : qty <= 5 ? " · Faible" : ""}
    </span>
  );
}
export default function Products() {
  const navigate = useNavigate(),
    location = useLocation(),
    [search, setSearch] = useSearchParams(),
    scope = useOrdersScope(),
    confirm = useConfirm();
  const query = readFilters(search.toString()),
    queryKey = filterSearch(query),
    country = getCountryCode(),
    { admin: actor, permissions } = useAdminAuth();
  const canWrite = permissions.includes(Permission.PRODUCT_WRITE),
    canExport = permissions.includes(Permission.EXPORT_READ);
  const [data, setData] = useState(emptyData),
    [loadedKey, setLoadedKey] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(location.state?.toast || ""),
    [retry, setRetry] = useState(0),
    [dialog, setDialog] = useState(null),
    [dialogScope, setDialogScope] = useState(scope),
    [selected, setSelected] = useState(null),
    [busy, setBusy] = useState(false);
  const operation = useRef(false),
    current = useRef("");
  const key = `${scope}:${queryKey}`;
  const visible = loadedKey === key ? data : emptyData;
  const rawSearch = search.toString();
  useEffect(() => {
    if (rawSearch !== queryKey) setSearch(queryKey, { replace: true });
  }, [rawSearch, queryKey, setSearch]);
  useEffect(() => {
    current.current = key;
    return () => {
      current.current = "";
    };
  }, [key]);
  useEffect(() => {
    setDialog(null);
    setSelected(null);
  }, [scope]);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(
      () => {
        products
          .list(
            { ...readFilters(queryKey), take: 500 },
            { signal: abort.signal },
          )
          .then((payload) => {
            if (!abort.signal.aborted) {
              const result = normalizeProductsResponse(
                payload,
                readFilters(queryKey),
              );
              if (result.page !== readFilters(queryKey).page)
                setSearch(
                  filterSearch({ ...readFilters(queryKey), page: result.page }),
                  { replace: true },
                );
              setData(result);
              setLoadedKey(key);
            }
          })
          .catch((e) => {
            if (!abort.signal.aborted) {
              setData(emptyData);
              setLoadedKey(key);
              setError(
                e.response?.data?.message ||
                  e.message ||
                  "Impossible de charger le catalogue.",
              );
            }
          })
          .finally(() => {
            if (!abort.signal.aborted) setLoading(false);
          });
      },
      readFilters(queryKey).q ? 250 : 0,
    );
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [key, queryKey, retry, setSearch]);
  function filter(patch) {
    setSearch(filterSearch({ ...query, ...patch, page: patch.page ?? 1 }));
  }
  function edit(product) {
    navigate(`/products/${product.id}/edit`, {
      state: { returnTo: location.pathname + location.search },
    });
  }
  function open(type, product = null) {
    setSelected(product);
    setDialogScope(scope);
    setDialog(type);
  }
  function saved(text = "Stock ajusté avec succès.") {
    setDialog(null);
    setSelected(null);
    setMessage(text);
    setRetry((v) => v + 1);
  }
  async function toggle(product) {
    if (operation.current) return;
    operation.current = true;
    const active = key;
    try {
      const ok = await confirm({
        title: product.actif
          ? "Désactiver ce produit ?"
          : "Réactiver ce produit ?",
        message: `${product.nom} (${product.sku}) sera ${product.actif ? "masqué" : "activé"} dans le pays ${country}. Le stock et les commandes existantes sont conservés.`,
        confirmLabel: product.actif ? "Désactiver" : "Réactiver",
        tone: product.actif ? "warning" : "info",
      });
      if (!ok || active !== current.current) return;
      setBusy(true);
      await products.update(product.id, {
        actif: !product.actif,
        expectedUpdatedAt: product.updatedAt,
        expectedCountryUpdatedAt: product.countryUpdatedAt,
      });
      if (active === current.current) saved("Disponibilité mise à jour.");
    } catch (e) {
      if (active === current.current)
        setError(e.response?.data?.message || "Modification impossible.");
    } finally {
      operation.current = false;
      if (active === current.current) setBusy(false);
    }
  }
  async function exportCsv() {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    const active = scope;
    try {
      const blob = await products.exportView(query);
      if (active !== ordersScopeKey()) return;
      const url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `produits-${country}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      let text = "Export impossible.";
      try {
        const body = e.response?.data;
        text =
          body instanceof Blob
            ? JSON.parse(await body.text()).message
            : body?.message || text;
      } catch {
        /* Retain the readable fallback. */
      }
      if (active === ordersScopeKey()) setError(text);
    } finally {
      operation.current = false;
      if (active === ordersScopeKey()) setBusy(false);
    }
  }
  const pages = Math.max(1, Math.ceil(visible.totalCount / query.pageSize));
  const actionProps = {
    canWrite,
    edit,
    toggle,
    stock: (p) => open("stock", p),
    details: (p) => open("details", p),
    busy,
  };
  return (
    <div className="space-y-5 pb-8">
      <header className="rounded-2xl bg-gray-950 p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Package size={24} aria-hidden="true" />
              <h1 className="text-2xl font-semibold">Catalogue produits</h1>
            </div>
            <p className="mt-2 text-sm text-gray-300">
              Gérez les tarifs et la disponibilité · <strong>{country}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setRetry((v) => v + 1)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Actualiser
            </button>
            {canWrite && (
              <button
                onClick={() => navigate("/products/new")}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black hover:bg-[#E6B200] focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40"
              >
                <Plus size={16} />
                Nouveau produit
              </button>
            )}
          </div>
        </div>
      </header>
      {message && (
        <div
          role="status"
          className="flex items-start justify-between gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"
        >
          <span>{message}</span>
          <button aria-label="Fermer le message" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      <nav aria-label="Vues des produits" className="flex flex-wrap gap-2">
        {views.map(([id, label, patch]) => {
          const selected =
            query.actif === (patch.actif || "") &&
            query.stock === (patch.stock || "") &&
            query.incomplete === (patch.incomplete || "");
          return (
            <button
              type="button"
              key={id}
              aria-pressed={selected}
              onClick={() =>
                filter({ actif: "", stock: "", incomplete: "", ...patch })
              }
              className={
                "rounded-full border px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 " +
                (selected
                  ? "border-gray-950 bg-gray-950 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50")
              }
            >
              {label}
            </button>
          );
        })}
      </nav>
      <section
        aria-label="Répartition des produits filtrés"
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600">
            <strong className="mr-2 text-2xl text-gray-950">
              {loading ? "…" : visible.totalCount}
            </strong>{" "}
            produits dans cette vue
          </p>
          <p className="text-xs text-gray-500">
            {visible.legacy
              ? "Répartition sur les produits reçus correspondant aux filtres"
              : "Répartition sur tous les résultats filtrés"}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            ["Actifs", visible.stats.actifs],
            ["Ruptures", visible.stats.rupture],
            ["Stock faible", visible.stats.faible],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="block text-xs text-gray-600">{label}</span>
              <strong className="mt-1 block text-lg text-gray-900">
                {loading ? "…" : (value ?? "—")}
              </strong>
            </div>
          ))}
        </div>
        {visible.limited && (
          <p className="mt-3 text-xs text-amber-800">
            Affichage limité aux 500 produits reçus ; certains produits peuvent
            manquer.
          </p>
        )}
      </section>
      <section
        aria-label="Filtres des produits"
        className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Filtres du catalogue
          </h2>
          <div className="flex flex-wrap gap-2">
            {canExport && (
              <button
                disabled={busy}
                onClick={exportCsv}
                className={secondary}
              >
                <Download size={15} />
                Exporter la vue
              </button>
            )}
            {canWrite && (
              <button onClick={() => open("import")} className={secondary}>
                Importer CSV
              </button>
            )}
            {canWrite && actor?.role === "SUPER_ADMIN" && (
              <button onClick={() => open("copy")} className={secondary}>
                Copier vers un pays
              </button>
            )}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
          <label className="text-xs font-medium text-gray-600">
            Rechercher
            <div className="relative mt-1">
              <Search
                size={16}
                aria-hidden="true"
                className="absolute left-3 top-2.5 text-gray-400"
              />
              <input
                value={query.q}
                onChange={(e) => filter({ q: e.target.value })}
                placeholder="Nom, SKU ou code-barres"
                maxLength={200}
                className={`${control} w-full pl-9`}
              />
            </div>
          </label>
          <label className="text-xs font-medium text-gray-600">
            Catégorie
            <select
              value={query.category}
              onChange={(e) => filter({ category: e.target.value })}
              className={`${control} mt-1 w-full`}
            >
              {CATEGORIES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">
            Trier par
            <select
              value={query.sort}
              onChange={(e) => filter({ sort: e.target.value })}
              className={`${control} mt-1 w-full`}
            >
              <option value="nom">Nom</option>
              <option value="sku">SKU</option>
              <option value="prixBaseFcfa">Prix</option>
              <option value="stockQty">Stock</option>
              <option value="updatedAt">Dernière modification</option>
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600">
            Ordre
            <select
              value={query.dir}
              onChange={(e) => filter({ dir: e.target.value })}
              className={`${control} mt-1 w-full`}
            >
              <option value="asc">Croissant</option>
              <option value="desc">Décroissant</option>
            </select>
          </label>
        </div>
        <details className="mt-4 rounded-xl border border-gray-200 p-3">
          <summary className="cursor-pointer text-sm font-medium text-gray-700">
            Filtres complémentaires
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-gray-600">
              Statut
              <select
                value={query.actif}
                onChange={(e) => filter({ actif: e.target.value })}
                className={`${control} mt-1 w-full`}
              >
                <option value="">Tous les statuts</option>
                <option value="true">Actifs</option>
                <option value="false">Inactifs</option>
              </select>
            </label>
            <label className="text-xs font-medium text-gray-600">
              Stock
              <select
                value={query.stock}
                onChange={(e) => filter({ stock: e.target.value })}
                className={`${control} mt-1 w-full`}
              >
                <option value="">Tous les niveaux</option>
                <option value="in">En stock</option>
                <option value="out">Rupture</option>
                <option value="low">Stock faible (1 à 5)</option>
              </select>
            </label>
          </div>
        </details>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-3 text-xs text-gray-500">
          <span>
            Stock faible : 1 à 5 unités · À compléter : sans image ou sans
            catégorie
          </span>
          {queryKey && (
            <button
              onClick={() => setSearch("")}
              className="font-semibold text-gray-800 underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      </section>
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>{error}</p>
          <button
            onClick={() => setRetry((v) => v + 1)}
            className="font-semibold underline"
          >
            Réessayer
          </button>
        </div>
      )}
      <section
        aria-label="Liste des produits"
        aria-busy={loading}
        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      >
        {loading ? (
          <p role="status" className="p-12 text-center text-sm text-gray-500">
            Chargement du catalogue…
          </p>
        ) : !visible.items.length ? (
          <div className="p-12 text-center">
            <Package className="mx-auto mb-3 text-gray-300" size={36} />
            <p className="font-medium">
              {error
                ? "Catalogue indisponible"
                : "Aucun produit ne correspond à cette vue"}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {error
                ? "Réessayez le chargement."
                : "Modifiez vos filtres ou ajoutez un produit."}
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full table-fixed text-sm">
                <thead className="border-b border-gray-100 bg-gray-50 text-left text-xs text-gray-600">
                  <tr>
                    <th
                      scope="col"
                      className="w-[30%] px-4 py-3 font-semibold"
                    >
                      Produit
                    </th>
                    <th
                      scope="col"
                      className="w-[13%] px-3 py-3 font-semibold"
                    >
                      Catégorie
                    </th>
                    <th
                      scope="col"
                      className="w-[12%] px-3 py-3 font-semibold"
                    >
                      Prix de base
                    </th>
                    <th
                      scope="col"
                      className="w-[13%] px-3 py-3 font-semibold"
                    >
                      Stock
                    </th>
                    <th
                      scope="col"
                      className="w-[9%] px-3 py-3 font-semibold"
                    >
                      Statut
                    </th>
                    <th
                      scope="col"
                      className="w-[23%] px-3 py-3 font-semibold"
                    >
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.items.map((p) => (
                    <tr key={p.id} className="align-top hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <ProductIdentity product={p} />
                      </td>
                      <td className="break-words px-3 py-4 text-gray-600">
                        {categoryLabel(p.category)}
                      </td>
                      <td className="px-3 py-4 font-semibold tabular-nums text-gray-900">
                        {formatFcfa(p.prixBaseFcfa)}
                      </td>
                      <td className="px-3 py-4">
                        <Stock product={p} />
                      </td>
                      <td className="px-3 py-4">
                        <Status product={p} />
                      </td>
                      <td className="px-3 py-4">
                        <Actions product={p} {...actionProps} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-gray-100 lg:hidden">
              {visible.items.map((p) => (
                <article key={p.id} className="space-y-3 p-4">
                  <ProductIdentity product={p} />
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-sm text-gray-600">
                      {categoryLabel(p.category)}
                    </span>
                    <Status product={p} />
                  </div>
                  <div className="flex flex-wrap justify-between gap-2">
                    <strong className="text-sm">
                      {formatFcfa(p.prixBaseFcfa)}
                    </strong>
                    <Stock product={p} />
                  </div>
                  <Actions product={p} {...actionProps} />
                </article>
              ))}
            </div>
          </>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <label className="flex items-center gap-2">
            Par page
            <select
              aria-label="Produits par page"
              disabled={loading}
              className="rounded border border-gray-300 bg-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
              value={query.pageSize}
              onChange={(e) => filter({ pageSize: Number(e.target.value) })}
            >
              {[20, 30, 50, 100].map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
          </label>
          <span>
            {visible.totalCount ? (query.page - 1) * query.pageSize + 1 : 0}–
            {Math.min(query.page * query.pageSize, visible.totalCount)} sur{" "}
            {visible.totalCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Page précédente"
              disabled={loading || query.page <= 1}
              onClick={() => filter({ page: query.page - 1 })}
              className="rounded-lg border border-gray-200 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <span>
              Page {query.page} / {pages}
            </span>
            <button
              type="button"
              aria-label="Page suivante"
              disabled={loading || query.page >= pages}
              onClick={() => filter({ page: query.page + 1 })}
              className="rounded-lg border border-gray-200 bg-white p-2 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>
      <ImportCsvModal
        open={dialogScope === scope && dialog === "import"}
        onClose={() => setDialog(null)}
        onDone={(text) => {
          if (scope === ordersScopeKey()) saved(text);
        }}
      />
      {dialogScope === scope && dialog === "stock" && selected && (
        <StockAdjustDialog
          key={`${scope}:${selected.id}`}
          product={selected}
          onClose={() => setDialog(null)}
          onSaved={() => {
            if (scope === ordersScopeKey()) saved();
          }}
        />
      )}
      {dialogScope === scope && dialog === "copy" && (
        <CatalogCopyDialog
          key={scope}
          onClose={() => setDialog(null)}
          onSaved={(text) => {
            if (scope === ordersScopeKey()) saved(text);
          }}
        />
      )}
      {dialogScope === scope && dialog === "details" && selected && (
        <ProductDialog title="Fiche produit" onClose={() => setDialog(null)}>
          <div className="space-y-5">
            <ProductIdentity product={selected} />
            <div className="flex flex-wrap gap-3">
              <Status product={selected} />
              <Stock product={selected} />
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {[
                ["Catégorie", categoryLabel(selected.category)],
                ["Prix de base", formatFcfa(selected.prixBaseFcfa)],
                ["Coefficient CC", selected.cc],
                ["Poids", `${selected.poidsKg} kg`],
                [
                  "Limite par commande",
                  selected.maxQtyPerOrder ?? "Limite globale du pays",
                ],
                ["Pays", country],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="mt-1 break-words font-medium">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="whitespace-pre-wrap text-sm text-gray-600">
              {selected.details || "Aucune description renseignée."}
            </p>
            <ProductHistory productId={selected.id} />
            {canWrite && (
              <button
                onClick={() => edit(selected)}
                className="rounded-lg bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black hover:bg-[#E6B200] focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40"
              >
                Modifier le produit
              </button>
            )}
          </div>
        </ProductDialog>
      )}
    </div>
  );
}
