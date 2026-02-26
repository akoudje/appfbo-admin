// src/pages/ProductCreate.jsx

import React from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { create } from "../services/productsService";

export default function ProductCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const onSubmit = async (payload) => {
    setLoading(true);
    try {
      const created = await create(payload);
      // ✅ redirection vers route SANS /admin
      navigate(`/products/${created.id}/edit`, { replace: true });
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