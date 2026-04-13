// admin-app/src/components/layout/Sidebar.jsx
// Composant de la barre latérale de navigation de l'interface d'administration, 
// avec une version desktop et une version mobile. La barre latérale contient des liens vers 
// les différentes sections de l'admin, ainsi qu'un bouton pour basculer entre les modes réduit et étendu. 
// Les éléments de navigation sont définis dans des tableaux `NAV_ITEMS` et `SETTINGS_ITEMS`, qui contiennent 
// les informations nécessaires pour afficher les liens et les icônes correspondantes. 
// Le composant utilise `NavLink` de `react-router-dom` pour gérer la navigation et appliquer des styles actifs aux liens correspondants à la route courante.


import { NavLink } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import useAdminAuth from "../../hooks/useAdminAuth";
import { Permission, hasPermission } from "../../auth/permissions";
import { getWorkspaceNavKeys, shouldShowDashboard } from "../../auth/workspaces";
import { foreverLogoHomeUrl } from "../../lib/assetUrls";

// ============================================
// CONSTANTES
// ============================================

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
    description: "Vue d'ensemble et statistiques",
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
    description: "Gestion des précommandes",
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
    description: "Factures en attente",
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
    description: "Encaissements et paiements",
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
    description: "Préparation des commandes",
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
    description: "Gestion des stocks",
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
    description: "Catalogue produits",
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
    description: "Configuration générale",
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
    description: "Gestion des campagnes",
  },
];

// ============================================
// COMPOSANTS UTILITAIRES
// ============================================

function Tooltip({ children, content, position = "right" }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 400);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const positions = {
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
  };

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none ${positions[position]}`}
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${
              position === "right"
                ? "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
                : "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
            }`}
          />
        </div>
      )}
    </div>
  );
}

function NavItem({ item, collapsed = false, onClick, showDescription = false }) {
  const linkRef = useRef(null);

  useEffect(() => {
    // Ajouter un effet de focus visible pour l'accessibilité clavier
    const handleKeyDown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        linkRef.current?.click();
      }
    };

    const link = linkRef.current;
    if (link) {
      link.addEventListener("keydown", handleKeyDown);
      return () => link.removeEventListener("keydown", handleKeyDown);
    }
  }, []);

  const navLinkContent = ({ isActive }) => (
    <>
      <span className={`transition-transform duration-200 ${isActive ? "scale-110" : "group-hover:scale-105"}`}>
        {item.icon}
      </span>
      {!collapsed && (
        <>
          <span className="flex-1 text-base font-medium transition-colors duration-200">
            {item.label}
          </span>
          {item.badge && (
            <span className="px-2 py-0.5 text-xs font-bold bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-sm animate-pulse">
              {item.badge}
            </span>
          )}
          {showDescription && item.description && (
            <span className="absolute left-14 top-full mt-0.5 text-[10px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
              {item.description}
            </span>
          )}
        </>
      )}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[#FFC600] rounded-r-full shadow-sm shadow-[#FFC600]/30" />
      )}
    </>
  );

  const itemContent = collapsed ? (
    <Tooltip content={item.label} position="right">
      <NavLink
        ref={linkRef}
        to={item.to}
        onClick={onClick}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
            isActive
              ? "bg-gradient-to-r from-[#FFC600] to-amber-500 text-black shadow-lg shadow-[#FFC600]/20"
              : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-sm"
          } ${collapsed ? "justify-center" : ""}`
        }
      >
        {navLinkContent}
      </NavLink>
    </Tooltip>
  ) : (
    <NavLink
      ref={linkRef}
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
          isActive
            ? "bg-gradient-to-r from-[#FFC600] to-amber-500 text-black shadow-lg shadow-[#FFC600]/20"
            : "text-white/80 hover:bg-white/10 hover:text-white hover:shadow-sm"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      {navLinkContent}
    </NavLink>
  );

  return itemContent;
}

function NavSection({ title, items, collapsed, onItemClick, showDescriptions = false }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {!collapsed && title && (
        <div className="px-3 pt-4 pb-2">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">
            {title}
          </h3>
        </div>
      )}
      {items.map((item) => (
        <NavItem
          key={item.to}
          item={item}
          collapsed={collapsed}
          onClick={onItemClick}
          showDescription={showDescriptions}
        />
      ))}
    </div>
  );
}

function UserProfileCard({ fullName, email, collapsed }) {
  const [isHovered, setIsHovered] = useState(false);

  const getInitials = () => {
    if (fullName) {
      const parts = fullName.split(" ").filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return fullName.slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return "AD";
  };

  const initials = getInitials();

  return (
    <div
      className="relative p-4 border-t border-white/10 bg-gradient-to-t from-[#0a0a0a] to-[#0c0c0c] transition-all duration-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3">
        <div
          className={`relative w-10 h-10 bg-gradient-to-br from-[#FFC600] to-amber-500 rounded-xl flex items-center justify-center shadow-lg transition-all duration-200 ${
            isHovered ? "scale-105 shadow-xl" : ""
          }`}
        >
          <span className="text-sm font-bold text-black">
            {initials}
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-[#0c0c0c] rounded-full" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate leading-tight">
            {fullName || "Administrateur"}
          </p>
          <p className="text-xs text-white/50 truncate leading-tight mt-0.5">
            {email || "admin@forever.com"}
          </p>
          <p className="text-[10px] text-[#FFC600]/70 mt-1 font-medium">
            Backoffice Admin
          </p>
        </div>
      </div>
    </div>
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

// ============================================
// COMPOSANTS PRINCIPAUX
// ============================================

export function DesktopSidebar({ collapsed, onToggle }) {
  const { role, permissions, fullName, email } = useAdminAuth();
  const [showDescriptions, setShowDescriptions] = useState(false);
  const sidebarRef = useRef(null);

  const visibleNavItems = filterItems(NAV_ITEMS, role, permissions);
  const visibleSettingsItems = filterItems(SETTINGS_ITEMS, role, permissions);

  // Gestion du raccourci clavier pour basculer la sidebar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        onToggle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggle]);

  // Afficher les descriptions après un délai quand la souris entre
  const handleMouseEnter = () => {
    setTimeout(() => setShowDescriptions(true), 300);
  };

  const handleMouseLeave = () => {
    setShowDescriptions(false);
  };

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`h-full bg-[#000000] border-r border-[#1f1f1f] transition-all duration-300 ease-in-out flex flex-col ${
        collapsed ? "w-20" : "w-72"
      }`}
      aria-label="Navigation principale"
    >
      {/* En-tête avec logo */}
      <div
        className={`flex items-center h-20 px-4 border-b border-[#1f1f1f] bg-gradient-to-r from-black to-[#0a0a0a] ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed ? (
          <div className="flex flex-1 flex-col items-start justify-center animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="flex items-center gap-2">
              <img
                src={foreverLogoHomeUrl}
                alt="Forever"
                className="h-14 w-auto object-contain"
              />
              <div className="flex flex-col">
                <div className="text-xl font-bold tracking-wider text-white">
                  FOREVER
                </div>
                <div className="text-xs font-medium text-[#FFC600] tracking-widest">
                  ADMIN
                </div>
              </div>
            </div>
          </div>
        ) : (
          <img
            src={foreverLogoHomeUrl}
            alt="Forever"
            className="h-10 w-auto object-contain transition-all duration-300 hover:scale-105"
          />
        )}

        <Tooltip content={collapsed ? "Étendre (⌘B)" : "Réduire (⌘B)"} position="bottom">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-white/10 transition-all duration-200 text-white/60 hover:text-white/90 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/50"
            type="button"
            aria-label={collapsed ? "Étendre la barre latérale" : "Réduire la barre latérale"}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`}
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
        </Tooltip>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        <NavSection
          title="Menu principal"
          items={visibleNavItems}
          collapsed={collapsed}
          showDescriptions={showDescriptions && !collapsed}
        />

        {visibleSettingsItems.length > 0 && (
          <>
            {!collapsed && (
              <div className="px-3 pt-2">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
            )}
            <NavSection
              title="Administration"
              items={visibleSettingsItems}
              collapsed={collapsed}
              showDescriptions={showDescriptions && !collapsed}
            />
          </>
        )}
      </nav>

      {/* Profil utilisateur */}
      {!collapsed ? (
        <UserProfileCard fullName={fullName} email={email} collapsed={collapsed} />
      ) : (
        <div className="p-3 border-t border-white/10 flex justify-center">
          <Tooltip content={`${fullName || "Admin"} • ${email || ""}`} position="right">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFC600] to-amber-500 rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform">
              <span className="text-sm font-bold text-black">
                {fullName ? fullName.slice(0, 2).toUpperCase() : email ? email.slice(0, 2).toUpperCase() : "AD"}
              </span>
            </div>
          </Tooltip>
        </div>
      )}

      {/* Indicateur de raccourci clavier (optionnel) */}
      {!collapsed && (
        <div className="px-4 py-2 text-[10px] text-white/30 text-center border-t border-white/5">
          <kbd className="px-1.5 py-0.5 bg-white/5 rounded">⌘</kbd>
          <span className="mx-1">+</span>
          <kbd className="px-1.5 py-0.5 bg-white/5 rounded">B</kbd>
          <span className="ml-2">pour réduire</span>
        </div>
      )}
    </aside>
  );
}

export function MobileSidebar({ isOpen, onClose }) {
  const { role, permissions, fullName, email } = useAdminAuth();
  const sidebarRef = useRef(null);

  const visibleNavItems = filterItems(NAV_ITEMS, role, permissions);
  const visibleSettingsItems = filterItems(SETTINGS_ITEMS, role, permissions);

  // Fermer avec la touche Échap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Focus trap pour l'accessibilité
  useEffect(() => {
    if (isOpen && sidebarRef.current) {
      const focusableElements = sidebarRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [isOpen]);

  return (
    <>
      {/* Overlay avec animation */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar mobile */}
      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-80 bg-[#000000] shadow-2xl z-50 transform transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation mobile"
      >
        {/* En-tête */}
        <div className="flex items-center justify-between h-20 px-5 border-b border-[#1f1f1f] bg-gradient-to-r from-black to-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <img
              src={foreverLogoHomeUrl}
              alt="Forever"
              className="h-12 w-auto object-contain"
            />
            <div>
              <div className="text-lg font-bold tracking-wider text-white">
                FOREVER
              </div>
              <div className="text-xs font-medium text-[#FFC600]">
                Admin Backoffice
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
            type="button"
            aria-label="Fermer le menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-13rem)]">
          <NavSection
            title="Menu principal"
            items={visibleNavItems}
            collapsed={false}
            onItemClick={onClose}
            showDescriptions={true}
          />

          {visibleSettingsItems.length > 0 && (
            <>
              <div className="px-3">
                <div className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>
              <NavSection
                title="Administration"
                items={visibleSettingsItems}
                collapsed={false}
                onItemClick={onClose}
                showDescriptions={true}
              />
            </>
          )}
        </nav>

        {/* Profil utilisateur */}
        <div className="absolute bottom-0 left-0 right-0">
          <UserProfileCard fullName={fullName} email={email} collapsed={false} />
        </div>
      </aside>
    </>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
    // Persister l'état dans localStorage
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  const handleToggle = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    try {
      localStorage.setItem("sidebar-collapsed", JSON.stringify(newState));
    } catch {
      // Ignorer les erreurs localStorage
    }
  };

  return (
    <DesktopSidebar
      collapsed={collapsed}
      onToggle={handleToggle}
    />
  );
}
