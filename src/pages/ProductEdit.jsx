import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import ProductForm from "../components/ProductForm";
import ProductPackagingsManager from "../components/ProductPackagingsManager";
import ProductHistory from "../components/products/ProductHistory";
import { getById, update, uploadImage } from "../services/productsService";
import useOrdersScope, { ordersScopeKey } from "../hooks/orders/useOrdersScope";
export default function ProductEdit() {
  const { id } = useParams(),
    navigate = useNavigate(),
    location = useLocation(),
    scope = useOrdersScope();
  const [product, setProduct] = useState(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [reload, setReload] = useState(0);
  const versions = useRef({}),
    key = `${scope}:${id}`,
    current = useRef(key);
  useEffect(() => {
    current.current = key;
    return () => {
      current.current = "";
    };
  }, [key]);
  useEffect(() => {
    const abort = new AbortController();
    setLoading(true);
    setProduct(null);
    setError("");
    getById(id, { signal: abort.signal })
      .then((p) => {
        if (!abort.signal.aborted) {
          setProduct(p);
          versions.current = {
            expectedUpdatedAt: p.updatedAt,
            expectedCountryUpdatedAt: p.countryUpdatedAt,
          };
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted)
          setError(
            e.response?.data?.message ||
              "Impossible de charger la fiche produit.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [id, key, reload]);
  async function submit(payload, { imageFile }) {
    const active = key;
    setSaving(true);
    try {
      const result = await update(id, { ...payload, ...versions.current });
      if (active !== current.current || scope !== ordersScopeKey())
        return {
          ok: false,
          message: "Le pays ou la session a changé. Rechargez la fiche.",
        };
      versions.current = {
        expectedUpdatedAt: result.updatedAt,
        expectedCountryUpdatedAt: result.countryUpdatedAt,
      };
      if (imageFile) {
        try {
          const image = await uploadImage(id, imageFile, versions.current);
          versions.current = {
            expectedUpdatedAt: image.updatedAt,
            expectedCountryUpdatedAt:
              image.countryUpdatedAt || result.countryUpdatedAt,
          };
        } catch (e) {
          return {
            ok: false,
            message: `Les informations sont enregistrées, mais l’image n’a pas pu être envoyée. Vos saisies sont conservées. ${e.response?.data?.message || "Réessayez."}`,
          };
        }
      }
      if (active === current.current && scope === ordersScopeKey())
        navigate(location.state?.returnTo || "/products", {
          replace: true,
          state: { toast: "Produit mis à jour avec succès." },
        });
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        message:
          e.response?.data?.message ||
          "Impossible d’enregistrer. Vos saisies sont conservées.",
      };
    } finally {
      if (active === current.current) setSaving(false);
    }
  }
  if (loading)
    return (
      <p className="p-8" role="status">
        Chargement de la fiche…
      </p>
    );
  if (error || !product)
    return (
      <div className="p-8">
        <p role="alert" className="text-red-700">
          {error || "Produit introuvable."}
        </p>
        <button
          onClick={() => setReload((v) => v + 1)}
          className="mt-4 rounded-lg bg-yellow-400 px-4 py-2"
        >
          Réessayer
        </button>
        <button
          onClick={() => navigate("/products")}
          className="ml-3 rounded-lg border px-4 py-2"
        >
          Retour à la liste
        </button>
      </div>
    );
  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <ProductForm
        key={`${key}:${reload}`}
        mode="edit"
        initialValues={{
          ...product,
          returnTo: location.state?.returnTo || "/products",
        }}
        onSubmit={submit}
        loading={saving}
        onReload={() => setReload((v) => v + 1)}
      />
      <ProductPackagingsManager
        key={key}
        productId={id}
        productSku={product.sku}
      />
      <ProductHistory key={key} productId={id} />
    </div>
  );
}
