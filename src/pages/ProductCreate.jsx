// src/pages/ProductCreate.jsx

import React from "react";
import { useNavigate, Link } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { create } from "../services/productsService";

export default function ProductCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const onSubmit = async (payload) => {
    setLoading(true);
    setError("");
    try {
      const created = await create(payload);
      // après création, on redirige vers edit (où l’upload est pleinement utilisable)
      navigate(`/admin/products/${created.id}/edit`, { replace: true });
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.message || "Erreur lors de la création.");
      throw e;
    } finally {
      setLoading(false);
    }
  };

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
              / <span className="text-gray-900 font-medium">Création</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              Nouveau produit
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

        <ProductForm mode="create" onSubmit={onSubmit} loading={loading} />
      </div>
    </div>
  );
}