// admin-app/src/components/layout/Sidebar.jsx
// Composant de la barre latérale de navigation avec icônes Lucide React optimisées
import { NavLink } from "react-router-dom";
import { useState, useRef, useEffect, useMemo } from "react";
import useAdminAuth from "../../hooks/useAdminAuth";
import { AdminRole, Permission, hasPermission } from "../../auth/permissions";
import { getWorkspaceNavKeys, shouldShowDashboard } from "../../auth/workspaces";
import { foreverLogoHomeUrl } from "../../lib/assetUrls";
import {
  // Navigation principale - Icônes plus spécifiques et professionnelles
  LayoutDashboard,
  ShoppingBag,
  Receipt,
  Banknote,
  Link2,
  ClipboardCheck,
  PackageOpen,
  Store,
  FileBarChart,
  
  // Administration - Icônes distinctes pour éviter la confusion
  SlidersHorizontal,
  Image,
  MessageSquareText,
  
  // Interface
  ChevronLeft,
  ChevronRight,
  X,
  Star,
  TrendingUp,
  AlertCircle,
  Clock,
  Users,
  ArrowUpRight,
  
  // Icônes supplémentaires pour les composants
  MessageCircle,
  Target,
  CheckCircle,
  Send,
  ThumbsUp,
  Plus,
  Grid3X3,
  List,
  AlertTriangle,
  Info,
  ShieldCheck,
} from "lucide-react";

// ============================================
// DÉFINITIONS DES ALIAS D'ICÔNES
// ============================================
const MessageIcon = MessageCircle;
const CampaignIcon = Target;
const CheckCircleIcon = CheckCircle;
const SendIcon = Send;
const AlertCircleIcon = AlertCircle;
const ThumbsUpIcon = ThumbsUp;
const PlusIcon = Plus;
const GridIcon = Grid3X3;
const ListIcon = List;
const AlertTriangleIcon = AlertTriangle;
const InfoIcon = Info;
const UsersIcon = Users;
const ClockIcon = Clock;
const XIcon = X;

// ============================================
// CONSTANTES AVEC ICÔNES LUCIDE OPTIMISÉES
// ============================================

// Navigation principale avec icônes plus évocatrices
const NAV_ITEMS = [
  {
    key: "dashboard",
    to: "/dashboard",
    label: "Dashboard",
    permission: Permission.EXPORT_READ,
    icon: LayoutDashboard,
    badge: null,
    description: "Vue d'ensemble et KPIs",
    color: "from-blue-500 to-cyan-500",
    shortcut: "1",
  },
  {
    key: "orders",
    to: "/orders",
    label: "Commandes",
    permission: Permission.PREORDER_READ,
    icon: ShoppingBag,
    badge: null,
    description: "Gestion des précommandes",
    color: "from-orange-500 to-red-500",
    shortcut: "2",
  },
  {
    key: "billing",
    to: "/billing",
    label: "Facturation",
    permission: Permission.INVOICE_CREATE,
    icon: Receipt,
    badge: null,
    description: "Files d'attente et factures",
    color: "from-green-500 to-emerald-500",
    shortcut: "3",
  },
  {
    key: "billing",
    to: "/billing/payment-link-requests",
    label: "Liens paiement",
    permission: Permission.INVOICE_CREATE,
    icon: MessageSquareText,
    badge: null,
    description: "Demandes de renvoi client",
    color: "from-emerald-500 to-teal-500",
    shortcut: "L",
  },
  {
    key: "cashier",
    to: "/cashier",
    label: "Caisse",
    permission: Permission.PAYMENT_VALIDATE,
    icon: Banknote,
    badge: null,
    description: "Paiements et encaissements",
    color: "from-purple-500 to-pink-500",
    shortcut: "4",
  },
  {
    key: "external-payment-links",
    to: "/billing/external-payment-links",
    label: "Liens hors app",
    permissions: [Permission.INVOICE_CREATE, Permission.PAYMENT_VALIDATE],
    icon: Link2,
    badge: null,
    description: "Paiements hors précommande",
    color: "from-amber-500 to-yellow-500",
    shortcut: "P",
  },
  {
    key: "cash-closures",
    to: "/cash-closures",
    label: "Clôture caisse",
    permission: Permission.PAYMENT_VALIDATE,
    icon: ShieldCheck,
    badge: null,
    description: "Point journalier des encaissements",
    color: "from-emerald-500 to-teal-500",
    shortcut: "C",
  },
  {
    key: "preparation",
    to: "/preparation",
    label: "Préparation",
    permission: Permission.PREPARATION_UPDATE,
    icon: ClipboardCheck,
    badge: null,
    description: "Suivi des préparations",
    color: "from-yellow-500 to-amber-500",
    shortcut: "5",
  },
  {
    key: "preparation",
    to: "/preparation/pickup-code-requests",
    label: "Codes retrait",
    permission: Permission.PREPARATION_UPDATE,
    icon: MessageSquareText,
    badge: null,
    description: "Demandes de renvoi client",
    color: "from-amber-500 to-orange-500",
    shortcut: "R",
  },
  {
    key: "stock",
    to: "/stock",
    label: "Stock",
    permission: Permission.PRODUCT_READ,
    icon: PackageOpen,
    badge: null,
    description: "Gestion des inventaires",
    color: "from-teal-500 to-cyan-500",
    shortcut: "6",
  },
  {
    key: "products",
    to: "/products",
    label: "Catalogue",
    permission: Permission.PRODUCT_READ,
    icon: Store,
    badge: null,
    description: "Produits et prix",
    color: "from-indigo-500 to-blue-500",
    shortcut: "7",
  },
  {
    key: "reports",
    to: "/reports/daily-sales",
    label: "Rapports",
    permission: Permission.EXPORT_READ,
    icon: FileBarChart,
    badge: null,
    description: "Analyses et statistiques",
    color: "from-rose-500 to-red-500",
    shortcut: "8",
  },
];

// Administration avec icônes distinctives
const SETTINGS_ITEMS = [
  {
    key: "settings",
    to: "/settings",
    label: "Paramètres",
    permission: Permission.COUNTRY_WRITE,
    icon: SlidersHorizontal,
    description: "Configuration générale",
    color: "from-gray-500 to-slate-500",
    shortcut: "9",
  },
  {
    key: "marketing",
    to: "/marketing/campaigns",
    label: "Visuels marketing",
    permission: Permission.COUNTRY_READ,
    icon: Image,
    description: "Slider et panneaux storefront",
    allowedRoles: [
      AdminRole.SUPER_ADMIN,
      AdminRole.TECH_ADMIN,
      AdminRole.OPERATIONS_DIRECTOR,
      AdminRole.SALES_DIRECTOR,
      AdminRole.MARKETING_MANAGER,
      AdminRole.MARKETING_ASSISTANT,
    ],
    color: "from-violet-500 to-purple-500",
    shortcut: "0",
  },
  {
    key: "sms-campaigns",
    to: "/marketing/sms-campaigns",
    label: "Campagnes SMS",
    permission: Permission.COUNTRY_READ,
    icon: MessageSquareText,
    description: "Invitations et suivis SMS",
    allowedRoles: [
      AdminRole.SUPER_ADMIN,
      AdminRole.TECH_ADMIN,
      AdminRole.OPERATIONS_DIRECTOR,
      AdminRole.SALES_DIRECTOR,
      AdminRole.MARKETING_MANAGER,
      AdminRole.MARKETING_ASSISTANT,
    ],
    color: "from-sky-500 to-blue-500",
    shortcut: "-",
  },
  {
    key: "ticket-events",
    to: "/marketing/ticket-events",
    label: "Événements",
    permission: Permission.MARKETING_WRITE,
    icon: Star,
    description: "Billetterie et participants",
    allowedRoles: [
      AdminRole.SUPER_ADMIN,
      AdminRole.TECH_ADMIN,
      AdminRole.OPERATIONS_DIRECTOR,
      AdminRole.SALES_DIRECTOR,
      AdminRole.MARKETING_MANAGER,
      AdminRole.MARKETING_ASSISTANT,
    ],
    color: "from-amber-500 to-yellow-500",
    shortcut: "E",
  },
];

// Badge de notification amélioré avec animation
function NotificationBadge({ count, type = "default" }) {
  const types = {
    default: "bg-gradient-to-r from-red-500 to-red-600",
    warning: "bg-gradient-to-r from-orange-500 to-amber-500",
    success: "bg-gradient-to-r from-green-500 to-emerald-500",
  };

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white rounded-full shadow-lg ${
        types[type] || types.default
      } animate-pulse`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Icône avec indicateur d'activité
function IconWithIndicator({ icon: Icon, isActive, color }) {
  return (
    <div className="relative">
      <div
        className={`transition-all duration-300 ${
          isActive ? "scale-110" : "group-hover:scale-105"
        }`}
      >
        <Icon className="w-5 h-5" />
      </div>
      {isActive && (
        <div
          className={`absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1.5 h-1.5 bg-gradient-to-r ${color} rounded-full shadow-lg`}
        />
      )}
    </div>
  );
}

// Tooltip amélioré avec animation et raccourci clavier
function EnhancedTooltip({ children, content, shortcut, position = "right" }) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 500);
  };

  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  const positions = {
    right: "left-full ml-3 top-1/2 -translate-y-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
  };

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className={`absolute z-50 px-3 py-2 bg-gray-900 text-white rounded-xl shadow-2xl pointer-events-none animate-in fade-in slide-in-from-left-2 duration-200 ${positions[position]}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium whitespace-nowrap">{content}</span>
            {shortcut && (
              <kbd className="px-1.5 py-0.5 text-[10px] bg-white/10 rounded-md text-white/60">
                ⌘{shortcut}
              </kbd>
            )}
          </div>
          <div
            className={`absolute w-2.5 h-2.5 bg-gray-900 transform rotate-45 ${
              position === "right"
                ? "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
                : position === "bottom"
                ? "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                : "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
            }`}
          />
        </div>
      )}
    </div>
  );
}

// Élément de navigation amélioré avec micro-interactions
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
      <IconWithIndicator icon={Icon} isActive={isActive} color={item.color} />
      
      {!collapsed && (
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium transition-colors duration-200">
              {item.label}
            </span>
            {item.badge && <NotificationBadge count={item.badge} />}
          </div>
          {showDescription && item.description && (
            <p className="text-[10px] text-white/40 mt-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {item.description}
            </p>
          )}
        </div>
      )}

      {isActive && !collapsed && (
        <ArrowUpRight className="w-3 h-3 text-[#FFC600] opacity-0 group-hover:opacity-100 transition-opacity" />
      )}

      {/* Indicateur actif latéral */}
      <span
        className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-300 ${
          isActive
            ? `h-8 bg-gradient-to-b ${item.color} shadow-lg`
            : "h-0 bg-transparent"
        }`}
      />
      
      {/* Effet de survol avec dégradé */}
      <span
        className={`absolute inset-0 rounded-xl bg-gradient-to-r ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
      />
    </>
  );

  const itemContent = collapsed ? (
    <EnhancedTooltip content={item.label} shortcut={item.shortcut} position="right">
      <NavLink
        ref={linkRef}
        to={item.to}
        onClick={onClick}
        className={({ isActive }) =>
          `group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
            isActive
              ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-[0.98]`
              : "text-white/70 hover:bg-white/5 hover:text-white"
          } ${collapsed ? "justify-center" : ""}`
        }
      >
        {navLinkContent}
      </NavLink>
    </EnhancedTooltip>
  ) : (
    <NavLink
      ref={linkRef}
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
          isActive
            ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-[0.98]`
            : "text-white/70 hover:bg-white/5 hover:text-white"
        } ${collapsed ? "justify-center" : ""}`
      }
    >
      {navLinkContent}
    </NavLink>
  );

  return itemContent;
}

// Section de navigation avec compteur d'éléments
function NavSection({ title, items, collapsed, onItemClick, showDescriptions = false }) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {!collapsed && title && (
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">
              {title}
            </h3>
            <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          </div>
        </div>
      )}
      <nav className="space-y-0.5">
        {items.map((item) => (
          <NavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
            onClick={onItemClick}
            showDescription={showDescriptions}
          />
        ))}
      </nav>
    </div>
  );
}

// Carte profil utilisateur enrichie
function UserProfileCard({ fullName, email, collapsed, role }) {
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

  const getRoleLabel = (role) => {
    const labels = {
      [AdminRole.SUPER_ADMIN]: "Super Admin",
      [AdminRole.TECH_ADMIN]: "Tech Admin",
      [AdminRole.OPERATIONS_DIRECTOR]: "Opérations",
      [AdminRole.SALES_DIRECTOR]: "Commercial",
      [AdminRole.MARKETING_MANAGER]: "Resp. marketing",
      [AdminRole.MARKETING_ASSISTANT]: "Marketing",
    };
    return labels[role] || "Administrateur";
  };

  const initials = getInitials();

  return (
    <div
      className="relative p-4 border-t border-white/5 bg-gradient-to-t from-[#0a0a0a] via-[#0c0c0c] to-transparent backdrop-blur-sm transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3">
        <div
          className={`relative w-10 h-10 bg-gradient-to-br from-[#FFC600] to-amber-600 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 ${
            isHovered ? "scale-105 shadow-xl rotate-3" : ""
          }`}
        >
          <span className="text-sm font-bold text-black">
            {initials}
          </span>
          {/* Indicateur de statut en ligne */}
          <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[#0c0c0c] rounded-full shadow-lg">
            <span className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-75" />
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">
              {fullName || "Administrateur"}
            </p>
            <Star className="w-3 h-3 text-[#FFC600] flex-shrink-0" />
          </div>
          <p className="text-[11px] text-white/40 truncate mt-0.5">
            {email || "admin@forever.com"}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] text-[#FFC600]/80 font-medium bg-[#FFC600]/10 px-2 py-0.5 rounded-full">
              {getRoleLabel(role)}
            </span>
            <span className="text-[10px] text-white/30">•</span>
            <span className="text-[10px] text-white/30 flex items-center gap-1">
              <div className="w-1 h-1 bg-green-400 rounded-full" />
              En ligne
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Fonctions de filtrage améliorées
function filterItems(items, role, permissions) {
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

    // Vérification des clés de workspace
    if (item.key && !allowedKeys.has(item.key)) {
      return false;
    }

    // Vérification des permissions
    if (Array.isArray(item.permissions)) {
      return item.permissions.some((permission) =>
        hasPermission(role, permission, permissions),
      );
    }

    return !item.permission || hasPermission(role, item.permission, permissions);
  });
}

// Composant Desktop principal
export function DesktopSidebar({ collapsed, onToggle }) {
  const { role, permissions, fullName, email } = useAdminAuth();
  const [showDescriptions, setShowDescriptions] = useState(false);
  const sidebarRef = useRef(null);

  // Mémorisation des éléments filtrés pour performance
  const visibleNavItems = useMemo(
    () => filterItems(NAV_ITEMS, role, permissions),
    [role, permissions]
  );
  
  const visibleSettingsItems = useMemo(
    () => filterItems(SETTINGS_ITEMS, role, permissions),
    [role, permissions]
  );

  // Raccourci clavier global
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
    setTimeout(() => setShowDescriptions(true), 400);
  };

  const handleMouseLeave = () => {
    setShowDescriptions(false);
  };

  return (
    <aside
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`h-full bg-[#000000] border-r border-white/[0.08] transition-all duration-300 ease-in-out flex flex-col backdrop-blur-xl ${
        collapsed ? "w-20" : "w-72"
      }`}
      aria-label="Navigation principale"
    >
      {/* En-tête avec logo */}
      <div
        className={`flex items-center h-20 px-4 border-b border-white/[0.08] bg-gradient-to-b from-black to-[#0a0a0a] ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        {!collapsed ? (
          <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="relative">
              <img
                src={foreverLogoHomeUrl}
                alt="Forever"
                className="h-12 w-auto object-contain"
              />
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-[#FFC600] to-amber-500 rounded-full" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-wider text-white leading-tight">
                FOREVER
              </span>
              <span className="text-[10px] font-semibold text-[#FFC600] tracking-[0.2em] uppercase">
                Admin Panel
              </span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <img
              src={foreverLogoHomeUrl}
              alt="Forever"
              className="h-9 w-auto object-contain transition-all duration-300 hover:scale-110"
            />
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-gradient-to-r from-[#FFC600] to-amber-500 rounded-full" />
          </div>
        )}

        <EnhancedTooltip
          content={collapsed ? "Étendre la sidebar" : "Réduire la sidebar"}
          shortcut="B"
          position="bottom"
        >
          <button
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-white/5 active:bg-white/10 transition-all duration-200 text-white/40 hover:text-white/80 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/30"
            type="button"
            aria-label={collapsed ? "Étendre la barre latérale" : "Réduire la barre latérale"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </EnhancedTooltip>
      </div>

      {/* Navigation principale */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <div className="py-3 px-2 space-y-6">
          <NavSection
            title="Principal"
            items={visibleNavItems}
            collapsed={collapsed}
            showDescriptions={showDescriptions && !collapsed}
          />

          {visibleSettingsItems.length > 0 && (
            <>
              {!collapsed && (
                <div className="px-3">
                  <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                </div>
              )}
              <NavSection
                title="Configuration"
                items={visibleSettingsItems}
                collapsed={collapsed}
                showDescriptions={showDescriptions && !collapsed}
              />
            </>
          )}
        </div>
      </div>

      {/* Profil utilisateur */}
      {!collapsed ? (
        <UserProfileCard
          fullName={fullName}
          email={email}
          role={role}
          collapsed={collapsed}
        />
      ) : (
        <div className="p-3 border-t border-white/[0.08] flex justify-center">
          <EnhancedTooltip
            content={`${fullName || "Admin"} • ${email || ""}`}
            position="right"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFC600] to-amber-600 rounded-xl flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-all duration-300">
              <span className="text-sm font-bold text-black">
                {fullName
                  ? fullName.slice(0, 2).toUpperCase()
                  : email
                  ? email.slice(0, 2).toUpperCase()
                  : "AD"}
              </span>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-black rounded-full" />
            </div>
          </EnhancedTooltip>
        </div>
      )}

      {/* Pied de page avec version */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/[0.05] bg-black/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-[10px] text-white/20">
            <span>v2.1.0</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                Stable
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// Version mobile avec animations améliorées
export function MobileSidebar({ isOpen, onClose }) {
  const { role, permissions, fullName, email } = useAdminAuth();
  const sidebarRef = useRef(null);

  const visibleNavItems = useMemo(
    () => filterItems(NAV_ITEMS, role, permissions),
    [role, permissions]
  );
  
  const visibleSettingsItems = useMemo(
    () => filterItems(SETTINGS_ITEMS, role, permissions),
    [role, permissions]
  );

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
      {/* Overlay avec flou */}
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
        className={`fixed top-0 left-0 h-full w-80 bg-[#000000] shadow-2xl z-50 transform transition-transform duration-300 ease-out lg:hidden border-r border-white/10 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation mobile"
        role="dialog"
        aria-modal="true"
      >
        {/* En-tête mobile */}
        <div className="flex items-center justify-between h-20 px-5 border-b border-white/10 bg-gradient-to-r from-black to-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <img
              src={foreverLogoHomeUrl}
              alt="Forever"
              className="h-10 w-auto object-contain"
            />
            <div>
              <div className="text-base font-bold tracking-wider text-white">
                FOREVER
              </div>
              <div className="text-[10px] font-medium text-[#FFC600] uppercase tracking-wider">
                Admin
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-all text-white/60 hover:text-white"
            type="button"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation scrollable */}
        <div className="overflow-y-auto h-[calc(100vh-16rem)] scrollbar-thin scrollbar-thumb-white/10">
          <div className="p-4 space-y-6">
            <NavSection
              title="Principal"
              items={visibleNavItems}
              collapsed={false}
              onItemClick={onClose}
              showDescriptions={true}
            />

            {visibleSettingsItems.length > 0 && (
              <>
                <div className="px-3">
                  <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>
                <NavSection
                  title="Configuration"
                  items={visibleSettingsItems}
                  collapsed={false}
                  onItemClick={onClose}
                  showDescriptions={true}
                />
              </>
            )}
          </div>
        </div>

        {/* Profil mobile */}
        <div className="absolute bottom-0 left-0 right-0">
          <UserProfileCard
            fullName={fullName}
            email={email}
            role={role}
            collapsed={false}
          />
        </div>
      </aside>
    </>
  );
}

// Composant principal avec gestion d'état
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

  return <DesktopSidebar collapsed={collapsed} onToggle={handleToggle} />;
}
