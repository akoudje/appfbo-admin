// admin-app/src/components/layout/Sidebar.jsx
// Composant de la barre latérale de navigation de l'interface d'administration, avec une version desktop et une version mobile. La barre latérale contient des liens vers les différentes sections de l'admin, ainsi qu'un bouton pour basculer entre les modes réduit et étendu. Les éléments de navigation sont définis dans des tableaux `NAV_ITEMS` et `SETTINGS_ITEMS`, qui contiennent les informations nécessaires pour afficher les liens et les icônes correspondantes. Le composant utilise `NavLink` de `react-router-dom` pour gérer la navigation et appliquer des styles actifs aux liens correspondants à la route courante.



import { NavLink } from "react-router-dom";
import { useState } from "react";
import useAdminAuth from "../../hooks/useAdminAuth";
import { Permission, hasPermission } from "../../auth/permissions";
import { getWorkspaceNavKeys, shouldShowDashboard } from "../../auth/workspaces";

// Navigation principale
const NAV_ITEMS = [
  {
    key: "dashboard",
    to: "/dashboard",
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
    key: "orders",
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
    key: "billing",
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
    key: "cashier",
    to: "/cashier",
    label: "Caisse",
    permission: Permission.PAYMENT_VALIDATE,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 9V7a5 5 0 00-10 0v2M5 9h14v10a2 2 0 01-2 2H7a2 2 0 01-2-2V9zm4 5h6"
        />
      </svg>
    ),
    badge: null,
  },
  {
    key: "preparation",
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
    key: "stock",
    to: "/stock",
    label: "Stock",
    permission: Permission.PRODUCT_READ,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 7h16M4 12h16M4 17h16M7 4h10a1 1 0 011 1v14a1 1 0 01-1 1H7a1 1 0 01-1-1V5a1 1 0 011-1z"
        />
      </svg>
    ),
    badge: null,
  },
  {
    key: "products",
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
    to: "/marketing/campaigns",
    label: "Campagnes marketing",
    permission: Permission.COUNTRY_WRITE,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11 5h2m-1-1v2m0 12a4 4 0 100-8 4 4 0 000 8zm0 0v3m0-15V3m8 9h-3M6 12H3m14.95 4.95l-2.12-2.12M8.17 8.17L6.05 6.05m11.9 0l-2.12 2.12M8.17 15.83l-2.12 2.12"
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
        `flex items-center gap-3 px-3 py-3 transition-all ${
          isActive
            ? "bg-[#FFC600] text-black shadow-sm"
            : "text-white/80 hover:bg-white/10 hover:text-white"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      <span>{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-base font-medium">{item.label}</span>
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
  const allowedKeys = getWorkspaceNavKeys(role);

  return items.filter((item) => {
    if (item.key === "dashboard" && !shouldShowDashboard(role)) {
      return false;
    }

    if (item.key && !allowedKeys.has(item.key)) {
      return false;
    }

    return !item.permission || hasPermission(role, item.permission, permissions);
  });
}

export function DesktopSidebar({ collapsed, onToggle }) {
  const { role, permissions, fullName, email } = useAdminAuth();

  const visibleNavItems = filterItems(NAV_ITEMS, role, permissions);
  const visibleSettingsItems = filterItems(SETTINGS_ITEMS, role, permissions);

  return (
    <aside
      className={`h-full bg-[#000000] border-r border-[#1f1f1f] transition-all duration-300 flex flex-col ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div
        className={`flex items-center h-20 px-4 border-b border-[#1f1f1f] ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed ? (
          <div className="flex flex-1 flex-col items-start justify-center">
            <img
              src="/logo-forever-home.png"
              alt="Forever"
              className="h-16 w-auto object-contain"
            />
            <div className="mt-2 text-lg font-semibold tracking-[0.08em] text-white">Forever</div>
            <div className="text-sm font-medium text-[#FFC600]">Admin Backoffice</div>
          </div>
        ) : (
          <img
            src="/logo-forever-home.png"
            alt="Forever"
            className="h-12 w-auto object-contain"
          />
        )}

        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70"
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
          <div className="my-4 border-t border-white/10" />
        ) : null}

        {visibleSettingsItems.map((item) => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-white/10 bg-[#0c0c0c]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FFC600] rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-black">
                {(fullName || email || "AD").slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {fullName || "Admin User"}
              </p>
              <p className="text-xs text-white/60 truncate">
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
        className={`fixed top-0 left-0 h-full w-72 bg-[#000000] shadow-xl z-50 transform transition-transform duration-300 lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-20 px-4 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-2">
            <img
              src="/logo-forever-home.png"
              alt="Forever"
              className="h-14 w-auto object-contain"
            />
            <div>
              <div className="text-lg font-semibold tracking-[0.08em] text-white">Forever</div>
              <div className="text-sm font-medium text-[#FFC600]">Admin Backoffice</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/70"
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

          {visibleSettingsItems.length > 0 ? <div className="my-4 border-t border-white/10" /> : null}

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
