// ProductThumb.jsx
// Ce composant affiche une miniature d'image pour un produit. Si l'URL est invalide ou absente, il affiche un placeholder.

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

export default function ProductThumb({ url, alt }) {
  const raw = url && String(url).trim() ? String(url).trim() : "";

  const src =
    raw && /^https?:\/\//i.test(raw)
      ? raw
      : raw
      ? `${BACKEND_ORIGIN}${raw}`
      : "";

  if (!src) {
    return (
      <div className="h-10 w-10 rounded-xl border bg-gray-50 flex items-center justify-center text-xs text-gray-400">
        —
      </div>
    );
  }

  return (
    <a href={src} target="_blank" rel="noreferrer" title="Ouvrir l'image">
      <img
        src={src}
        alt={alt || "product"}
        className="h-10 w-10 rounded-xl border object-cover bg-white"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </a>
  );
}
