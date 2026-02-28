// src/components/ProductForm.jsx

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ProductThumb from "./ProductThumb";

const DEFAULT_CATEGORIES = [
  { value: "NON_CLASSE", label: "Non classé" },
  { value: "BUVABLE", label: "Buvable" },
  { value: "COMBO_PACKS", label: "Combo Packs" },
  { value: "GESTION_DE_POIDS", label: "Gestion de poids" },
  { value: "NUTRITION", label: "Nutrition" },
  { value: "PRODUIT_DE_LA_ROCHE", label: "Produit de la ruche" },
  { value: "SOINS_DE_LA_PEAU", label: "Soins de la peau" },
  { value: "SOINS_PERSONNELS", label: "Soins personnels" },
];

function validateField(name, value) {
  switch (name) {
    case "sku":
      return !String(value || "").trim() ? "Le SKU est requis" : "";
    case "nom":
      return !String(value || "").trim() ? "Le nom est requis" : "";
    case "prixBaseFcfa":
      if (value === "" || value === null) return "Le prix est requis";
      if (!Number.isFinite(Number(value))) return "Le prix est invalide";
      if (Number(value) < 0) return "Le prix doit être positif";
      return "";
    case "cc":
      if (value === "" || value === null) return "Le CC est requis";
      if (!Number.isFinite(Number(value))) return "Le CC est invalide";
      if (Number(value) < 0) return "Le CC doit être positif";
      return "";
    case "poidsKg":
      if (value === "" || value === null) return "Le poids est requis";
      if (!Number.isFinite(Number(value))) return "Le poids est invalide";
      if (Number(value) < 0) return "Le poids doit être positif";
      return "";
    case "stockQty":
      if (value === "" || value === null) return "";
      if (!Number.isFinite(Number(value))) return "Le stock est invalide";
      if (Number(value) < 0) return "Le stock doit être ≥ 0";
      if (!Number.isInteger(Number(value))) return "Le stock doit être un entier";
      return "";
    case "category":
      return !String(value || "").trim() ? "La catégorie est requise" : "";
    default:
      return "";
  }
}

function toFixed3Safe(v) {
  if (v === "" || v === null || v === undefined) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return n.toFixed(3);
}

function maskUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.hostname}/…`;
  } catch {
    return "URL invalide";
  }
}

function imageSourceTag(url) {
  if (!url)
    return { label: "Aucune image", cls: "bg-gray-100 text-gray-700 border-gray-200" };
  if (/cloudinary\.com/i.test(url)) {
    return { label: "Cloudinary", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  return { label: "Externe", cls: "bg-amber-50 text-amber-700 border-amber-200" };
}

function extractApiErrorMessage(e) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Une erreur est survenue. Réessaie."
  );
}

function InlineAlert({ type = "success", title, message, onClose }) {
  const styles =
    type === "success"
      ? {
          wrap: "border-emerald-200 bg-emerald-50",
          title: "text-emerald-900",
          text: "text-emerald-800",
          icon: (
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
        }
      : {
          wrap: "border-red-200 bg-red-50",
          title: "text-red-900",
          text: "text-red-800",
          icon: (
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
        };

  return (
    <div className={`border rounded-xl p-4 flex items-start gap-3 ${styles.wrap}`}>
      <div className="mt-0.5">{styles.icon}</div>
      <div className="flex-1 min-w-0">
        {title && <div className={`text-sm font-semibold ${styles.title}`}>{title}</div>}
        {message && <div className={`text-sm mt-0.5 ${styles.text}`}>{message}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

export default function ProductForm({
  mode = "create", // "create" | "edit"
  initialValues,
  onSubmit, // peut throw OU retourner { ok:boolean, message?:string }
  onUploadImage, // (file) => Promise<string imageUrl>
  loading,
  categoryOptions,
}) {
  const navigate = useNavigate();
  const isEdit = mode === "edit";

  const categories =
    Array.isArray(categoryOptions) && categoryOptions.length ? categoryOptions : DEFAULT_CATEGORIES;

  const [form, setForm] = useState({
    sku: "",
    nom: "",
    prixBaseFcfa: "",
    cc: "0.000",
    poidsKg: "0.000",
    actif: true,
    imageUrl: "",
    category: "NON_CLASSE",
    stockQty: "0",
    details: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [uploadBusy, setUploadBusy] = useState(false);
  const [revealUrl, setRevealUrl] = useState(false);

  // ✅ Feedback UI
  const [banner, setBanner] = useState(null); // { type: 'success'|'error', title, message }

  // snapshot pour dirty-check (edit)
  const initialSnapshotRef = useRef(null);

  useEffect(() => {
    if (isEdit && initialValues) {
      const next = {
        sku: initialValues.sku || "",
        nom: initialValues.nom || "",
        prixBaseFcfa: String(initialValues.prixBaseFcfa ?? ""),
        cc: String(initialValues.cc ?? "0.000"),
        poidsKg: String(initialValues.poidsKg ?? "0.000"),
        actif: Boolean(initialValues.actif),
        imageUrl: initialValues.imageUrl || "",
        category: initialValues.category || "NON_CLASSE",
        stockQty: String(initialValues.stockQty ?? 0),
        details: initialValues.details || "",
      };
      setForm(next);
      initialSnapshotRef.current = next;
    } else {
      const next = {
        sku: "",
        nom: "",
        prixBaseFcfa: "",
        cc: "0.000",
        poidsKg: "0.000",
        actif: true,
        imageUrl: "",
        category: "NON_CLASSE",
        stockQty: "0",
        details: "",
      };
      setForm(next);
      initialSnapshotRef.current = next;
    }

    setErrors({});
    setTouched({});
    setRevealUrl(false);
    setBanner(null);
  }, [isEdit, initialValues]);

  const validateForm = useMemo(() => {
    return {
      sku: validateField("sku", form.sku),
      nom: validateField("nom", form.nom),
      prixBaseFcfa: validateField("prixBaseFcfa", form.prixBaseFcfa),
      cc: validateField("cc", form.cc),
      poidsKg: validateField("poidsKg", form.poidsKg),
      category: validateField("category", form.category),
      stockQty: validateField("stockQty", form.stockQty),
    };
  }, [form]);

  const hasErrors = Object.values(validateForm).some((x) => x);

  const isDirty = useMemo(() => {
    const snap = initialSnapshotRef.current;
    if (!snap) return true;
    const keys = Object.keys(snap);
    for (const k of keys) {
      if (String(snap[k] ?? "") !== String(form[k] ?? "")) return true;
    }
    return false;
  }, [form]);

  const canSubmit = !hasErrors && (isEdit ? isDirty : Object.keys(touched).length > 0);

  const handleChange = (field, value) => {
    setForm((p) => ({ ...p, [field]: value }));
    setTouched((p) => ({ ...p, [field]: true }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: "" }));
    if (banner) setBanner(null);
  };

  const handleBlur = (field) => {
    setTouched((p) => ({ ...p, [field]: true }));
    setErrors((p) => ({ ...p, [field]: validateField(field, form[field]) }));

    if (field === "cc" || field === "poidsKg") {
      setForm((p) => ({ ...p, [field]: toFixed3Safe(p[field]) }));
    }
  };

  const submit = async () => {
    const allTouched = Object.keys(form).reduce((acc, k) => ((acc[k] = true), acc), {});
    setTouched(allTouched);

    const validationErrors = {
      sku: validateField("sku", form.sku),
      nom: validateField("nom", form.nom),
      prixBaseFcfa: validateField("prixBaseFcfa", form.prixBaseFcfa),
      cc: validateField("cc", form.cc),
      poidsKg: validateField("poidsKg", form.poidsKg),
      category: validateField("category", form.category),
      stockQty: validateField("stockQty", form.stockQty),
    };
    setErrors(validationErrors);
    if (Object.values(validationErrors).some((e) => e)) {
      setBanner({
        type: "error",
        title: "Vérifie les champs",
        message: "Certains champs sont invalides. Corrige puis réessaie.",
      });
      return;
    }

    try {
      setBanner(null);

      const result = await onSubmit?.({
        sku: form.sku.trim(),
        nom: form.nom.trim(),
        prixBaseFcfa: Number(form.prixBaseFcfa),
        cc: String(form.cc),
        poidsKg: String(form.poidsKg),
        actif: Boolean(form.actif),
        imageUrl: form.imageUrl ? String(form.imageUrl).trim() : null,
        category: form.category || "NON_CLASSE",
        details: form.details ? String(form.details) : null,
        stockQty: Number(form.stockQty ?? 0),
      });

      // Support 2 contrats :
      // 1) onSubmit throw => catch
      // 2) onSubmit retourne {ok:false,message}
      if (result && typeof result === "object" && result.ok === false) {
        setBanner({
          type: "error",
          title: "Opération échouée",
          message: result.message || "Impossible d’enregistrer. Réessaie.",
        });
        return;
      }

      // ✅ succès
      setBanner({
        type: "success",
        title: isEdit ? "Produit mis à jour" : "Produit créé",
        message: isEdit
          ? "Les modifications ont été enregistrées avec succès."
          : "Le produit a été créé avec succès.",
      });

      initialSnapshotRef.current = { ...form };
      setTouched({});
      setErrors({});
    } catch (e) {
      const msg = extractApiErrorMessage(e);
      setBanner({
        type: "error",
        title: "Opération échouée",
        message: msg,
      });
    }
  };

  const uploadImage = async (file) => {
    if (!file || !onUploadImage) return;
    setUploadBusy(true);
    try {
      setBanner(null);
      const url = await onUploadImage(file);
      handleChange("imageUrl", url || "");
      setBanner({
        type: "success",
        title: "Image mise à jour",
        message: "L’image du produit a été mise à jour avec succès.",
      });
    } catch (e) {
      setBanner({
        type: "error",
        title: "Upload échoué",
        message: extractApiErrorMessage(e),
      });
    } finally {
      setUploadBusy(false);
    }
  };

  const imgTag = imageSourceTag(form.imageUrl);

  // ✅ upload seulement en EDIT (page dédiée)
  const uploadDisabled = !isEdit || !onUploadImage || loading || uploadBusy;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isEdit ? "Modifier le produit" : "Créer un produit"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isEdit
              ? "Mettez à jour les informations et l’image."
              : "Renseignez les champs puis créez. L’upload image se fait sur la page d’édition."}
          </p>
        </div>

        {isEdit && (
          <span
            className={`text-xs px-3 py-1 rounded-full border ${
              isDirty
                ? "bg-amber-50 text-amber-700 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
            title={isDirty ? "Modifications non enregistrées" : "Aucun changement"}
          >
            {isDirty ? "Non enregistré" : "À jour"}
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* ✅ Banner feedback */}
        {banner && (
          <InlineAlert
            type={banner.type}
            title={banner.title}
            message={banner.message}
            onClose={() => setBanner(null)}
          />
        )}

        {/* Image */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-44">
            <div className="w-44 aspect-square rounded-xl overflow-hidden border border-gray-200 bg-gray-50 relative">
              <ProductThumb
                url={form.imageUrl}
                alt={form.nom || "Aperçu"}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2">
                <span className={`text-[11px] px-2 py-1 rounded-full border ${imgTag.cls}`}>
                  {imgTag.label}
                </span>
              </div>
            </div>

            {form.imageUrl && (
              <div className="mt-2 text-[11px] text-gray-500">
                Source :{" "}
                <span className="font-mono text-gray-700">
                  {revealUrl ? form.imageUrl : maskUrl(form.imageUrl)}
                </span>{" "}
                <button
                  type="button"
                  className="ml-2 text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => setRevealUrl((v) => !v)}
                >
                  {revealUrl ? "Masquer" : "Afficher"}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="text-sm text-gray-700 mb-2">
              Image produit (admin).
              {!isEdit && (
                <span className="text-gray-500">
                  {" "}
                  — Modification uniquement sur la page d’édition.
                </span>
              )}
            </p>

            <div className="flex flex-wrap gap-2">
              <label
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white transition ${
                  uploadDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-gray-50"
                }`}
                title={!isEdit ? "Upload disponible uniquement en édition" : ""}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  disabled={uploadDisabled}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (f) uploadImage(f);
                  }}
                />
                <span className="text-sm font-medium text-gray-700">
                  {uploadBusy
                    ? "Upload..."
                    : form.imageUrl
                    ? "Remplacer l’image"
                    : "Télécharger une image"}
                </span>
              </label>

              {form.imageUrl && isEdit && (
                <button
                  type="button"
                  onClick={() => handleChange("imageUrl", "")}
                  disabled={loading || uploadBusy}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Retirer l’image
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate("/products")}
                disabled={loading || uploadBusy}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Retour à la liste
              </button>
            </div>

            {form.imageUrl && /cloudinary\.com/i.test(form.imageUrl) === false && (
              <div className="mt-3 p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                ⚠️ Image externe détectée. Pour éviter les liens instables, privilégie l’upload Cloudinary côté admin.
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              Reco : image carrée, PNG/JPG/WebP, bonne résolution (min 800×800).
            </p>
          </div>
        </div>

        {/* Category + stock */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={errors.category && touched.category ? "error" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Catégorie <span className="text-red-500">*</span>
            </label>
            <select
              className={`w-full px-4 py-2 border rounded-lg ${
                errors.category && touched.category ? "border-red-300" : "border-gray-300"
              }`}
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              onBlur={() => handleBlur("category")}
              disabled={loading}
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category && touched.category && (
              <p className="mt-1 text-xs text-red-600">{errors.category}</p>
            )}
          </div>

          <div className={errors.stockQty && touched.stockQty ? "error" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stock disponible
            </label>
            <input
              className={`w-full px-4 py-2 border rounded-lg ${
                errors.stockQty && touched.stockQty ? "border-red-300" : "border-gray-300"
              }`}
              type="number"
              min="0"
              step="1"
              value={form.stockQty}
              onChange={(e) => handleChange("stockQty", e.target.value)}
              onBlur={() => handleBlur("stockQty")}
              disabled={loading}
              placeholder="0"
            />
            {errors.stockQty && touched.stockQty && (
              <p className="mt-1 text-xs text-red-600">{errors.stockQty}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">0 = rupture (filtrable côté public)</p>
          </div>
        </div>

        {/* details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Détails du produit</label>
          <textarea
            className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[120px] resize-y"
            value={form.details}
            onChange={(e) => handleChange("details", e.target.value)}
            disabled={loading}
            placeholder="Description longue, conseils d’utilisation, bénéfices…"
          />
        </div>

        {/* core fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={errors.sku && touched.sku ? "error" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-4 py-2 border rounded-lg ${
                errors.sku && touched.sku ? "border-red-300" : "border-gray-300"
              }`}
              value={form.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              onBlur={() => handleBlur("sku")}
              disabled={loading}
            />
            {errors.sku && touched.sku && (
              <p className="mt-1 text-xs text-red-600">{errors.sku}</p>
            )}
          </div>

          <div className={errors.prixBaseFcfa && touched.prixBaseFcfa ? "error" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prix de base (FCFA) <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-4 py-2 border rounded-lg ${
                errors.prixBaseFcfa && touched.prixBaseFcfa ? "border-red-300" : "border-gray-300"
              }`}
              type="number"
              min="0"
              step="10"
              value={form.prixBaseFcfa}
              onChange={(e) => handleChange("prixBaseFcfa", e.target.value)}
              onBlur={() => handleBlur("prixBaseFcfa")}
              disabled={loading}
            />
            {errors.prixBaseFcfa && touched.prixBaseFcfa && (
              <p className="mt-1 text-xs text-red-600">{errors.prixBaseFcfa}</p>
            )}
          </div>

          <div className={`md:col-span-2 ${errors.nom && touched.nom ? "error" : ""}`}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nom du produit <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-4 py-2 border rounded-lg ${
                errors.nom && touched.nom ? "border-red-300" : "border-gray-300"
              }`}
              value={form.nom}
              onChange={(e) => handleChange("nom", e.target.value)}
              onBlur={() => handleBlur("nom")}
              disabled={loading}
            />
            {errors.nom && touched.nom && (
              <p className="mt-1 text-xs text-red-600">{errors.nom}</p>
            )}
          </div>

          <div className={errors.cc && touched.cc ? "error" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coefficient CC <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-4 py-2 border rounded-lg ${
                errors.cc && touched.cc ? "border-red-300" : "border-gray-300"
              }`}
              type="number"
              step="0.001"
              min="0"
              value={form.cc}
              onChange={(e) => handleChange("cc", e.target.value)}
              onBlur={() => handleBlur("cc")}
              disabled={loading}
            />
            {errors.cc && touched.cc && (
              <p className="mt-1 text-xs text-red-600">{errors.cc}</p>
            )}
          </div>

          <div className={errors.poidsKg && touched.poidsKg ? "error" : ""}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Poids (Kg) <span className="text-red-500">*</span>
            </label>
            <input
              className={`w-full px-4 py-2 border rounded-lg ${
                errors.poidsKg && touched.poidsKg ? "border-red-300" : "border-gray-300"
              }`}
              type="number"
              step="0.001"
              min="0"
              value={form.poidsKg}
              onChange={(e) => handleChange("poidsKg", e.target.value)}
              onBlur={() => handleBlur("poidsKg")}
              disabled={loading}
            />
            {errors.poidsKg && touched.poidsKg && (
              <p className="mt-1 text-xs text-red-600">{errors.poidsKg}</p>
            )}
          </div>
        </div>

        {/* actif */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p className="font-medium text-gray-900">Statut du produit</p>
            <p className="text-sm text-gray-500">
              {form.actif ? "Visible et disponible" : "Masqué et non disponible"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleChange("actif", !form.actif)}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              form.actif ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                form.actif ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={loading || !canSubmit}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          title={!canSubmit && isEdit ? "Aucun changement à enregistrer ou erreurs de validation" : ""}
        >
          {isEdit ? "Mettre à jour" : "Créer"}
        </button>
      </div>
    </div>
  );
}