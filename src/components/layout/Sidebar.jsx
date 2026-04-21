// admin-app/src/components/layout/Sidebar.jsx
// Composant de la barre latérale de navigation avec icônes Lucide React améliorées
import { NavLink } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import useAdminAuth from "../../hooks/useAdminAuth";
import { Permission, hasPermission } from "../../auth/permissions";
import { getWorkspaceNavKeys, shouldShowDashboard } from "../../auth/workspaces";
import { foreverLogoHomeUrl } from "../../lib/assetUrls";
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  CreditCard,
  Package,
  Boxes,
  Tags,
  Settings,
  Megaphone,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

// ============================================
// CONSTANTES AVEC ICÔNES LUCIDE AMÉLIORÉES
// ============================================

// Navigation principale
const NAV_ITEMS = [
  {
    key: "dashboard",
    to: "/dashboard",
    label: "Dashboard",
    permission: Permission.EXPORT_READ,
    icon: LayoutDashboard,
    badge: null,
    description: "Vue d'ensemble et statistiques",
  },
  {
    key: "orders",
    to: "/orders",
    label: "Commandes",
    permission: Permission.PREORDER_READ,
    icon: ShoppingCart,
    badge: null,
    description: "Gestion des précommandes",
  },
  {
    key: "billing",
    to: "/billing",
    label: "Queue de facturation",
    permission: Permission.INVOICE_CREATE,
    icon: FileText,
    badge: null,
    description: "Factures en attente",
  },
  {
    key: "cashier",
    to: "/cashier",
    label: "Caisse",
    permission: Permission.PAYMENT_VALIDATE,
    icon: CreditCard,
    badge: null,
    description: "Encaissements et paiements",
  },
  {
    key: "preparation",
    to: "/preparation",
    label: "Préparation",
    permission: Permission.PREPARATION_UPDATE,
    icon: Package,
    badge: null,
    description: "Préparation des commandes",
  },
  {
    key: "stock",
    to: "/stock",
    label: "Stock",
    permission: Permission.PRODUCT_READ,
    icon: Boxes,
    badge: null,
    description: "Gestion des stocks",
  },
  {
    key: "products",
    to: "/products",
    label: "Produits",
    permission: Permission.PRODUCT_READ,
    icon: Tags,
    badge: null,
    description: "Catalogue produits",
  },
];

const SETTINGS_ITEMS = [
  {
    to: "/settings",
    label: "Paramètres",
    permission: Permission.COUNTRY_WRITE,
    icon: Settings,
    description: "Configuration générale",
  },
  {
    to: "/marketing/campaigns",
    label: "Campagnes marketing",
    permission: Permission.COUNTRY_READ,
    icon: Megaphone,
    description: "Gestion des campagnes",
  },
];

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
  const Icon = item.icon;

  useEffect(() => {
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
        <Icon className="w-5 h-5" />
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

export function DesktopSidebar({ collapsed, onToggle }) {
  const { role, permissions, fullName, email } = useAdminAuth();
  const [showDescriptions, setShowDescriptions] = useState(false);
  const sidebarRef = useRef(null);

  const visibleNavItems = filterItems(NAV_ITEMS, role, permissions);
  const visibleSettingsItems = filterItems(SETTINGS_ITEMS, role, permissions);

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
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </Tooltip>
      </div>

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

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-all duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        ref={sidebarRef}
        className={`fixed top-0 left-0 h-full w-80 bg-[#000000] shadow-2xl z-50 transform transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation mobile"
      >
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
            <X className="w-6 h-6" />
          </button>
        </div>

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

        <div className="absolute bottom-0 left-0 right-0">
          <UserProfileCard fullName={fullName} email={email} collapsed={false} />
        </div>
      </aside>
    </>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(() => {
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
