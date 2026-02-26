// src/components/ProductDetailsDrawer.jsx
// Drawer : affiche aussi Category + Stock + Détails (nouveaux champs)
// ✅ Toujours aucune modification d'image inline.

import { useEffect, useMemo } from "react";
import ProductThumb from "./ProductThumb";
import { formatFcfa } from "../lib/format";

const PRODUCT_CATEGORIES = [
  { value: "NON_CLASSE", label: "Non classé" },
  { value: "BUVABLE", label: "Buvable" },
  { value: "COMBO_PACKS", label: "Combo Packs" },
  { value: "GESTION_DE_POIDS", label: "Gestion de poids" },
  { value: "NUTRITION", label: "Nutrition" },
  { value: "PRODUIT_DE_LA_ROCHE", label: "Produit de la roche" },
  { value: "SOINS_DE_LA_PEAU", label: "Soins de la peau" },
  { value: "SOINS_PERSONNELS", label: "Soins personnels" },
];

function categoryLabel(v) {
  return PRODUCT_CATEGORIES.find((x) => x.value === v)?.label || v || "—";
}

function safeDate(d) {
  try {
    return d ? new Date(d).toLocaleString() : "—";
  } catch {
    return "—";
  }
}

function Badge({ children, tone = "gray" }) {
  const cls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : tone === "rose"
          ? "bg-rose-50 text-rose-800 border-rose-200"
          : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${cls}`}
    >
      {children}
    </span>
  );
}

export default function ProductDetailsDrawer({
  open,
  product,
  onClose,
  onEdit,
  onDelete,
  loading,
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  const stock = useMemo(() => Number(product?.stockQty ?? 0), [product]);
  const stockTone = stock > 0 ? "green" : "rose";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm text-gray-500">Détails produit</div>
            <div className="text-lg font-semibold text-gray-900 truncate">
              {product?.nom || "—"}
            </div>
          </div>

          <button
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
            type="button"
          >
            Fermer
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-auto">
          {loading ? (
            <div className="text-sm text-gray-500">Chargement...</div>
          ) : !product ? (
            <div className="text-sm text-gray-500">Aucun produit</div>
          ) : (
            <>
              <div className="flex gap-3 items-center">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                  <ProductThumb
                    url={product.imageUrl}
                    alt={product.nom}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="text-gray-500">SKU :</span>{" "}
                    <span className="font-mono font-medium text-gray-900">
                      {product.sku || "—"}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge tone={product.actif ? "green" : "gray"}>
                      {product.actif ? "Actif" : "Inactif"}
                    </Badge>
                    <Badge tone={stockTone}>
                      {stock > 0 ? `Stock: ${stock}` : "Rupture"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* ✅ Nouveaux champs affichés ici */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Catégorie</div>
                  <div className="font-semibold text-gray-900">
                    {categoryLabel(product.category)}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Prix base</div>
                  <div className="font-semibold text-gray-900">
                    {formatFcfa(Number(product.prixBaseFcfa || 0))}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">CC</div>
                  <div className="font-semibold text-gray-900">
                    {String(product.cc ?? "0.000")}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Poids (Kg)</div>
                  <div className="font-semibold text-gray-900">
                    {String(product.poidsKg ?? "0.000")}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">Stock</div>
                  <div className="font-semibold text-gray-900">
                    {String(product.stockQty ?? 0)}
                  </div>
                </div>

                <div className="border border-gray-200 rounded-xl p-3">
                  <div className="text-xs text-gray-500">MAJ</div>
                  <div className="font-semibold text-gray-900">
                    {safeDate(product.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500">Image URL</div>
                <div className="text-sm break-all text-gray-900">
                  {product.imageUrl || "—"}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Pour changer l’image : ouvre la page <b>Modifier</b>.
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl p-3">
                <div className="text-xs text-gray-500">Détails du produit</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap mt-1">
                  {product.details ? product.details : "—"}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                  onClick={onEdit}
                  type="button"
                >
                  Modifier (page)
                </button>

                <button
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  onClick={onDelete}
                  type="button"
                  title="Supprimer le produit"
                >
                  Supprimer
                </button>
              </div>

              <div className="text-xs text-gray-400">
                Astuce : tu peux aussi “désactiver” (inactif) si tu veux éviter
                la suppression définitive.
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}