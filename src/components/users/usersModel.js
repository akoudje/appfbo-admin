import { Permission, getRolePermissions } from "../../auth/permissions";
export const ROLE_GROUPS = [
  {
    label: "Exécution métier",
    roles: [
      {
        value: "INVOICER",
        label: "Facturier",
        help: "Contrôle les précommandes et émet les préfactures.",
      },
      {
        value: "CAISSIERE",
        label: "Caissière",
        help: "Encaisse, contrôle les paiements et lance la préparation.",
      },
      {
        value: "ORDER_PREPARER",
        label: "Préparateur de commande",
        help: "Prépare et clôture les commandes déjà validées.",
      },
    ],
  },
  {
    label: "Supervision métier",
    roles: [
      {
        value: "FINANCE_MANAGER",
        label: "Comptable / responsable financier",
        help: "Suit les encaissements, clôtures caisse, rapports financiers et liens de paiement.",
      },
      {
        value: "BILLING_MANAGER",
        label: "Responsable facturation",
        help: "Supervise la chaîne de facturation.",
      },
      {
        value: "COUNTER_MANAGER",
        label: "Responsable caisse",
        help: "Supervise les caissières et la synthèse consolidée des caisses.",
      },
      {
        value: "STOCK_MANAGER",
        label: "Gestionnaire de stock",
        help: "Pilote le stock et la préparation.",
      },
      {
        value: "MARKETING_MANAGER",
        label: "Responsable marketing",
        help: "Pilote les campagnes marketing, les campagnes SMS et les exports.",
      },
    ],
  },
  {
    label: "Direction et support",
    roles: [
      {
        value: "OPERATIONS_DIRECTOR",
        label: "Directeur des opérations",
        help: "Supervision transverse des opérations pays.",
      },
      {
        value: "SALES_DIRECTOR",
        label: "Directeur commercial",
        help: "Pilotage commercial et visibilité commandes.",
      },
      {
        value: "MARKETING_ASSISTANT",
        label: "Assistant marketing",
        help: "Consultation limitée marketing et exports.",
      },
    ],
  },
  {
    label: "Administration plateforme",
    roles: [
      {
        value: "SUPER_ADMIN",
        label: "Super Admin",
        help: "Accès total à la plateforme.",
      },
      {
        value: "TECH_ADMIN",
        label: "Admin technique",
        help: "Administration technique et support avancé.",
      },
    ],
  },
];

export const ROLE_OPTIONS = ROLE_GROUPS.flatMap((group) => group.roles);
export const roleLabel = (role) =>
  ROLE_OPTIONS.find((item) => item.value === role)?.label ||
  role ||
  "Non renseigné";
export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "Jamais";
export const PERMISSION_LABELS = {
  COUNTRY_READ: "Consulter les pays",
  COUNTRY_WRITE: "Modifier les paramètres",
  MARKETING_WRITE: "Gérer les campagnes",
  TICKET_CHECKIN: "Contrôler les billets",
  USER_ADMIN: "Gérer les utilisateurs",
  PRODUCT_READ: "Consulter le catalogue",
  PRODUCT_WRITE: "Modifier le catalogue et le stock",
  DISCOUNT_READ: "Consulter les remises",
  DISCOUNT_WRITE: "Modifier les remises",
  PREORDER_READ: "Consulter les commandes",
  PREORDER_UPDATE_STATUS: "Modifier les statuts de commande",
  INVOICE_CREATE: "Facturer les commandes",
  PAYMENT_VALIDATE: "Valider les paiements",
  EXTERNAL_PAYMENT_LINKS_MANAGE: "Gérer les liens de paiement",
  PREPARATION_UPDATE: "Préparer et remettre les colis",
  EXPORT_READ: "Consulter les rapports et exporter",
  FBO_DOCUMENT_ISSUE: "Émettre les documents FBO",
};
export const permissionLabel = (key) =>
  PERMISSION_LABELS[key] || "Droit de la plateforme";
export const permissionOptions = Object.values(Permission);
export function effectivePermissions(form) {
  const values = new Set([
    ...getRolePermissions(form.role),
    ...(form.permissionAllow || []),
  ]);
  for (const key of form.permissionDeny || []) values.delete(key);
  return [...values];
}
export function emptyForm(countryCode = "") {
  return {
    id: null,
    fullName: "",
    email: "",
    password: "",
    role: "",
    countryCode,
    actif: true,
    permissionAllow: [],
    permissionDeny: [],
  };
}
export function userForm(user) {
  return {
    ...emptyForm(),
    id: user.id,
    fullName: user.fullName || "",
    email: user.email || "",
    role: user.role,
    countryCode: user.countryCode || "",
    actif: user.actif,
    permissionAllow: user.permissionAllow || [],
    permissionDeny: user.permissionDeny || [],
  };
}
export function userPatch(form, baseline, canOverride = false) {
  const keys = [
    "fullName",
    "email",
    "role",
    "countryCode",
    ...(canOverride ? ["permissionAllow", "permissionDeny"] : []),
  ];
  return Object.fromEntries(
    keys
      .map((key) => [
        key,
        key === "email"
          ? form.email.trim().toLowerCase()
          : key === "fullName"
            ? form.fullName.trim()
            : form[key],
      ])
      .filter(
        ([key, value]) =>
          JSON.stringify(value) !== JSON.stringify(baseline[key]),
      ),
  );
}
export function validateUserForm(form, mode) {
  const errors = {};
  if (mode !== "password") {
    if (!form.fullName.trim() || form.fullName.length > 150)
      errors.fullName = "Renseignez un nom complet (150 caractères maximum).";
    if (
      form.email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    )
      errors.email = "Renseignez une adresse email valide.";
    if (!form.role) errors.role = "Sélectionnez un rôle.";
    if (form.role !== "SUPER_ADMIN" && !form.countryCode)
      errors.countryCode = "Sélectionnez un pays.";
  }
  if (mode === "create" || mode === "password") {
    const checks = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((rule) =>
      rule.test(form.password),
    ).length;
    if (form.password.length < 12 || checks < 3)
      errors.password =
        "Au moins 12 caractères et 3 types parmi majuscule, minuscule, chiffre et caractère spécial.";
    else if (new TextEncoder().encode(form.password).length > 72)
      errors.password = "Le mot de passe dépasse la limite de 72 octets.";
  }
  return errors;
}
export function overrideValue(form, key) {
  return form.permissionDeny.includes(key)
    ? "deny"
    : form.permissionAllow.includes(key)
      ? "allow"
      : "inherit";
}
export function setOverride(form, key, state) {
  const allow = form.permissionAllow.filter((value) => value !== key),
    deny = form.permissionDeny.filter((value) => value !== key);
  if (state === "allow") allow.push(key);
  if (state === "deny") deny.push(key);
  return { ...form, permissionAllow: allow, permissionDeny: deny };
}
