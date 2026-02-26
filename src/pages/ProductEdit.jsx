// src/pages/ProductEdit.jsx

import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { getById, update, uploadImage } from "../services/productsService";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const p = await getById(id);
        if (alive) setInitialValues(p);
      } catch (e) {
        console.error(e);
        if (alive) {
          setInitialValues(null);
          setError(
            e?.response?.data?.message || "Impossible de charger ce produit."
          );
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  const onSubmit = async (payload) => {
    setSaving(true);
    setError("");
    try {
      const updated = await update(id, payload);
      setInitialValues((prev) => ({ ...prev, ...updated }));
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Erreur lors de la mise à jour.");
      throw e; // optionnel: laisse ProductForm afficher sa propre erreur si tu le gères
    } finally {
      setSaving(false);
    }
  };

  const onUpload = async (file) => {
    try {
      const updated = await uploadImage(id, file);
      setInitialValues((prev) => ({ ...prev, ...updated }));
      return updated.imageUrl || "";
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Upload image échoué.");
      throw e;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="text-gray-600">Chargement…</div>
        </div>
      </div>
    );
  }

  if (!initialValues) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-10">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <p className="text-red-600 font-medium">
              {error || "Produit introuvable."}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => navigate("/admin/products")}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white"
              >
                Retour liste
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-lg bg-white border border-gray-300 text-gray-700"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* header page */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">
              <Link to="/admin/products" className="hover:underline">
                Produits
              </Link>{" "}
              / <span className="text-gray-900 font-medium">Édition</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Modifier le produit
            </h1>
          </div>

          <button
            onClick={() => navigate("/admin/products")}
            className="px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Retour
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200">
            {error}
          </div>
        )}

        <ProductForm
          mode="edit"
          initialValues={initialValues}
          onSubmit={onSubmit}
          onUploadImage={onUpload}
          loading={saving}
        />
      </div>
    </div>
  );
}