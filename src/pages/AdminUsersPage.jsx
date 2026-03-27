// AdminUsersPage.jsx
// Ce fichier contient la page de gestion des utilisateurs administrateurs.

import { useCallback, useEffect, useMemo, useState } from "react";
import { usersService } from "../services/usersService";

/* ============================================================================
   Config métier
============================================================================ */

const ROLE_GROUPS = [
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

const ROLE_OPTIONS = ROLE_GROUPS.flatMap((group) => group.roles);

const COUNTRY_OPTIONS = [
  { value: "CIV", label: "Côte d’Ivoire" },
  { value: "BFA", label: "Burkina Faso" },
  { value: "TGO", label: "Togo" },
  { value: "BEN", label: "Bénin" },
  { value: "NER", label: "Niger" },
];

/* ============================================================================
   Helpers
============================================================================ */

function getRoleLabel(role) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label || role || "—";
}

function getRoleHelp(role) {
  return ROLE_OPTIONS.find((r) => r.value === role)?.help || "";
}

function getCountryLabel(code) {
  return COUNTRY_OPTIONS.find((c) => c.value === code)?.label || code || "—";
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function emptyForm() {
  return {
    id: null,
    fullName: "",
    email: "",
    password: "",
    role: "",
    countryCode: "CIV",
    actif: true,
  };
}

/* ============================================================================
   UI atoms
============================================================================ */

function Card({ title, actions, children }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function Alert({ tone = "blue", children }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    red: "border-red-200 bg-red-50 text-red-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone] || tones.blue}`}>
      {children}
    </div>
  );
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        tones[tone] || tones.gray
      }`}
    >
      {children}
    </span>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block space-y-1.5">
      <div className="text-sm font-medium text-gray-700">
        {label} {required ? <span className="text-red-500">*</span> : null}
      </div>
      {children}
    </label>
  );
}

function RoleCatalog() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {ROLE_GROUPS.map((group) => (
        <div
          key={group.label}
          className="rounded-xl border border-gray-200 bg-gray-50 p-4"
        >
          <div className="text-sm font-semibold text-gray-900">{group.label}</div>
          <div className="mt-3 space-y-3">
            {group.roles.map((role) => (
              <div
                key={role.value}
                className="rounded-lg border border-gray-200 bg-white px-3 py-3"
              >
                <div className="text-sm font-medium text-gray-900">{role.label}</div>
                <div className="mt-1 text-xs text-gray-500">{role.help}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================================
   Modal formulaire
============================================================================ */

function UserFormModal({
  open,
  mode = "create",
  value,
  onChange,
  onClose,
  onSubmit,
  saving = false,
}) {
  if (!open) return null;

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {isEdit ? "Modifier l’utilisateur" : "Nouvel utilisateur"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Renseigne les informations du compte administrateur.
            </p>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nom complet" required>
              <input
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                value={value.fullName}
                onChange={(e) => onChange({ ...value, fullName: e.target.value })}
                placeholder="Ex: Marie Konan"
                disabled={saving}
              />
            </Field>

            <Field label="Email" required>
              <input
                type="email"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                value={value.email}
                onChange={(e) => onChange({ ...value, email: e.target.value })}
                placeholder="Ex: marie@forever.com"
                disabled={saving}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Rôle" required>
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                value={value.role}
                onChange={(e) => onChange({ ...value, role: e.target.value })}
                disabled={saving}
              >
                <option value="">Sélectionner un rôle</option>
                {ROLE_GROUPS.map((group) => (
                  <optgroup key={group.label} label={group.label}>
                    {group.roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {value.role ? (
                <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
                  {getRoleHelp(value.role)}
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  Sélectionne le rôle selon l’étape métier: facturation, caisse, préparation ou supervision.
                </div>
              )}
            </Field>

            <Field label="Pays">
              <select
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                value={value.countryCode}
                onChange={(e) => onChange({ ...value, countryCode: e.target.value })}
                disabled={saving}
              >
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label={isEdit ? "Nouveau mot de passe (optionnel)" : "Mot de passe"} required={!isEdit}>
            <input
              type="password"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              value={value.password}
              onChange={(e) => onChange({ ...value, password: e.target.value })}
              placeholder={isEdit ? "Laisser vide pour conserver l’actuel" : "Mot de passe"}
              disabled={saving}
            />
          </Field>

          <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3">
            <input
              type="checkbox"
              checked={value.actif}
              onChange={(e) => onChange({ ...value, actif: e.target.checked })}
              disabled={saving}
            />
            <div>
              <div className="text-sm font-medium text-gray-900">Compte actif</div>
              <div className="text-xs text-gray-500">
                L’utilisateur pourra se connecter si ce compte est actif.
              </div>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving
              ? "Enregistrement..."
              : isEdit
                ? "Enregistrer les modifications"
                : "Créer l’utilisateur"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   Page principale
============================================================================ */

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [form, setForm] = useState(emptyForm());

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = {};
      if (search.trim()) params.q = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (countryFilter) params.countryCode = countryFilter;
      if (statusFilter === "ACTIVE") params.actif = true;
      if (statusFilter === "INACTIVE") params.actif = false;

      const data = await usersService.getAll(params);
      setUsers(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les utilisateurs");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, countryFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => users, [users]);

  const openCreate = () => {
    setError("");
    setInfo("");
    setModalMode("create");
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setError("");
    setInfo("");
    setModalMode("edit");
    setForm({
      id: user.id,
      fullName: user.fullName || "",
      email: user.email || "",
      password: "",
      role: user.role || "",
      countryCode: user.countryCode || "CIV",
      actif: Boolean(user.actif),
    });
    setModalOpen(true);
  };

  const handleToggleStatus = async (user) => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const updated = await usersService.updateStatus(user.id, !user.actif);

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? updated : u))
      );

      setInfo(
        updated.actif
          ? `Utilisateur activé : ${updated.fullName || updated.email}`
          : `Utilisateur désactivé : ${updated.fullName || updated.email}`
      );
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de mettre à jour le statut");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForm = async () => {
    try {
      setError("");
      setInfo("");

      if (!form.fullName.trim()) {
        setError("Le nom complet est requis.");
        return;
      }

      if (!form.email.trim()) {
        setError("L’email est requis.");
        return;
      }

      if (!form.role) {
        setError("Le rôle est requis.");
        return;
      }

      if (modalMode === "create" && !form.password.trim()) {
        setError("Le mot de passe est requis pour la création.");
        return;
      }

      setSaving(true);

      if (modalMode === "create") {
        const created = await usersService.create({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          countryCode: form.countryCode,
          actif: Boolean(form.actif),
        });

        setUsers((prev) => [created, ...prev]);
        setInfo("Utilisateur créé avec succès.");
      } else {
        const updated = await usersService.update(form.id, {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password?.trim() ? form.password : undefined,
          role: form.role,
          countryCode: form.countryCode,
          actif: Boolean(form.actif),
        });

        setUsers((prev) =>
          prev.map((u) => (u.id === form.id ? updated : u))
        );
        setInfo("Utilisateur modifié avec succès.");
      }

      setModalOpen(false);
      setForm(emptyForm());
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d’enregistrer l’utilisateur");
    } finally {
      setSaving(false);
    }
  };

  const handleApplySearch = () => {
    setSearch(searchInput);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSearchInput("");
    setRoleFilter("");
    setCountryFilter("");
    setStatusFilter("");
  };

  return (
    <div className="space-y-6">
      <Card
        title="Gestion des utilisateurs"
        actions={
          <button
            onClick={openCreate}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Nouvel utilisateur
          </button>
        }
      >
        <div className="space-y-5">
          <Alert tone="blue">
            Gère ici les comptes administrateurs de l’application : rôles,
            pays, statut actif et accès à l’admin.
          </Alert>

          <RoleCatalog />

          {error ? <Alert tone="red">{error}</Alert> : null}
          {info ? <Alert tone="emerald">{info}</Alert> : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="Rechercher par nom ou email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApplySearch();
              }}
            />

            <select
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">Tous les rôles</option>
              {ROLE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
            >
              <option value="">Tous les pays</option>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.value} value={country.value}>
                  {country.label}
                </option>
              ))}
            </select>

            <select
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="INACTIVE">Inactifs</option>
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleApplySearch}
                className="flex-1 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-black"
              >
                Rechercher
              </button>
              <button
                onClick={handleResetFilters}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Utilisateur
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Rôle
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Pays
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Statut
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Créé le
                  </th>
                  <th className="border-b border-gray-200 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      Chargement...
                    </td>
                  </tr>
                ) : filteredUsers.length ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="border-b border-gray-100 px-4 py-4">
                        <div className="font-medium text-gray-900">
                          {user.fullName || "—"}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {user.email || "—"}
                        </div>
                      </td>

                      <td className="border-b border-gray-100 px-4 py-4">
                        <Badge tone="violet">{getRoleLabel(user.role)}</Badge>
                      </td>

                      <td className="border-b border-gray-100 px-4 py-4">
                        <Badge tone="blue">{getCountryLabel(user.countryCode)}</Badge>
                      </td>

                      <td className="border-b border-gray-100 px-4 py-4">
                        {user.actif ? (
                          <Badge tone="emerald">Actif</Badge>
                        ) : (
                          <Badge tone="red">Inactif</Badge>
                        )}
                      </td>

                      <td className="border-b border-gray-100 px-4 py-4 text-sm text-gray-500">
                        {formatDateTime(user.createdAt)}
                      </td>

                      <td className="border-b border-gray-100 px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(user)}
                            disabled={saving}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Modifier
                          </button>

                          <button
                            onClick={() => handleToggleStatus(user)}
                            disabled={saving}
                            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
                              user.actif
                                ? "bg-red-600 hover:bg-red-700"
                                : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {user.actif ? "Désactiver" : "Activer"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-sm text-gray-500"
                    >
                      Aucun utilisateur trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <UserFormModal
        open={modalOpen}
        mode={modalMode}
        value={form}
        onChange={setForm}
        onClose={() => !saving && setModalOpen(false)}
        onSubmit={handleSubmitForm}
        saving={saving}
      />
    </div>
  );
}
