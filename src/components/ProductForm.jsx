import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Save, Upload } from "lucide-react";
import { useConfirm } from "../hooks/useDialogs";
import ProductThumb from "./ProductThumb";
import ProductPageHeader from "./products/ProductPageHeader";
import { getCountryCode } from "../services/api";
import {
  CATEGORIES,
  GRADES,
  formValues,
  validateProduct,
  productPayload,
} from "../lib/products/productModel";
const inputClass =
  "min-h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:bg-gray-50 disabled:text-gray-500";
export default function ProductForm({
  mode = "create",
  initialValues,
  onSubmit,
  loading = false,
  onReload,
}) {
  const editing = mode === "edit",
    navigate = useNavigate(),
    confirm = useConfirm(),
    country = getCountryCode();
  const [form, setForm] = useState(() => formValues(initialValues)),
    [errors, setErrors] = useState({}),
    [message, setMessage] = useState(""),
    [file, setFile] = useState(null);
  const initial = useRef(formValues(initialValues)),
    saving = useRef(false),
    formRef = useRef(null);
  const dirty =
    JSON.stringify(form) !== JSON.stringify(initial.current) || !!file;
  useEffect(() => {
    const guard = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  useEffect(() => {
    const intercept = async (e) => {
      const anchor = e.target.closest?.("a[href]");
      if (
        !dirty ||
        !anchor ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        anchor.target === "_blank"
      )
        return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      e.preventDefault();
      e.stopPropagation();
      if (
        await confirm({
          title: "Quitter cette fiche ?",
          message: "Vos modifications non enregistrées seront perdues.",
          confirmLabel: "Quitter",
          tone: "warning",
        })
      )
        navigate(
          url.hash.startsWith("#/")
            ? url.hash.slice(1)
            : url.pathname + url.search,
        );
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [dirty, confirm, navigate]);
  useEffect(
    () => () => {
      if (form.imageUrl?.startsWith("blob:"))
        URL.revokeObjectURL(form.imageUrl);
    },
    [form.imageUrl],
  );
  function change(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
    setMessage("");
    setErrors((p) => ({ ...p, [key]: "" }));
  }
  async function leave() {
    if (
      !dirty ||
      (await confirm({
        title: "Quitter cette fiche ?",
        message: "Vos modifications non enregistrées seront perdues.",
        confirmLabel: "Quitter",
        tone: "warning",
      }))
    )
      navigate(initialValues?.returnTo || "/products");
  }
  async function submit(e) {
    e.preventDefault();
    if (saving.current) return;
    const invalid = validateProduct(form, editing);
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      setMessage("Vérifiez les champs signalés.");
      setTimeout(
        () => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(),
        0,
      );
      return;
    }
    saving.current = true;
    setMessage("");
    try {
      const result = await onSubmit(
        productPayload(form, initial.current, editing),
        { imageFile: file },
      );
      if (result?.ok === false) {
        setMessage(result.message);
        return;
      }
      initial.current = { ...form };
      setFile(null);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Impossible d’enregistrer. Vos saisies sont conservées.",
      );
    } finally {
      saving.current = false;
    }
  }
  function chooseImage(selected) {
    if (!selected) return;
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(selected.type) ||
      selected.size > 5 * 1024 * 1024
    ) {
      setMessage("Choisissez une image PNG, JPEG ou WebP de 5 Mo maximum.");
      return;
    }
    setFile(selected);
    change("imageUrl", URL.createObjectURL(selected));
  }
  function field(key, label, type = "text", options = {}) {
    return (
      <div>
        <label
          htmlFor={`product-${key}`}
          className="mb-1 block text-xs font-medium text-gray-600"
        >
          {label}
        </label>
        <input
          id={`product-${key}`}
          type={type}
          value={form[key] ?? ""}
          onChange={(e) => change(key, e.target.value)}
          disabled={loading || options.disabled}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `error-${key}` : undefined}
          className={inputClass}
          {...options}
        />
        {errors[key] && (
          <p id={`error-${key}`} className="mt-1 text-xs text-red-700">
            {errors[key]}
          </p>
        )}
      </div>
    );
  }
  return (
    <form ref={formRef} onSubmit={submit} className="space-y-5">
      <ProductPageHeader
        title={editing ? "Modifier le produit" : "Nouveau produit"}
        description={`Catalogue · ${country}`}
      >
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">
          {dirty
            ? "Modifications non enregistrées"
            : editing
              ? "Fiche à jour"
              : "Fiche à compléter"}
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={leave}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-3 py-2 text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Retour à la liste
        </button>
      </ProductPageHeader>
      <div className="space-y-5">
        {message && (
          <p
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            {message}
          </p>
        )}
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">
            Informations communes
          </h2>
          <fieldset className="mt-4 space-y-4">
            <legend className="sr-only">Informations communes</legend>
            <p className="text-sm text-gray-500">
              Ces informations et l’image sont partagées par tous les pays où ce
              produit est proposé.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {field("sku", "Référence produit (SKU)", "text", {
                maxLength: 100,
                required: true,
              })}
              {field("nom", "Nom du produit", "text", {
                maxLength: 250,
                required: true,
              })}
              <div>
                <label
                  htmlFor="product-category"
                  className="mb-1 block text-xs font-medium text-gray-600"
                >
                  Catégorie
                </label>
                <select
                  id="product-category"
                  value={form.category}
                  disabled={loading}
                  onChange={(e) => change("category", e.target.value)}
                  className={inputClass}
                >
                  {CATEGORIES.filter(([key]) => key).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              {field("cc", "Coefficient CC", "text", { inputMode: "decimal" })}
              {field("poidsKg", "Poids (kg)", "text", { inputMode: "decimal" })}
            </div>
            <div>
              <label
                htmlFor="product-details"
                className="mb-1 block text-xs font-medium text-gray-600"
              >
                Description
              </label>
              <textarea
                id="product-details"
                rows={4}
                maxLength={20000}
                value={form.details || ""}
                disabled={loading}
                onChange={(e) => change("details", e.target.value)}
                className={inputClass}
              />
              {errors.details && (
                <p className="text-xs text-red-700">{errors.details}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <ProductThumb
                url={form.imageUrl}
                alt={form.nom || "Aperçu du produit"}
                className="h-28 w-28 rounded-xl border border-gray-200 bg-white object-contain"
              />
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus-within:ring-2 focus-within:ring-[#FFC600]/40">
                  <Upload size={16} aria-hidden="true" />
                  {form.imageUrl
                    ? "Choisir une autre image"
                    : "Ajouter une image"}
                  <input
                    aria-label="Choisir une image produit"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={loading}
                    className="sr-only"
                    onChange={(e) => {
                      chooseImage(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
                {form.imageUrl && (
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      setFile(null);
                      change("imageUrl", "");
                    }}
                    className="ml-2 text-sm text-red-700"
                  >
                    Retirer
                  </button>
                )}
                <p className="text-xs text-gray-500">
                  PNG, JPEG ou WebP · 5 Mo maximum. L’image sera envoyée lors de
                  l’enregistrement.
                </p>
              </div>
            </div>
          </fieldset>
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">
            Tarifs · {country}
          </h2>
          <fieldset className="mt-4 space-y-4">
            <legend className="sr-only">Tarifs · {country}</legend>
            <p className="text-sm text-gray-500">
              Ces tarifs s’appliquent uniquement au pays sélectionné.
            </p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {field("prixBaseFcfa", "Prix de base (FCFA)", "text", {
                inputMode: "numeric",
                required: true,
              })}
            </div>
            {["CIV", "BFA"].includes(country) && (
              <>
                <p className="text-sm text-gray-600">
                  Tarifs par grade. Une valeur vide retire le tarif spécifique ;
                  le calcul de secours configuré pour ce pays s’appliquera.
                </p>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {GRADES.map(([key, label]) => (
                    <div key={key}>
                      <label
                        htmlFor={`grade-${key}`}
                        className="mb-1 block text-xs font-medium text-gray-600"
                      >
                        {label}
                      </label>
                      <input
                        id={`grade-${key}`}
                        inputMode="decimal"
                        value={form.gradePrices[key]}
                        disabled={loading}
                        aria-invalid={!!errors[`grade.${key}`]}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            gradePrices: {
                              ...p.gradePrices,
                              [key]: e.target.value,
                            },
                          }))
                        }
                        className={inputClass}
                      />
                      {errors[`grade.${key}`] && (
                        <p className="mt-1 text-xs text-red-700">
                          {errors[`grade.${key}`]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </fieldset>
        </section>
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-950">
            Disponibilité · {country}
          </h2>
          <fieldset className="mt-4 space-y-4">
            <legend className="sr-only">Disponibilité · {country}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {editing ? (
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">Stock disponible</p>
                  <p className="mt-1 text-2xl font-semibold">{form.stockQty}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Les ajustements de stock se font depuis la liste produits
                    avec un motif.
                  </p>
                </div>
              ) : (
                field("stockQty", "Stock initial", "text", {
                  inputMode: "numeric",
                })
              )}
              {field("maxQtyPerOrder", "Limite par commande", "text", {
                inputMode: "numeric",
                placeholder: "Limite globale du pays",
              })}
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 p-4">
              <input
                type="checkbox"
                checked={form.actif}
                disabled={loading}
                onChange={(e) => change("actif", e.target.checked)}
                className="h-5 w-5 accent-[#FFC600]"
              />
              <span>
                <span className="block font-medium">Actif dans ce pays</span>
                <span className="text-sm text-gray-500">
                  L’activation et la quantité en stock sont deux informations
                  distinctes.
                </span>
              </span>
            </label>
          </fieldset>
        </section>
      </div>
      <footer className="sticky bottom-14 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-sm backdrop-blur md:bottom-0">
        {editing && onReload && (
          <button
            type="button"
            disabled={loading}
            onClick={async () => {
              if (
                !dirty ||
                (await confirm({
                  title: "Recharger cette fiche ?",
                  message: "Les saisies non enregistrées seront perdues.",
                  confirmLabel: "Recharger",
                  tone: "warning",
                }))
              )
                onReload();
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={16} aria-hidden="true" />
            Recharger la fiche
          </button>
        )}
        <button
          type="submit"
          disabled={loading || !dirty}
          className="inline-flex items-center gap-2 rounded-lg bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black hover:bg-[#e6b200] disabled:opacity-50"
        >
          <Save size={16} aria-hidden="true" />
          {loading
            ? "Enregistrement…"
            : editing
              ? "Enregistrer les modifications"
              : "Créer le produit"}
        </button>
      </footer>
    </form>
  );
}
