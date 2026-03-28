// src/components/layout/MobileNav.jsx

import { NavLink } from "react-router-dom";
import useAdminAuth from "../../hooks/useAdminAuth";
import { getWorkspaceNavKeys, shouldShowDashboard } from "../../auth/workspaces";

const item = ({ isActive }) =>
  `flex-1 text-center py-3 text-sm ${isActive ? "font-semibold" : "text-gray-600"}`;

export default function MobileNav() {
  const { role } = useAdminAuth();
  const allowed = getWorkspaceNavKeys(role);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex">
      {shouldShowDashboard(role) ? <NavLink to="/dashboard" className={item}>Dashboard</NavLink> : null}
      {allowed.has("billing") ? <NavLink to="/billing" className={item}>Facturation</NavLink> : null}
      {allowed.has("cashier") ? <NavLink to="/cashier" className={item}>Caisse</NavLink> : null}
      {allowed.has("preparation") ? <NavLink to="/preparation" className={item}>Préparation</NavLink> : null}
      {allowed.has("products") ? <NavLink to="/products" className={item}>Produits</NavLink> : null}
    </div>
  );
}
