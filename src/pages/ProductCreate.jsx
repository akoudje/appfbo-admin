// src/pages/ProductCreate.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { create, uploadImage } from "../services/productsService";

export default function ProductCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (payload, { imageFile } = {}) => {
    setLoading(true);
    try {
      const created = await create(payload);
      const productId = created?.id;

      if (imageFile && productId) {
        try {
          await uploadImage(productId, imageFile);
        } catch (uploadErr) {
          console.error("Image upload after create failed:", uploadErr);
          navigate("/products", {
            replace: true,
            state: {
              toast:
                "Produit créé, mais l’image n’a pas pu être envoyée. Ouvre Modifier pour réessayer.",
              type: "error",
            },
          });
          return;
        }
      }

      // ✅ Confirmation visuelle + retour page produits
      navigate("/products", {
        replace: true,
        state: { toast: "Produit créé avec succès ✅", type: "success" },
      });
    } catch (e) {
      console.error(e);
      // ✅ Retour produits avec message d'erreur (visuel)
      navigate("/products", {
        replace: true,
        state: {
          toast:
            e?.response?.data?.message ||
            "Création échouée. Vérifie les champs et réessaie.",
          type: "error",
        },
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ProductForm mode="create" onSubmit={onSubmit} loading={loading} />
      </div>
    </div>
  );
}
