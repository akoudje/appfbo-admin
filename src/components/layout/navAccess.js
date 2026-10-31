// admin-app/src/components/layout/navAccess.js
// Visibilité d'une entrée de navigation (menu latéral, onglets de page) selon
// le rôle, les droits et l'espace de travail. Partagé par Sidebar et PageTabs.
import { hasPermission } from "../../auth/permissions";
import { getWorkspaceNavKeys, shouldShowDashboard } from "../../auth/workspaces";

// Fonctions de filtrage améliorées
function itemMatchesPermission(item, role, permissions) {
  if (Array.isArray(item.permissions)) {
    return item.permissions.some((permission) =>
      hasPermission(role, permission, permissions),
    );
  }
  return !item.permission || hasPermission(role, item.permission, permissions);
}

// Un droit accordé explicitement à CET utilisateur (override "permissionAllow"
// depuis la page Utilisateurs, distinct des droits hérités du rôle) doit
// toujours rendre la section correspondante visible, même si la clé de
// workspace du rôle de base ne l'inclut pas par défaut. Sans ce
// contournement, chaque droit spécifique accordé à quelqu'un nécessite en
// plus un correctif de code pour que le menu suive (cf. bugs ADMIN_ASSISTANT
// / Documents FBO et CAISSIERE / Facturation).
function itemHasExplicitOverride(item, permissionAllow) {
  const allow = new Set(Array.isArray(permissionAllow) ? permissionAllow : []);
  if (Array.isArray(item.permissions)) {
    return item.permissions.some((permission) => allow.has(permission));
  }
  return Boolean(item.permission) && allow.has(item.permission);
}

export function filterItems(items, role, permissions, permissionAllow = []) {
  const allowedKeys = getWorkspaceNavKeys(role);

  return items.filter((item) => {
    // Vérification dashboard
    if (item.key === "dashboard" && !shouldShowDashboard(role)) {
      return false;
    }

    // Vérification des rôles autorisés
    if (Array.isArray(item.allowedRoles) && !item.allowedRoles.includes(role)) {
      return false;
    }
    if (Array.isArray(item.deniedRoles) && item.deniedRoles.includes(role)) {
      return false;
    }

    // Vérification des clés de workspace, avec contournement si l'utilisateur
    // a explicitement reçu le droit correspondant (voir itemHasExplicitOverride).
    if (item.key && !allowedKeys.has(item.key)) {
      return (
        itemHasExplicitOverride(item, permissionAllow) &&
        itemMatchesPermission(item, role, permissions)
      );
    }

    return itemMatchesPermission(item, role, permissions);
  });
}

