import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import { create, update, uploadImage } from "../services/productsService";
import useOrdersScope, { ordersScopeKey } from "../hooks/orders/useOrdersScope";
function CreateWorkspace({ scope }) {
  const navigate = useNavigate(),
    [loading, setLoading] = useState(false),
    created = useRef(null);
  async function submit(payload, { imageFile }) {
    const active = scope;
    setLoading(true);
    try {
      let result;
      if (created.current) {
        const patch = {
          ...payload,
          expectedUpdatedAt: created.current.updatedAt,
          expectedCountryUpdatedAt: created.current.countryUpdatedAt,
        };
        delete patch.stockQty;
        result = await update(created.current.id, patch);
      } else result = await create(payload);
      if (active !== ordersScopeKey())
        return {
          ok: false,
          message: "Le pays ou la session a changé. Rechargez la fiche.",
        };
      created.current = result;
      if (imageFile) {
        try {
          const image = await uploadImage(result.id, imageFile, {
            expectedUpdatedAt: result.updatedAt,
            expectedCountryUpdatedAt: result.countryUpdatedAt,
          });
          created.current = { ...result, ...image };
        } catch (e) {
          return {
            ok: false,
            message: `Le produit a été créé, mais l’image n’a pas pu être envoyée. Réessayez l’enregistrement : ${e.response?.data?.message || "Erreur de transfert."}`,
          };
        }
      }
      if (active === ordersScopeKey())
        navigate("/products", {
          replace: true,
          state: { toast: "Produit créé avec succès." },
        });
      return { ok: true };
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-5 pb-8">
      <ProductForm key={scope} onSubmit={submit} loading={loading} />
    </div>
  );
}

export default function ProductCreate() {
  const scope = useOrdersScope();
  return <CreateWorkspace key={scope} scope={scope} />;
}
