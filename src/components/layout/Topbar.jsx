// src/components/layout/Topbar.jsx
// Topbar avec titre, date/heure, indicateurs, CountrySelector et menu profil admin.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CountrySelector from "../CountrySelector";
import { clearAdminToken, getCountryCode } from "../../services/api";

/* ============================================================================
   Helpers session admin
============================================================================ */

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function readStoredAdminUser() {
  if (typeof window === "undefined") return null;

  // Adapte facilement ici si ton app stocke l'utilisateur sous une autre clé
  const candidates = [
    "admin_user",
    "adminUser",
    "user",
  ];

  for (const key of candidates) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    const parsed = safeJsonParse(raw);
    if (parsed && (parsed.email || parsed.role || parsed.fullName)) {
      return parsed;
    }
  }

  return null;
}

function getInitials(fullName, email) {
  const source = String(fullName || "").trim();

  if (source) {
    const parts = source.split(/\s+/).filter(Boolean).slice(0, 2);
    const initials = parts.map((p) => p[0]?.toUpperCase() || "").join("");
    return initials || "AD";
  }

  const mail = String(email || "").trim();
  if (mail) return mail.slice(0, 2).toUpperCase();

  return "AD";
}

function formatRoleLabel(role) {
  const map = {
    SUPER_ADMIN: "Super Admin",
    TECH_ADMIN: "Admin technique",
    OPERATIONS_DIRECTOR: "Directeur des opérations",
    SALES_DIRECTOR: "Directeur commercial",
    BILLING_MANAGER: "Responsable facturation",
    MARKETING_ASSISTANT: "Assistant marketing",
    STOCK_MANAGER: "Gestionnaire de stock",
    COUNTER_MANAGER: "Responsable comptoir",
    INVOICER: "Facturier",
    ORDER_PREPARER: "Préparateur de commande",
  };

  return map[String(role || "").trim().toUpperCase()] || role || "Administrateur";
}

/* ============================================================================
   Titre de page
============================================================================ */

function getPageTitle(pathname) {
  if (pathname === "/") return "Tableau de bord";
  if (pathname === "/orders") return "Commandes";
  if (pathname.startsWith("/orders/")) return "Détail commande";

  if (pathname === "/products") return "Produits";
  if (pathname === "/products/new") return "Nouveau produit";
  if (pathname.match(/^\/products\/[^/]+\/edit$/)) return "Modifier produit";

  if (pathname === "/settings") return "Paramètres";
  if (pathname === "/settings/users") return "Utilisateurs";
  if (pathname === "/settings/grade-discounts") return "Remises par grade";

  return "PRECOMMANDE FOREVER Admin Panel";
}

/* ============================================================================
   Composant principal
============================================================================ */

export default function Topbar({ onMenuClick = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);
  const [countryCode, setCountryCode] = useState(() => getCountryCode());
  const [adminUser, setAdminUser] = useState(() => readStoredAdminUser());

  // Horloge
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Relecture country / user quand on revient sur l’onglet ou qu’un storage change
  useEffect(() => {
    const refreshTopbarContext = () => {
      setCountryCode(getCountryCode());
      setAdminUser(readStoredAdminUser());
    };

    refreshTopbarContext();

    window.addEventListener("focus", refreshTopbarContext);
    window.addEventListener("storage", refreshTopbarContext);

    return () => {
      window.removeEventListener("focus", refreshTopbarContext);
      window.removeEventListener("storage", refreshTopbarContext);
    };
  }, []);

  const pageTitle = useMemo(
    () => getPageTitle(location.pathname),
    [location.pathname]
  );

  const formattedTime = useMemo(
    () =>
      currentTime.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [currentTime]
  );

  const formattedDate = useMemo(
    () =>
      currentTime.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [currentTime]
  );

  const adminDisplayName =
    adminUser?.fullName || adminUser?.email || "Administrateur";

  const adminRoleLabel = formatRoleLabel(adminUser?.role);
  const initials = getInitials(adminUser?.fullName, adminUser?.email);

  function handleLogout() {
    clearAdminToken();

    // Nettoyage session locale si ton app la stocke
    try {
      window.localStorage.removeItem("admin_user");
      window.localStorage.removeItem("adminUser");
      window.localStorage.removeItem("user");
    } catch {
      // ignore
    }

    setShowProfile(false);
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <button
              onClick={onMenuClick}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 lg:hidden"
              aria-label="Menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div>
              <h1 className="text-lg font-semibold text-gray-900">{pageTitle}</h1>
              <p className="hidden text-xs text-gray-500 sm:block">{formattedDate}</p>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {/* Country selector desktop */}
            <div className="hidden items-center gap-2 sm:flex">
              <CountrySelector />
              <span className="hidden rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 md:inline-flex">
                {countryCode}
              </span>
            </div>

            {/* Clock */}
            <div className="hidden items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 sm:flex">
              <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-700">{formattedTime}</span>
            </div>

            {/* Notifications */}
            <button
              className="relative rounded-lg p-2 transition-colors hover:bg-gray-100"
              aria-label="Notifications"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
            </button>

            {/* Profil */}
            <div className="relative">
              <button
                onClick={() => setShowProfile((v) => !v)}
                className="flex items-center gap-2 rounded-lg p-1 transition-colors hover:bg-gray-100"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
                  <span className="text-sm font-medium text-white">{initials}</span>
                </div>

                <div className="hidden text-left lg:block">
                  <p className="text-sm font-medium text-gray-900">{adminDisplayName}</p>
                  <p className="text-xs text-gray-500">
                    {adminRoleLabel} • {countryCode}
                  </p>
                </div>

                <svg className="hidden h-4 w-4 text-gray-500 lg:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showProfile && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowProfile(false)}
                  />

                  <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-gray-200 bg-white py-2 shadow-lg">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">
                        {adminDisplayName}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {adminUser?.email || "—"}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                          {adminRoleLabel}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          {countryCode}
                        </span>
                      </div>
                    </div>

                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setShowProfile(false)}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Mon profil
                    </button>

                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setShowProfile(false);
                        navigate("/settings");
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Paramètres
                    </button>

                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => {
                        setShowProfile(false);
                        navigate("/users");
                      }}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-1a4 4 0 00-4-4H11a4 4 0 00-4 4v1m10 0H7m8-12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      Utilisateurs
                    </button>

                    <div className="my-1 border-t border-gray-100" />

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Déconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile row */}
        <div className="pb-3 sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-gray-500">{formattedDate}</div>
            <div className="flex items-center gap-2">
              <CountrySelector className="w-28" />
              <span className="rounded-lg bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                {countryCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}