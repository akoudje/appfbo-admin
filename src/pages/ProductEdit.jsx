import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import ProductForm from "../components/ProductForm";
import ProductPageHeader from "../components/products/ProductPageHeader";
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
  if (loading || error || !product)
    return (
      <div className="space-y-5 pb-8">
        <ProductPageHeader
          title="Modifier le produit"
          description="Consultez et mettez à jour la fiche produit."
        >
          <button
            type="button"
            onClick={() => navigate(location.state?.returnTo || "/products")}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium hover:bg-gray-800"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Retour à la liste
          </button>
        </ProductPageHeader>
        {loading ? (
          <p
            role="status"
            className="rounded-2xl border border-gray-200 bg-white p-4 text-sm text-gray-600 shadow-sm"
          >
            Chargement de la fiche…
          </p>
        ) : (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <p>{error || "Produit introuvable."}</p>
            <button
              type="button"
              onClick={() => setReload((v) => v + 1)}
              className="inline-flex items-center gap-2 font-semibold underline"
            >
              <RefreshCw size={16} aria-hidden="true" />
              Réessayer
            </button>
          </div>
        )}
      </div>
    );
  return (
    <div className="space-y-5 pb-8">
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
