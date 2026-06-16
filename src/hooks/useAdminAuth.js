// admin-app/src/hooks/useAdminAuth.js
// ce hook centralise la logique d'authentification de l'administrateur courant dans l'interface d'administration. Il utilise les fonctions de stockage local pour récupérer les informations de l'administrateur connecté, notamment son rôle et ses permissions, et expose ces informations ainsi qu'un indicateur d'authentification pour être utilisé dans les composants de l'interface d'administration.
// Le hook utilise `useMemo` pour éviter de recalculer les permissions à chaque rendu, en se basant sur les informations de l'administrateur récupérées. Il retourne un objet contenant les informations de l'administrateur, son rôle, ses permissions, ainsi qu'un indicateur `isAuthenticated` pour savoir si un administrateur est actuellement connecté.


import { useMemo } from "react";
import { getAdminUser, isAuthed } from "../services/auth";
import { getRolePermissions } from "../auth/permissions";

export default function useAdminAuth() {
  const admin = useMemo(() => getAdminUser(), []);

  const permissions = Array.isArray(admin?.permissions)
    ? admin.permissions
    : getRolePermissions(admin?.role);

  return {
    admin,
    isAuthenticated: isAuthed(),
    role: admin?.role || null,
    permissions,
    fullName: admin?.fullName || null,
    email: admin?.email || null,
    countryId: admin?.countryId || null,
  };
}
