// src/pages/Products.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import {
  list,
  create,
  update,
  remove,
  uploadImage,
} from "../services/productsService";

import { formatFcfa } from "../lib/format";
import ProductThumb from "../components/ProductThumb";
import CreateProductModal from "../components/CreateProductModal";
import ImportCsvModal from "../components/ImportCsvModal";

// debounce simple
const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

// ---------- Modal Détails Améliorée ----------
function ProductDetailsModal({ open, product, onClose, onEdit }) {
  if (!open || !product) return null;

  // Gestionnaire de touche Echap
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
            Détails du produit
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fermer"
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
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Image Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
                  <ProductThumb
                    url={product.imageUrl || ""}
                    alt={product.nom}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span
                  className={`absolute -top-2 -right-2 w-4 h-4 rounded-full ${
                    product.actif ? "bg-green-500 animate-pulse" : "bg-gray-400"
                  } border-2 border-white`}
                />
              </div>
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  product.actif
                    ? "bg-green-100 text-green-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {product.actif ? "Actif" : "Inactif"}
              </span>
            </div>

            {/* Details Grid */}
            <div className="flex-1 space-y-4">
              {/* Nom */}
              <div className="pb-3 border-b border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Nom du produit
                </div>
                <div className="text-lg font-semibold text-gray-900">
                  {product.nom}
                </div>
              </div>

              {/* SKU & Prix */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    SKU
                  </div>
                  <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    {product.sku}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Prix de base
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {formatFcfa(Number(product.prixBaseFcfa || 0))}
                  </div>
                </div>
              </div>

              {/* CC & Poids */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Coefficient CC
                  </div>
                  <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    {String(product.cc ?? "0.000")}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    Poids (Kg)
                  </div>
                  <div className="font-mono text-sm bg-gray-50 px-3 py-2 rounded-lg">
                    {String(product.poidsKg ?? "0.000")}
                  </div>
                </div>
              </div>

              {/* Image URL */}
              {product.imageUrl && (
                <div>
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                    URL de l'image
                  </div>
                  <a
                    href={product.imageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 break-all flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    {product.imageUrl}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={onEdit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Modifier
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Modal Suppression Améliorée ----------
function ConfirmDeleteModal({
  open,
  product,
  busy,
  error,
  onCancel,
  onConfirm,
}) {
  if (!open || !product) return null;

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
    >
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl animate-slideUp">
        <div className="p-6">
          {/* Warning Icon */}
          <div className="mx-auto flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h2
            id="delete-title"
            className="text-xl font-semibold text-gray-900 text-center mb-2"
          >
            Confirmer la suppression
          </h2>

          <p
            id="delete-description"
            className="text-sm text-gray-500 text-center mb-6"
          >
            Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est
            irréversible.
          </p>

          {/* Product Preview */}
          <div className="p-4 bg-gray-50 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white">
                <ProductThumb url={product.imageUrl || ""} alt={product.nom} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">
                  {product.nom}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  SKU: {product.sku}
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Suppression...</span>
                </>
              ) : (
                "Supprimer"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Composant Toast Amélioré ----------
function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: (
      <svg
        className="w-5 h-5 text-green-500"
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
    error: (
      <svg
        className="w-5 h-5 text-red-500"
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

  const bgColors = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
  };

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slideIn ${bgColors[type]}`}
    >
      {icons[type]}
      <span
        className={`text-sm font-medium ${type === "success" ? "text-green-800" : "text-red-800"}`}
      >
        {message}
      </span>
      <button
        onClick={onClose}
        className="ml-4 text-gray-400 hover:text-gray-600"
      >
        <svg
          className="w-4 h-4"
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
    </div>
  );
}

// ---------- Composant Stats Amélioré ----------
// Composant Stats (à ajouter avant le composant principal Products)
function ProductStats({ total, actifs, inactifs }) {
  return (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-semibold text-gray-900">{total}</span>
        <span className="text-sm text-gray-500">total</span>
      </div>
      <div className="w-px h-8 bg-gray-200" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          <span className="text-sm font-medium text-gray-700">{actifs} actifs</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
          <span className="text-sm font-medium text-gray-700">{inactifs} inactifs</span>
        </div>
      </div>
    </div>
  );
}

// ---------- Composant Principal Amélioré ----------
export default function Products() {
  // filters
  const [q, setQ] = useState("");
  const [actifFilter, setActifFilter] = useState(""); // "", "true", "false"
  const qRef = useRef("");
  const actifRef = useRef("");

  // data
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true); // <-- CECI EST DÉFINI ICI

  // messages
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState('success');

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [modalBusy, setModalBusy] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsProduct, setDetailsProduct] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const [importOpen, setImportOpen] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // upload in list (thumbnail column)
  const [uploadingId, setUploadingId] = useState("");

  // debounce reference
  const debouncedLoadRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToastType(type);
    setToast(msg);
  };

  const load = async (opts = {}) => {
    const searchValue = opts.q ?? qRef.current;
    const actifValue = opts.actif ?? actifRef.current;

    try {
      setLoading(true);
      setError("");

      const data = await list({
        q: searchValue || undefined,
        actif: actifValue || undefined,
        take: 500,
      });

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setError("Impossible de charger les produits");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ q: "", actif: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // debounce search
  if (!debouncedLoadRef.current) {
    debouncedLoadRef.current = debounce((nextQ, nextActif) => {
      load({ q: nextQ, actif: nextActif });
    }, 350);
  }

  const onSearchChange = (value) => {
    setQ(value);
    qRef.current = value;
    debouncedLoadRef.current(qRef.current, actifRef.current);
  };

  const onActifChange = (value) => {
    setActifFilter(value);
    actifRef.current = value;
    debouncedLoadRef.current(qRef.current, actifRef.current);
  };

  const resetAll = () => {
    setQ("");
    setActifFilter("");
    qRef.current = "";
    actifRef.current = "";
    load({ q: "", actif: "" });
  };

  // stats
  const stats = useMemo(() => {
    const total = rows.length;
    const actifs = rows.filter((r) => r.actif).length;
    const inactifs = total - actifs;
    return { total, actifs, inactifs };
  }, [rows]);

  // open modals
  const openDetails = (p) => {
    setDetailsProduct(p);
    setDetailsOpen(true);
  };

  const openEdit = (p) => {
    setEditProduct(p);
    setEditOpen(true);
  };

  const askDelete = (p) => {
    setDeleteError("");
    setDeleteProduct(p);
    setDeleteOpen(true);
  };

  // create submit
  const handleCreateSubmit = async (payload) => {
    try {
      setModalBusy(true);
      setError("");

      const created = await create(payload);

      setRows((prev) => [created, ...prev]);
      setCreateOpen(false);

      showToast("Produit créé", "success");
    } catch (e) {
      const msg = e?.response?.data?.message || "Erreur lors de la création";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setModalBusy(false);
    }
  };

  // edit submit
  const handleEditSubmit = async (payload) => {
    if (!editProduct?.id) return;
    try {
      setModalBusy(true);
      setError("");

      const updated = await update(editProduct.id, payload);

      setRows((prev) =>
        prev.map((x) => (x.id === editProduct.id ? { ...x, ...updated } : x))
      );

      setDetailsProduct((prev) =>
        prev?.id === editProduct.id ? { ...prev, ...updated } : prev
      );

      setEditOpen(false);
      setEditProduct(null);

      showToast("Produit mis à jour", "success");
    } catch (e) {
      const msg = e?.response?.data?.message || "Erreur lors de la mise à jour";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setModalBusy(false);
    }
  };

  // upload from table
  const onUploadInline = async (productId, file) => {
    if (!file) return;
    try {
      setUploadingId(productId);
      setError("");

      const updated = await uploadImage(productId, file);

      setRows((prev) =>
        prev.map((x) => (x.id === productId ? { ...x, ...updated } : x))
      );

      setDetailsProduct((prev) =>
        prev?.id === productId ? { ...prev, ...updated } : prev
      );
      setEditProduct((prev) =>
        prev?.id === productId ? { ...prev, ...updated } : prev
      );

      showToast("Image mise à jour", "success");
    } catch (e) {
      const msg = e?.response?.data?.message || "Upload image échoué";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setUploadingId("");
    }
  };

  // upload from modal (EDIT only)
  const onUploadFromModal = async (file) => {
    if (!editProduct?.id) {
      throw new Error("Upload indisponible avant création du produit.");
    }

    const updated = await uploadImage(editProduct.id, file);

    setRows((prev) =>
      prev.map((x) => (x.id === editProduct.id ? { ...x, ...updated } : x))
    );
    setDetailsProduct((prev) =>
      prev?.id === editProduct.id ? { ...prev, ...updated } : prev
    );
    setEditProduct((prev) =>
      prev?.id === editProduct.id ? { ...prev, ...updated } : prev
    );

    return updated.imageUrl || "";
  };

  // delete confirm
  const confirmDelete = async () => {
    if (!deleteProduct?.id) return;

    try {
      setDeleteBusy(true);
      setDeleteError("");

      await remove(deleteProduct.id);

      setRows((prev) => prev.filter((x) => x.id !== deleteProduct.id));

      if (detailsProduct?.id === deleteProduct.id) {
        setDetailsOpen(false);
        setDetailsProduct(null);
      }
      if (editProduct?.id === deleteProduct.id) {
        setEditOpen(false);
        setEditProduct(null);
      }

      setDeleteOpen(false);
      setDeleteProduct(null);

      showToast("Produit supprimé", "success");
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        "Suppression échouée (produit utilisé dans une commande ?)";
      setDeleteError(msg);
      showToast(msg, "error");
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Produits</h1>
              <p className="mt-1 text-sm text-gray-500">
                Gérez votre catalogue de produits
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => load({})}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {loading ? 'Chargement...' : 'Rafraîchir'}
              </button>

              <button
                onClick={() => setImportOpen(true)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importer CSV
              </button>

              <button
                onClick={() => setCreateOpen(true)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nouveau produit
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6">
            <ProductStats 
              total={stats.total}
              actifs={stats.actifs}
              inactifs={stats.inactifs}
            />
          </div>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Rechercher par nom ou SKU..."
                value={q}
                onChange={(e) => onSearchChange(e.target.value)}
                disabled={loading}
              />
              {q && (
                <button
                  onClick={() => onSearchChange("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Filter Select */}
            <div className="flex items-center gap-3">
              <select
                className="w-full lg:w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                value={actifFilter}
                onChange={(e) => onActifChange(e.target.value)}
                disabled={loading}
              >
                <option value="">Tous les statuts</option>
                <option value="true">Actifs uniquement</option>
                <option value="false">Inactifs uniquement</option>
              </select>

              {(q || actifFilter) && (
                <button
                  onClick={resetAll}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Réinitialiser
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-3 text-red-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prix
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {loading && rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg className="animate-spin h-8 w-8 mb-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm">Chargement des produits...</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <svg className="w-12 h-12 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <span className="text-sm mb-2">Aucun produit trouvé</span>
                        {(q || actifFilter) && (
                          <button
                            onClick={resetAll}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Réinitialiser les filtres
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((p, index) => (
                    <tr 
                      key={p.id} 
                      className="hover:bg-gray-50 transition-colors group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openDetails(p)}
                            className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 hover:ring-2 hover:ring-blue-500 transition-all"
                            title="Voir détails"
                          >
                            <ProductThumb 
                              url={p.imageUrl || ""} 
                              alt={p.nom}
                              className="w-full h-full object-cover"
                            />
                          </button>
                          <label className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                              {uploadingId === p.id ? 'Upload...' : 'Modifier'}
                            </span>
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                e.target.value = "";
                                onUploadInline(p.id, file);
                              }}
                            />
                          </label>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono text-gray-800">
                          {p.sku}
                        </code>
                      </td>

                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <div className="font-medium text-gray-900 mb-1">
                            {p.nom}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-2">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              CC: {String(p.cc ?? "0.000")}
                            </span>
                            <span>•</span>
                            <span className="bg-gray-100 px-2 py-0.5 rounded">
                              Kg: {String(p.poidsKg ?? "0.000")}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">
                          {formatFcfa(Number(p.prixBaseFcfa || 0))}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.actif 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                            p.actif ? 'bg-green-500' : 'bg-gray-400'
                          }`} />
                          {p.actif ? 'Actif' : 'Inactif'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetails(p)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Voir les détails"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => openEdit(p)}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Modifier"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => askDelete(p)}
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                            title="Supprimer"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {rows.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>{rows.length} produit{rows.length > 1 ? 's' : ''} affiché{rows.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Filtre actuel :</span>
                <span className="font-medium text-gray-700">
                  {actifFilter === "" ? "Tous" : actifFilter === "true" ? "Actifs" : "Inactifs"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <Toast 
            message={toast} 
            type={toastType}
            onClose={() => setToast("")} 
          />
        )}

        {/* Modals */}
        <CreateProductModal
          open={createOpen}
          mode="create"
          initialValues={null}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreateSubmit}
          loading={modalBusy}
        />

        <CreateProductModal
          open={editOpen}
          mode="edit"
          initialValues={
            editProduct
              ? {
                  sku: editProduct.sku,
                  nom: editProduct.nom,
                  prixBaseFcfa: editProduct.prixBaseFcfa,
                  cc: editProduct.cc,
                  poidsKg: editProduct.poidsKg,
                  actif: editProduct.actif,
                  imageUrl: editProduct.imageUrl,
                }
              : null
          }
          onClose={() => {
            if (modalBusy) return;
            setEditOpen(false);
            setEditProduct(null);
          }}
          onSubmit={handleEditSubmit}
          onUploadImage={onUploadFromModal}
          loading={modalBusy}
        />

        <ProductDetailsModal
          open={detailsOpen}
          product={detailsProduct}
          onClose={() => {
            setDetailsOpen(false);
            setDetailsProduct(null);
          }}
          onEdit={() => {
            if (!detailsProduct) return;
            setDetailsOpen(false);
            openEdit(detailsProduct);
          }}
        />

        <ImportCsvModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onDone={() => load({})}
        />

        <ConfirmDeleteModal
          open={deleteOpen}
          product={deleteProduct}
          busy={deleteBusy}
          error={deleteError}
          onCancel={() => {
            if (deleteBusy) return;
            setDeleteOpen(false);
            setDeleteProduct(null);
            setDeleteError("");
          }}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  );
}
