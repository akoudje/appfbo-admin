// admin-app/src/components/layout/Sidebar.jsx
// Composant de la barre latérale de navigation de l'interface d'administration, avec une version desktop et une version mobile. La barre latérale contient des liens vers les différentes sections de l'admin, ainsi qu'un bouton pour basculer entre les modes réduit et étendu. Les éléments de navigation sont définis dans des tableaux `NAV_ITEMS` et `SETTINGS_ITEMS`, qui contiennent les informations nécessaires pour afficher les liens et les icônes correspondantes. Le composant utilise `NavLink` de `react-router-dom` pour gérer la navigation et appliquer des styles actifs aux liens correspondants à la route courante.



import { NavLink } from "react-router-dom";
import { useState } from "react";
import useAdminAuth from "../../hooks/useAdminAuth";
import { Permission, hasPermission } from "../../auth/permissions";

// Navigation principale
const NAV_ITEMS = [
  {
    to: "/",
    label: "Dashboard",
    permission: Permission.EXPORT_READ,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
        />
      </svg>
    ),
    badge: null,
  },
  {
    to: "/orders",
    label: "Commandes",
    permission: Permission.PREORDER_READ,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    ),
    badge: null,
  },
  {
    to: "/billing",
    label: "Queue de facturation",
    permission: Permission.INVOICE_CREATE,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z"
        />
      </svg>
    ),
    badge: null,
  },
  {
    to: "/preparation",
    label: "Préparation",
    permission: Permission.PREPARATION_UPDATE,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
    badge: null,
  },
  {
    to: "/products",
    label: "Produits",
    permission: Permission.PRODUCT_READ,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    ),
    badge: null,
  },
];

// Paramètres
const SETTINGS_ITEMS = [
  {
    to: "/settings",
    label: "Paramètres",
    permission: Permission.COUNTRY_WRITE,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    ),
  },
  {
    to: "/settings/users",
    label: "Utilisateurs",
    permission: Permission.COUNTRY_WRITE,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 20h5V4H2v16h5m10 0v-1a4 4 0 00-4-4H11a4 4 0 00-4 4v1m10 0H7m8-12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    badge: null,
  },
  {
    to: "/settings/grade-discounts",
    label: "Remises par grade",
    permission: Permission.DISCOUNT_READ,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 9V7a5 5 0 00-10 0v2M5 9h14l-1 10a2 2 0 01-2 2H8a2 2 0 01-2-2L5 9z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 14h6M12 11v6"
        />
      </svg>
    ),
  },
];

function NavItem({ item, collapsed = false, onClick }) {
  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
          isActive ? "bg-blue-50 text-blue-600" : "text-gray-700 hover:bg-gray-50"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      <span>{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-sm font-medium">{item.label}</span>
          {item.badge && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded-full">
              {item.badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function filterItems(items, role, permissions) {
  return items.filter((item) =>
    !item.permission || hasPermission(role, item.permission, permissions),
  );
}

export function DesktopSidebar({ collapsed, onToggle }) {
  const { role, permissions, fullName, email } = useAdminAuth();

  const visibleNavItems = filterItems(NAV_ITEMS, role, permissions);
  const visibleSettingsItems = filterItems(SETTINGS_ITEMS, role, permissions);

  return (
    <aside
      className={`h-full bg-white border-r border-gray-200 transition-all duration-300 flex flex-col ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div
        className={`flex items-center h-16 px-4 border-b border-gray-200 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-semibold text-gray-900">Admin Panel</span>
          </div>
        ) : (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
        )}

        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          type="button"
        >
          <svg
            className={`w-5 h-5 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            />
          </svg>
        </button>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {visibleNavItems.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}

        {!collapsed && visibleSettingsItems.length > 0 ? (
          <div className="my-4 border-t border-gray-200" />
        ) : null}

        {visibleSettingsItems.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {(fullName || email || "AD").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {fullName || "Admin User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {email || "admin@example.com"}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

export function MobileSidebar({ isOpen, onClose }) {
  const { role, permissions } = useAdminAuth();

  const visibleNavItems = filterItems(NAV_ITEMS, role, permissions);
  const visibleSettingsItems = filterItems(SETTINGS_ITEMS, role, permissions);

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white shadow-xl z-50 transform transition-transform duration-300 lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="font-semibold text-gray-900">Admin Panel</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            type="button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {visibleNavItems.map((item) => (
            <NavItem key={item.to} item={item} onClick={onClose} />
          ))}

          {visibleSettingsItems.length > 0 ? <div className="my-4 border-t border-gray-200" /> : null}

          {visibleSettingsItems.map((item) => (
            <NavItem key={item.to} item={item} onClick={onClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <DesktopSidebar
      collapsed={collapsed}
      onToggle={() => setCollapsed(!collapsed)}
    />
  );
}