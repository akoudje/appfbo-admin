// Page d'accueil de l'agent de vente : une tuile par type de travail en
// attente, avec son nombre. Un clic ouvre directement la liste concernée.
//
// Mêmes règles que le reste des rappels : chiffres neutres par défaut, orange
// ou rouge seulement pour un colis payé qui attend au-delà des seuils du pays
// (pas de rouge permanent, pas de clignotement). Une tuile à 0 est grisée :
// on voit d'un coup d'œil qu'il n'y a rien à faire.

import { createElement, useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, PackageCheck, Receipt, UserPlus, Wallet } from "lucide-react";
import useAdminAuth from "../hooks/useAdminAuth";
import { useNavBadgeCountsContext } from "../hooks/navBadgeCountsContext";
import { useLaunchReminders } from "../hooks/useLaunchReminders";
import { formatWait } from "../lib/launchReminders";
import { hasPermission, Permission } from "../auth/permissions";
import { getWorkspaceNavKeys } from "../auth/workspaces";

const TONES = {
  idle: {
    card: "border-gray-200 bg-gray-50/60",
    icon: "bg-gray-100 text-gray-400",
    value: "text-gray-400",
  },
  normal: {
    card: "border-gray-200 bg-white hover:border-gray-300 hover:shadow-md",
    icon: "bg-gray-900 text-white",
    value: "text-gray-900",
  },
  warn: {
    card: "border-amber-300 bg-amber-50 hover:shadow-md",
    icon: "bg-amber-500 text-white",
    value: "text-amber-900",
  },
  alert: {
    card: "border-red-300 bg-red-50 hover:shadow-md",
    icon: "bg-red-600 text-white",
    value: "text-red-800",
  },
};

function Tile({ to, icon, title, count, hint, tone }) {
  const t = TONES[count > 0 ? tone || "normal" : "idle"];
  return (
    <Link
      to={to}
      className={`group flex flex-col justify-between gap-4 rounded-2xl border p-5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 ${t.card}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${t.icon}`}>
          {createElement(icon, { className: "h-5 w-5", "aria-hidden": true })}
        </span>
        <ChevronRight
          className="h-5 w-5 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-gray-500"
          aria-hidden="true"
        />
      </div>
      <div>
        <div className={`text-4xl font-semibold tabular-nums ${t.value}`}>{count}</div>
        <div className="mt-1 text-sm font-semibold text-gray-900">{title}</div>
        <div className="mt-0.5 min-h-[1.25rem] text-xs text-gray-500">{count > 0 ? hint : "Rien en attente"}</div>
      </div>
    </Link>
  );
}

function firstName(fullName, email) {
  const name = String(fullName || "").trim();
  if (name) return name.split(/\s+/)[0];
  return String(email || "").split("@")[0] || "";
}

function todayLabel() {
  const label = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function MyDayPage() {
  const { role, permissions, fullName, email } = useAdminAuth();
  const counts = useNavBadgeCountsContext();
  const reminders = useLaunchReminders();

  const can = useMemo(() => {
    const keys = getWorkspaceNavKeys(role);
    const allowed = (key, permission) => keys.has(key) && hasPermission(role, permission, permissions);
    return {
      billing: allowed("billing", Permission.INVOICE_CREATE),
      cashier: allowed("cashier", Permission.PAYMENT_VALIDATE),
      sponsorships: allowed("sponsorships", Permission.SPONSORSHIP_REVIEW),
    };
  }, [role, permissions]);

  // « À lancer » : les rappels (même source que le bandeau, mis à jour en
  // continu) quand ils sont actifs, sinon le compteur du menu.
  const launch = reminders.enabled
    ? {
        count: reminders.summary.total,
        oldestMinutes: reminders.summary.oldestMinutes,
        tone: reminders.summary.overdue > 0 ? "alert" : reminders.summary.warn > 0 ? "warn" : "normal",
      }
    : {
        count: counts.cashierDetail.toLaunch,
        oldestMinutes: null,
        tone: counts.levels.cashier === "alert" ? "alert" : counts.levels.cashier === "warn" ? "warn" : "normal",
      };

  const tiles = [
    can.cashier && {
      key: "launch",
      to: "/cashier?focus=launch",
      icon: PackageCheck,
      title: "Colis payés à certifier et lancer",
      count: launch.count,
      tone: launch.tone,
      hint:
        launch.oldestMinutes !== null
          ? `Le plus ancien attend depuis ${formatWait(launch.oldestMinutes)}`
          : "Déjà payés : à certifier dans l’AS400 puis lancer",
    },
    can.billing && {
      key: "billing",
      to: "/billing?tab=my",
      icon: Receipt,
      title: "Dossiers à facturer",
      count: counts.billing,
      hint: "Vos dossiers attribués",
    },
    can.cashier && {
      key: "collect",
      to: "/cashier?focus=collect",
      icon: Wallet,
      title: "Paiements à encaisser",
      count: counts.cashierDetail.toCollect,
      hint: "Factures en attente de paiement",
    },
    can.billing && {
      key: "escalations",
      to: "/billing?tab=escalated",
      icon: AlertTriangle,
      title: "Urgences / contentieux",
      count: counts.escalations,
      hint: "Partagés avec toute l’équipe",
    },
    can.sponsorships && {
      key: "sponsorships",
      to: "/sponsorships",
      icon: UserPlus,
      title: "Parrainages à vérifier",
      count: counts.sponsorships,
      hint: "Nouveaux distributeurs soumis",
    },
  ].filter(Boolean);

  const totalPending = tiles.reduce((sum, tile) => sum + tile.count, 0);
  const name = firstName(fullName, email);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-gray-500">{todayLabel()}</p>
          <h1 className="text-2xl font-semibold text-gray-900">{name ? `Bonjour ${name}` : "Ma journée"}</h1>
        </div>
        <p className="text-sm text-gray-600" aria-live="polite">
          {!counts.loaded
            ? "Chargement…"
            : totalPending > 0
              ? `${totalPending} élément${totalPending > 1 ? "s" : ""} en attente`
              : "Tout est à jour pour le moment."}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ key, ...tile }) => (
          <Tile key={key} {...tile} />
        ))}
      </div>
    </div>
  );
}
