// admin-app/src/components/auth/RequirePermission.jsx
// Ce composant permet de conditionner l'affichage de ses enfants à la possession d'une permission spécifique par l'administrateur connecté. Il utilise le hook `usePermission` pour vérifier si l'administrateur a la permission requise, et affiche soit les enfants du composant, soit un fallback (par défaut null) si l'administrateur n'a pas la permission nécessaire.
// Le composant `RequirePermission` prend en props une permission à vérifier, un composant de fallback à afficher si la permission n'est pas accordée, et les enfants à afficher si la permission est accordée. Il retourne les enfants si l'administrateur a la permission requise, ou le fallback sinon.


import { usePermission } from "../../hooks/usePermission";

export default function RequirePermission({
  permission,
  fallback = null,
  children,
}) {
  const allowed = usePermission(permission);

  if (!allowed) return fallback;
  return children;
}