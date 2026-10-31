// admin-app/src/components/layout/PageTabs.jsx
// Onglets en haut des pages regroupées sous une même entrée du menu
// (navGroups.js). Rien n'est affiché si l'utilisateur n'a accès qu'à une
// seule page du groupe.
import { NavLink, useLocation } from "react-router-dom";
import useAdminAuth from "../../hooks/useAdminAuth";
import { filterItems } from "./navAccess";
import { findNavGroup } from "./navGroups";

export default function PageTabs() {
  const { pathname } = useLocation();
  const { role, permissions, permissionAllow } = useAdminAuth();
  const group = findNavGroup(pathname);
  if (!group) return null;

  const tabs = filterItems(group, role, permissions, permissionAllow);
  if (tabs.length < 2) return null;

  return (
    <nav className="mb-4 overflow-x-auto" aria-label="Pages de la rubrique">
      <div className="inline-flex min-w-max rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end
            className={({ isActive }) =>
              `rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap ${
                isActive ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
