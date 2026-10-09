import { useEffect, useState } from "react";
import { ChevronDown, History } from "lucide-react";
import { history } from "../../services/productsService";
import { stockService } from "../../services/stockService";
import { GRADES, categoryLabel } from "../../lib/products/productModel";
import { formatFcfa } from "../../lib/format";
const actions = {
  CREATE: "Création",
  UPDATE: "Modification",
  DEACTIVATE: "Désactivation",
  IMPORT_CREATE: "Création par import",
  IMPORT_UPDATE: "Modification par import",
  IMAGE: "Image",
  COPY_COUNTRY: "Copie du catalogue",
  PACKAGING_CREATE: "Ajout d’un conditionnement",
  PACKAGING_UPDATE: "Modification d’un conditionnement",
  PACKAGING_DEACTIVATE: "Désactivation d’un conditionnement",
};
const fields = {
  sku: "Référence",
  nom: "Nom",
  cc: "Coefficient CC",
  poidsKg: "Poids (kg)",
  prixBaseFcfa: "Prix de base",
  maxQtyPerOrder: "Limite par commande",
  category: "Catégorie",
  details: "Description",
  actif: "Activation",
  imageUrl: "Image",
  label: "Conditionnement",
  unitsPerPackage: "Unités par conditionnement",
  barcode: "Code-barres",
  prixFcfa: "Prix du conditionnement",
};
function display(key, value) {
  if (value == null || value === "") return "Non renseigné";
  if (key === "actif") return value ? "Actif" : "Inactif";
  if (key === "category") return categoryLabel(value);
  if (key === "imageUrl") return "Image renseignée";
  if (["prixBaseFcfa", "prixFcfa"].includes(key))
    return formatFcfa(Number(value));
  return String(value);
}
function Changes({ changes }) {
  const before = changes.before || {},
    after = changes.after || {},
    grades = changes.grades?.after || after.gradePrices || {};
  return (
    <ul className="mt-2 space-y-1 break-words text-xs text-gray-600">
      {Object.entries(after)
        .filter(([key]) => fields[key])
        .map(([key, value]) => (
          <li key={key}>
            {fields[key]} :{" "}
            {key in before ? `${display(key, before[key])} → ` : ""}
            {display(key, value)}
          </li>
        ))}
      {Object.entries(grades).map(([key, value]) => (
        <li key={key}>
          {GRADES.find(([grade]) => grade === key)?.[1] || key} :{" "}
          {value === null
            ? "Tarif spécifique retiré"
            : formatFcfa(Number(value))}
        </li>
      ))}
      {changes.sourceCode && (
        <li>Catalogue source : {changes.sourceCode} · Stocks conservés</li>
      )}
      {changes.stockIgnored && (
        <li>Stock existant conservé lors de l’import.</li>
      )}
    </ul>
  );
}
function HistoryContent({ productId }) {
  const [result, setResult] = useState(null),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const key = `${productId}:${page}:${retry}`,
    data = result?.key === key ? result : null;
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([
      history(productId, { page }, { signal: abort.signal }),
      stockService.listMovements(
        { productId, page: 1, pageSize: 10, days: 180 },
        { signal: abort.signal },
      ),
    ])
      .then(([catalog, stock]) => {
        if (!abort.signal.aborted) setResult({ key, catalog, stock });
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setResult({
            key,
            error:
              e.response?.data?.message ||
              "Impossible de charger l’historique.",
          });
      });
    return () => abort.abort();
  }, [key, productId, page]);
  if (!data)
    return (
      <p role="status" className="mt-4 text-sm text-gray-500">
        Chargement…
      </p>
    );
  if (data.error)
    return (
      <div
        role="alert"
        className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"
      >
        <p className="text-sm text-red-800">{data.error}</p>
        <button
          onClick={() => setRetry((v) => v + 1)}
          className="mt-2 inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40"
        >
          Réessayer
        </button>
      </div>
    );
  return (
    <div className="mt-4 space-y-4">
      <p className="text-xs text-gray-500">
        Changements enregistrés depuis la mise à jour du module, pour le pays
        courant.
      </p>
      {!data.catalog.items.length && (
        <p className="text-sm text-gray-500">Aucun changement enregistré.</p>
      )}
      <ol className="divide-y divide-gray-100">
        {data.catalog.items.map((row) => (
          <li key={row.id} className="py-3">
            <p className="text-sm font-semibold text-gray-900">
              {actions[row.action] || "Modification du catalogue"}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {new Date(row.createdAt).toLocaleString("fr-FR")} ·{" "}
              {row.actorName || "Administrateur"}
            </p>
            <Changes changes={row.changes} />
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <button
          disabled={page === 1}
          onClick={() => setPage((v) => v - 1)}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-40"
        >
          Précédent
        </button>
        <span>Page {page}</span>
        <button
          disabled={page * data.catalog.pageSize >= data.catalog.totalCount}
          onClick={() => setPage((v) => v + 1)}
          className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-40"
        >
          Suivant
        </button>
      </div>
      <p className="border-t border-gray-200 pt-4 text-sm font-semibold text-gray-900">
        Derniers mouvements de stock (180 jours)
      </p>
      {!data.stock.data?.length && (
        <p className="text-sm text-gray-500">Aucun mouvement récent.</p>
      )}
      {(data.stock.data || []).map((row) => (
        <p key={row.id} className="break-words text-sm text-gray-700">
          <span
            className={
              row.type === "CREDIT" ? "text-green-700" : "text-red-700"
            }
          >
            {row.type === "CREDIT" ? "+" : "−"}
            {row.qty}
          </span>{" "}
          · {row.note || "Mouvement lié à une commande"}{" "}
          <span className="text-xs text-gray-500">
            {new Date(row.createdAt).toLocaleString("fr-FR")}
          </span>
        </p>
      ))}
    </div>
  );
}
export default function ProductHistory({ productId }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40"
      >
        <span className="flex items-center gap-2">
          <History size={18} aria-hidden="true" />
          Historique du produit
        </span>
        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <HistoryContent productId={productId} />}
    </section>
  );
}
