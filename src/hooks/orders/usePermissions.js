// admin-app/src/hooks/usePermission.js
// ce hook permet de vérifier les permissions d'un admin pour conditionner l'affichage de certaines fonctionnalités dans l'interface d'administration. Il utilise le hook `useAdminAuth` pour récupérer les informations de l'admin courant, notamment son rôle et ses permissions, et expose des fonctions pour vérifier si l'admin a une permission spécifique ou au moins une permission parmi une liste donnée.
// Le hook `usePermission` prend une permission en argument et retourne un booléen indiquant si l'admin a cette permission. Le hook `useAnyPermission` prend une liste de permissions et retourne un booléen indiquant si l'admin a au moins une de ces permissions. Ces hooks sont utiles pour conditionner l'affichage de composants ou de fonctionnalités dans l'interface d'administration en fonction des permissions de l'admin connecté.

import useAdminAuth from "./useAdminAuth";
import { hasPermission, hasAnyPermission } from "../auth/permissions";

export function usePermission(permission) {
  const { role, permissions } = useAdminAuth();
  return hasPermission(role, permission, permissions);
}

export function useAnyPermission(permissionList = []) {
  const { role, permissions } = useAdminAuth();
  return hasAnyPermission(role, permissionList, permissions);
}