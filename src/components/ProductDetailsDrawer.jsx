// ProductDetailsDrawer.jsx
// Ce composant affiche les détails d'un produit dans un panneau latéral (drawer).

import ProductThumb from "./ProductThumb";
import { formatFcfa } from "../lib/format";

export default function ProductDetailsDrawer({
  open,
  product,
  onClose,
  onEdit,
  onDelete,
  loading,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* panel */}
      <aside className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Détails produit</div>
            <div className="text-lg font-semibold">
              {product?.nom || "—"}
            </div>
          </div>

          <button className="btn" onClick={onClose} type="button">
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
                <ProductThumb url={product.imageUrl} alt={product.nom} />
                <div className="space-y-1">
                  <div className="text-sm">
                    <span className="text-gray-500">SKU :</span>{" "}
                    <span className="font-medium">{product.sku}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-gray-500">Statut :</span>{" "}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                        product.actif
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {product.actif ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card p-3">
                  <div className="text-xs text-gray-500">Prix base</div>
                  <div className="font-semibold">
                    {formatFcfa(Number(product.prixBaseFcfa || 0))}
                  </div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-gray-500">CC</div>
                  <div className="font-semibold">
                    {String(product.cc ?? "0.000")}
                  </div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-gray-500">Poids (Kg)</div>
                  <div className="font-semibold">
                    {String(product.poidsKg ?? "0.000")}
                  </div>
                </div>
                <div className="card p-3">
                  <div className="text-xs text-gray-500">MAJ</div>
                  <div className="font-semibold">
                    {product.updatedAt
                      ? new Date(product.updatedAt).toLocaleString()
                      : "—"}
                  </div>
                </div>
              </div>

              <div className="card p-3">
                <div className="text-xs text-gray-500">Image URL</div>
                <div className="text-sm break-all">
                  {product.imageUrl || "—"}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="btn-primary" onClick={onEdit} type="button">
                  Modifier
                </button>
                <button
                  className="btn"
                  onClick={onDelete}
                  type="button"
                  title="Supprimer le produit"
                >
                  Supprimer
                </button>
              </div>

              <div className="text-xs text-gray-400">
                Astuce : tu peux aussi “supprimer” en passant le produit inactif
                si tu veux éviter la suppression définitive.
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
