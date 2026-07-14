// src/components/layout/Topbar.jsx
// Topbar recentrée sur le contexte métier courant, le pays actif et le profil admin.

import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CountrySelector from "../CountrySelector";
import { getCountryCode } from "../../services/api";
import { clearAdminSession, getAdminUser } from "../../services/auth";
import useAdminAuth from "../../hooks/useAdminAuth";
import {
  isSoundSessionUnlocked,
  unlockGlobalSoundSession,
} from "../../lib/soundEngine";

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
    FINANCE_MANAGER: "Responsable financier",
    MARKETING_MANAGER: "Responsable marketing",
    BILLING_MANAGER: "Responsable facturation",
    MARKETING_ASSISTANT: "Assistant marketing",
    STOCK_MANAGER: "Gestionnaire de stock",
    COUNTER_MANAGER: "Responsable caisse",
    CAISSIERE: "Caissière",
    INVOICER: "Facturier",
    ORDER_PREPARER: "Préparateur de commande",
  };

  return map[String(role || "").trim().toUpperCase()] || role || "Administrateur";
}

function getWorkspaceLabel(role) {
  const normalized = String(role || "").trim().toUpperCase();

  if (["INVOICER", "BILLING_MANAGER"].includes(normalized)) return "Facturation";
  if (["CAISSIERE", "COUNTER_MANAGER"].includes(normalized)) return "Caisse";
  if (["FINANCE_MANAGER"].includes(normalized)) return "Finance";
  if (["ORDER_PREPARER"].includes(normalized)) return "Préparation";
  if (["STOCK_MANAGER"].includes(normalized)) return "Stock";
  if (["MARKETING_MANAGER", "MARKETING_ASSISTANT"].includes(normalized)) return "Marketing";
  return "Administration";
}

function getPageTitle(pathname) {
  if (pathname === "/" || pathname === "/dashboard") return "Tableau de bord";
  if (pathname === "/orders") return "Commandes";
  if (pathname.startsWith("/orders/")) return "Détail commande";
  if (pathname === "/billing") return "Espace Facturation";
  if (pathname === "/billing/as400") return "Gateway AS400";
  if (pathname === "/cashier") return "Espace Caisse";
  if (pathname === "/preparation") return "Espace Préparation";
  if (pathname === "/stock") return "Espace Stock";
  if (pathname === "/products") return "Produits";
  if (pathname === "/products/new") return "Nouveau produit";
  if (pathname.match(/^\/products\/[^/]+\/edit$/)) return "Modifier produit";
  if (pathname === "/settings" || pathname === "/settings/") return "Paramètres";
  if (pathname === "/marketing/campaigns") return "Visuels marketing";
  if (pathname === "/marketing/sms-campaigns") return "Campagnes SMS";
  if (pathname === "/settings/users" || pathname === "/users") return "Utilisateurs";
  if (pathname === "/settings/grade-discounts") return "Remises par grade";
  return "PRECOMMANDE FOREVER Admin Panel";
}

function getPageSubtitle(pathname, role) {
  const workspaceLabel = getWorkspaceLabel(role);

  if (pathname === "/billing") {
    return "Traitez les dossiers du plus ancien au plus récent.";
  }
  if (pathname === "/billing/as400") {
    return "Supervision des demandes AS400 sans automatisation active.";
  }
  if (pathname === "/cashier") {
    return "Encaissement, contrôle des paiements et lancement de la préparation.";
  }
  if (pathname === "/preparation") {
    return "Checklist, anomalies et clôture des colis prêts.";
  }
  if (pathname === "/stock") {
    return "Pilotage des niveaux, ajustements et journal des mouvements.";
  }
  if (pathname.startsWith("/orders/")) {
    return `Vue métier : ${workspaceLabel}`;
  }
  if (pathname === "/products") {
    return "Catalogue interne et disponibilité des articles.";
  }
  if (pathname === "/settings/users" || pathname === "/users") {
    return "Gestion des comptes, rôles et affectations.";
  }
  if (pathname === "/marketing/campaigns") {
    return "Gestion des slides et panneaux latéraux affichés côté utilisateur.";
  }
  if (pathname === "/marketing/sms-campaigns") {
    return "Préparation, envoi et suivi des invitations SMS.";
  }
  if (pathname === "/settings/grade-discounts") {
    return "Pilotage des remises utilisées pour la facturation.";
  }
  return `Espace ${workspaceLabel}`;
}

export default function Topbar({ onMenuClick = () => {} }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAdminAuth();

  const [currentTime, setCurrentTime] = useState(new Date());
  const [showProfile, setShowProfile] = useState(false);
  const [countryCode, setCountryCode] = useState(() => getCountryCode());
  const [adminUser, setAdminUserState] = useState(() => getAdminUser());
  const [soundUnlocked, setSoundUnlocked] = useState(() => isSoundSessionUnlocked());
  const [soundUnlocking, setSoundUnlocking] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refreshTopbarContext = () => {
      setCountryCode(getCountryCode());
      setAdminUserState(getAdminUser());
      setSoundUnlocked(isSoundSessionUnlocked());
    };

    refreshTopbarContext();

    window.addEventListener("focus", refreshTopbarContext);
    window.addEventListener("storage", refreshTopbarContext);

    return () => {
      window.removeEventListener("focus", refreshTopbarContext);
      window.removeEventListener("storage", refreshTopbarContext);
    };
  }, []);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);
  const pageSubtitle = useMemo(
    () => getPageSubtitle(location.pathname, role),
    [location.pathname, role],
  );
  const workspaceLabel = useMemo(() => getWorkspaceLabel(role), [role]);

  const formattedTime = useMemo(
    () =>
      currentTime.toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [currentTime],
  );

  const formattedDate = useMemo(
    () =>
      currentTime.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    [currentTime],
  );

  const adminDisplayName = adminUser?.fullName || adminUser?.email || "Administrateur";
  const adminRoleLabel = formatRoleLabel(adminUser?.role);
  const initials = getInitials(adminUser?.fullName, adminUser?.email);

  function handleLogout() {
    clearAdminSession();
    setShowProfile(false);
    navigate("/login", { replace: true });
  }

  async function handleUnlockSoundSession() {
    try {
      setSoundUnlocking(true);
      const ok = await unlockGlobalSoundSession();
      if (ok) setSoundUnlocked(true);
    } finally {
      setSoundUnlocking(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#e8dfc9] bg-[#fcfbf7]/96 backdrop-blur-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              onClick={onMenuClick}
              className="border border-[#e8dfc9] bg-[#fff7df] p-2 transition-colors hover:bg-[#ffe79a] lg:hidden"
              aria-label="Menu"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-lg font-semibold text-[#000000]">{pageTitle}</h1>
                <span className="hidden border border-[#e4d395] bg-[#fff7df] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6c5715] md:inline-flex">
                  {workspaceLabel}
                </span>
              </div>
              <p className="hidden truncate text-xs text-[#6f6a60] sm:block">{pageSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {!soundUnlocked ? (
              <button
                type="button"
                onClick={handleUnlockSoundSession}
                disabled={soundUnlocking}
                className="hidden rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 lg:inline-flex"
                title="Active les alertes sonores pour toute la session"
              >
                {soundUnlocking ? "Activation..." : "Activer alertes sonores"}
              </button>
            ) : null}

            <div className="hidden items-center gap-2 sm:flex">
              <CountrySelector />
              <span className="hidden border border-[#ece4d1] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#5D4B3C] md:inline-flex">
                {countryCode}
              </span>
            </div>

            <div className="hidden items-center gap-2 border border-[#ece4d1] bg-white px-3 py-2 sm:flex">
              <svg
                className="h-4 w-4 text-[#8d7a5c]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium text-[#5f5b54]">
                {formattedDate} • {formattedTime}
              </span>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowProfile((v) => !v)}
                className="flex items-center gap-2 border border-[#e8dfc9] bg-white px-2 py-1.5 transition-colors hover:bg-[#fff7df]"
                type="button"
              >
                <div className="flex h-9 w-9 items-center justify-center bg-[#FFC600]">
                  <span className="text-sm font-medium text-black">{initials}</span>
                </div>

                <div className="hidden text-left lg:block">
                  <p className="text-sm font-medium text-[#000000]">{adminDisplayName}</p>
                  <p className="text-xs text-[#6f6a60]">
                    {adminRoleLabel} • {countryCode}
                  </p>
                </div>

                <svg
                  className="hidden h-4 w-4 text-[#5D4B3C] lg:block"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showProfile && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfile(false)} />

                  <div className="absolute right-0 z-50 mt-2 w-64 border border-[#e8dfc9] bg-white py-2 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
                    <div className="border-b border-[#f0ebe1] px-4 py-3">
                      <p className="text-sm font-semibold text-[#000000]">{adminDisplayName}</p>
                      <p className="mt-0.5 text-xs text-[#6f6a60]">{adminUser?.email || "—"}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="bg-[#fff7df] px-2 py-1 text-xs font-medium text-[#6c5715]">
                          {adminRoleLabel}
                        </span>
                        <span className="bg-[#fcfbf7] px-2 py-1 text-xs font-medium text-[#5f5b54]">
                          {countryCode}
                        </span>
                      </div>
                    </div>

                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#5D4B3C] hover:bg-[#fff7df]"
                      onClick={() => setShowProfile(false)}
                      type="button"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Mon profil
                    </button>

                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#5D4B3C] hover:bg-[#fff7df]"
                      onClick={() => {
                        setShowProfile(false);
                        navigate("/settings");
                      }}
                      type="button"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
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
                      Paramètres
                    </button>

                    <button
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#5D4B3C] hover:bg-[#fff7df]"
                      onClick={() => {
                        setShowProfile(false);
                        navigate("/settings/users");
                      }}
                      type="button"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 20h5V4H2v16h5m10 0v-1a4 4 0 00-4-4H11a4 4 0 00-4 4v1m10 0H7m8-12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Utilisateurs
                    </button>

                    <div className="my-1 border-t border-[#f0ebe1]" />

                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                      type="button"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Déconnexion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="pb-3 sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-[#6f6a60]">
              {workspaceLabel} • {formattedDate}
            </div>
            <div className="flex items-center gap-2">
              {!soundUnlocked ? (
                <button
                  type="button"
                  onClick={handleUnlockSoundSession}
                  disabled={soundUnlocking}
                  className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 disabled:opacity-50"
                >
                  {soundUnlocking ? "..." : "Activer son"}
                </button>
              ) : null}
              <CountrySelector className="w-28" />
              <span className="border border-[#ece4d1] bg-white px-2 py-1 text-xs font-semibold text-[#5f5b54]">
                {countryCode}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
