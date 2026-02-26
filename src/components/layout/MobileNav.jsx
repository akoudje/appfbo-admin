// src/components/layout/MobileNav.jsx

import { NavLink } from "react-router-dom";

const item = ({ isActive }) =>
  `flex-1 text-center py-3 text-sm ${isActive ? "font-semibold" : "text-gray-600"}`;

export default function MobileNav() {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex">
      <NavLink to="/" className={item}>Dashboard</NavLink>
      <NavLink to="/orders" className={item}>Commandes</NavLink>
      <NavLink to="/products" className={item}>Produits</NavLink>
    </div>
  );
}
