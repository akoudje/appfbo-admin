// src/components/ProductThumb.jsx
// Ce composant affiche une miniature d'image pour un produit.
// Si l'URL est invalide ou absente, il affiche un placeholder.
// Supporte URL absolue (https://...) ou relative (/uploads/...).

import { useMemo, useState } from "react";

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

function resolveSrc(url) {
  const raw = url && String(url).trim() ? String(url).trim() : "";
  if (!raw) return "";

  // absolute
  if (/^https?:\/\//i.test(raw)) return raw;

  // relative
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  return `${BACKEND_ORIGIN}${path}`;
}

export default function ProductThumb({
  url,
  alt,
  className = "",
  onError,
  clickable = false, // ✅ par défaut: pas de lien
  size = "thumb", // "thumb" | "product" | "large"
}) {
  const [broken, setBroken] = useState(false);

  const src = useMemo(() => resolveSrc(url), [url]);

  const sizeCls =
    size === "large"
      ? "w-full h-full"
      : size === "product"
      ? "w-full h-full"
      : "h-10 w-10";

  const imgCls = `${sizeCls} object-cover bg-white ${className}`.trim();

  const Placeholder = (
    <div
      className={`${sizeCls} flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400`}
      aria-label="Aucune image"
      title="Aucune image"
    >
      <span className="text-xs">—</span>
    </div>
  );

  if (!src || broken) return Placeholder;

  const img = (
    <img
      src={src}
      alt={alt || "product"}
      className={imgCls}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={(e) => {
        setBroken(true);
        onError?.(e);
      }}
    />
  );

  if (!clickable) return img;

  return (
    <a href={src} target="_blank" rel="noreferrer" title="Ouvrir l'image">
      {img}
    </a>
  );
}