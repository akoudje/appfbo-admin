// CreateProductModal.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import ProductThumb from "./ProductThumb";

export default function CreateProductModal({
  open,
  mode = "create",
  initialValues = null,
  onClose,
  onSubmit,
  onUploadImage,
  loading,
}) {
  const isEdit = mode === "edit";
  const formRef = useRef(null);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const [form, setForm] = useState({
    sku: "",
    nom: "",
    prixBaseFcfa: "",
    cc: "",
    poidsKg: "",
    actif: true,
    imageUrl: "",
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) return;

    if (isEdit && initialValues) {
      setForm({
        sku: initialValues.sku || "",
        nom: initialValues.nom || "",
        prixBaseFcfa: String(initialValues.prixBaseFcfa ?? ""),
        cc: String(initialValues.cc ?? "0.000"),
        poidsKg: String(initialValues.poidsKg ?? "0.000"),
        actif: Boolean(initialValues.actif),
        imageUrl: initialValues.imageUrl || "",
      });
    } else {
      setForm({
        sku: "",
        nom: "",
        prixBaseFcfa: "",
        cc: "",
        poidsKg: "",
        actif: true,
        imageUrl: "",
      });
    }
    setErrors({});
    setTouched({});
  }, [open, isEdit, initialValues]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [loading, onClose]);

  // Validation
  const validateField = (name, value) => {
    switch (name) {
      case 'sku':
        return !value.trim() ? "Le SKU est requis" : "";
      case 'nom':
        return !value.trim() ? "Le nom est requis" : "";
      case 'prixBaseFcfa':
        if (value === "" || value === null) return "Le prix est requis";
        if (Number(value) < 0) return "Le prix doit être positif";
        return "";
      case 'cc':
        if (value === "" || value === null) return "Le CC est requis";
        if (Number(value) < 0) return "Le CC doit être positif";
        return "";
      case 'poidsKg':
        if (value === "" || value === null) return "Le poids est requis";
        if (Number(value) < 0) return "Le poids doit être positif";
        return "";
      default:
        return "";
    }
  };

  const validateForm = useMemo(() => {
    const newErrors = {
      sku: validateField('sku', form.sku),
      nom: validateField('nom', form.nom),
      prixBaseFcfa: validateField('prixBaseFcfa', form.prixBaseFcfa),
      cc: validateField('cc', form.cc),
      poidsKg: validateField('poidsKg', form.poidsKg),
    };
    return newErrors;
  }, [form]);

  const hasErrors = Object.values(validateForm).some(error => error !== "");
  const canSubmit = !hasErrors && Object.keys(touched).length > 0;

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, form[field]);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error while typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const submit = async () => {
    // Mark all fields as touched
    const allTouched = Object.keys(form).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);
    
    // Validate all fields
    const validationErrors = {
      sku: validateField('sku', form.sku),
      nom: validateField('nom', form.nom),
      prixBaseFcfa: validateField('prixBaseFcfa', form.prixBaseFcfa),
      cc: validateField('cc', form.cc),
      poidsKg: validateField('poidsKg', form.poidsKg),
    };
    setErrors(validationErrors);

    if (Object.values(validationErrors).some(error => error !== "")) {
      // Scroll to first error
      formRef.current?.querySelector('.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    await onSubmit({
      sku: form.sku.trim(),
      nom: form.nom.trim(),
      prixBaseFcfa: Number(form.prixBaseFcfa),
      cc: form.cc,
      poidsKg: form.poidsKg,
      actif: Boolean(form.actif),
      imageUrl: form.imageUrl ? String(form.imageUrl).trim() : null,
    });
  };

  const handleImageUpload = async (file) => {
    if (!file || !onUploadImage) return;
    try {
      const imageUrl = await onUploadImage(file);
      setForm(prev => ({ ...prev, imageUrl: imageUrl || "" }));
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    setForm(prev => ({ ...prev, imageUrl: pastedText }));
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={formRef}
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl animate-slideUp"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
              {isEdit ? "Modifier le produit" : "Nouveau produit"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit ? "Modifiez les informations du produit" : "Remplissez les informations du nouveau produit"}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Image Section */}
          <div className="flex items-start gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-lg overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
                <ProductThumb 
                  url={form.imageUrl} 
                  alt={form.nom || "Aperçu"}
                  className="w-full h-full object-cover"
                />
              </div>
              {form.imageUrl && (
                <button
                  onClick={() => setForm(prev => ({ ...prev, imageUrl: "" }))}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  title="Supprimer l'image"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            <div className="flex-1 space-y-2">
              <p className="text-sm text-gray-600">
                {onUploadImage ? "Téléchargez une image ou collez une URL" : "Collez une URL d'image"}
              </p>
              <div className="flex gap-2">
                {onUploadImage && (
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Choisir un fichier
                    </span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      disabled={loading}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) await handleImageUpload(file);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Image URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL de l'image
            </label>
            <div className="relative">
              <input
                className={`w-full px-4 py-2 border rounded-lg transition-all ${
                  errors.imageUrl && touched.imageUrl
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
                placeholder="https://exemple.com/image.jpg"
                value={form.imageUrl}
                onChange={(e) => handleChange('imageUrl', e.target.value)}
                onBlur={() => handleBlur('imageUrl')}
                onPaste={handlePaste}
                disabled={loading}
              />
              {form.imageUrl && (
                <button
                  onClick={() => handleChange('imageUrl', '')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Form Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SKU */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                SKU <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full px-4 py-2 border rounded-lg transition-all ${
                  errors.sku && touched.sku
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
                value={form.sku}
                onChange={(e) => handleChange('sku', e.target.value)}
                onBlur={() => handleBlur('sku')}
                disabled={loading}
                placeholder="ex: PROD-001"
              />
              {errors.sku && touched.sku && (
                <p className="mt-1 text-xs text-red-600">{errors.sku}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix de base (FCFA) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  className={`w-full px-4 py-2 border rounded-lg transition-all ${
                    errors.prixBaseFcfa && touched.prixBaseFcfa
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  type="number"
                  min="0"
                  step="10"
                  value={form.prixBaseFcfa}
                  onChange={(e) => handleChange('prixBaseFcfa', e.target.value)}
                  onBlur={() => handleBlur('prixBaseFcfa')}
                  disabled={loading}
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  FCFA
                </span>
              </div>
              {errors.prixBaseFcfa && touched.prixBaseFcfa && (
                <p className="mt-1 text-xs text-red-600">{errors.prixBaseFcfa}</p>
              )}
            </div>

            {/* Name (full width) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full px-4 py-2 border rounded-lg transition-all ${
                  errors.nom && touched.nom
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
                value={form.nom}
                onChange={(e) => handleChange('nom', e.target.value)}
                onBlur={() => handleBlur('nom')}
                disabled={loading}
                placeholder="Nom du produit"
              />
              {errors.nom && touched.nom && (
                <p className="mt-1 text-xs text-red-600">{errors.nom}</p>
              )}
            </div>

            {/* CC */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Coefficient CC <span className="text-red-500">*</span>
              </label>
              <input
                className={`w-full px-4 py-2 border rounded-lg transition-all ${
                  errors.cc && touched.cc
                    ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                }`}
                type="number"
                step="0.001"
                min="0"
                value={form.cc}
                onChange={(e) => handleChange('cc', e.target.value)}
                onBlur={() => handleBlur('cc')}
                disabled={loading}
                placeholder="0.000"
              />
              {errors.cc && touched.cc && (
                <p className="mt-1 text-xs text-red-600">{errors.cc}</p>
              )}
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Poids (Kg) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  className={`w-full px-4 py-2 border rounded-lg transition-all ${
                    errors.poidsKg && touched.poidsKg
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                      : 'border-gray-300 focus:ring-blue-500/20 focus:border-blue-500'
                  }`}
                  type="number"
                  step="0.001"
                  min="0"
                  value={form.poidsKg}
                  onChange={(e) => handleChange('poidsKg', e.target.value)}
                  onBlur={() => handleBlur('poidsKg')}
                  disabled={loading}
                  placeholder="0.000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  kg
                </span>
              </div>
              {errors.poidsKg && touched.poidsKg && (
                <p className="mt-1 text-xs text-red-600">{errors.poidsKg}</p>
              )}
            </div>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Statut du produit</p>
              <p className="text-sm text-gray-500">
                {form.actif 
                  ? "Le produit est visible et disponible à la vente" 
                  : "Le produit est masqué et non disponible"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(prev => ({ ...prev, actif: !prev.actif }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.actif ? 'bg-blue-600' : 'bg-gray-300'
              }`}
              disabled={loading}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.actif ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Required Fields Note */}
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span className="text-red-500">*</span>
            <span>Champs requis</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-gray-50 border-t border-gray-100">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={loading || !canSubmit}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{isEdit ? "Mise à jour..." : "Création..."}</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isEdit ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  )}
                </svg>
                <span>{isEdit ? "Mettre à jour" : "Créer le produit"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}