// src/pages/ProductEdit.jsx

import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { getById, update, uploadImage } from "../services/productsService";

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialValues, setInitialValues] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const p = await getById(id);
        if (alive) setInitialValues(p);
      } catch (e) {
        console.error(e);
        if (alive) setInitialValues(null);
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
    try {
      const updated = await update(id, payload);
      setInitialValues((prev) => ({ ...prev, ...updated }));

      // ✅ Confirmation visuelle + retour page produits
      navigate("/products", {
        replace: true,
        state: { toast: "Produit mis à jour avec succès ✅", type: "success" },
      });
    } catch (e) {
      console.error(e);
      // ✅ On reste sur la page d'édition si erreur, et on affiche un toast sur /products seulement si tu veux
      // Ici on garde l'utilisateur sur la page pour corriger.
      alert(
        e?.response?.data?.message ||
          "Mise à jour échouée. Corrige puis réessaie."
      );
    } finally {
      setSaving(false);
    }
  };

  // ✅ Upload uniquement sur la page dédiée (ici)
  const onUpload = async (file) => {
    const updated = await uploadImage(id, file);
    setInitialValues((prev) => ({ ...prev, ...updated }));
    return updated.imageUrl || "";
  };

  if (loading) {
    return <div className="p-8 text-gray-600">Chargement...</div>;
  }

  if (!initialValues) {
    return (
      <div className="p-8">
        <p className="text-red-600">Produit introuvable.</p>
        <button
          onClick={() => navigate("/products")}
          className="mt-4 px-4 py-2 rounded bg-gray-900 text-white"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
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