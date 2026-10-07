import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAdminAuth from "../hooks/useAdminAuth";
import { useConfirm } from "../hooks/useDialogs";
import { usersService } from "../services/usersService";
import { settingsService } from "../services/settingsService";
import { clearAdminSession, setAdminUser } from "../services/auth";
import UserFormDialog from "../components/users/UserFormDialog";
import {
  ROLE_GROUPS,
  roleLabel,
  formatDate,
  emptyForm,
  userForm,
  userPatch,
  validateUserForm,
} from "../components/users/usersModel";
const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:opacity-50";
export default function AdminUsersPage() {
  const { admin, role } = useAdminAuth(),
    confirm = useConfirm(),
    navigate = useNavigate();
  const isSuper = role === "SUPER_ADMIN";
  const [filters, setFilters] = useState({
      q: "",
      role: "",
      country: "",
      status: "",
      page: 1,
    }),
    [search, setSearch] = useState(""),
    [refresh, setRefresh] = useState(0),
    [countriesRetry, setCountriesRetry] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [users, setUsers] = useState([]),
    [meta, setMeta] = useState({
      totalCount: 0,
      totalPages: 1,
      manageableRoles: [],
    }),
    [countries, setCountries] = useState([]),
    [countriesError, setCountriesError] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [opening, setOpening] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState(null),
    [form, setForm] = useState(() => emptyForm()),
    [initial, setInitial] = useState(() => emptyForm()),
    [formErrors, setFormErrors] = useState({}),
    [formMessage, setFormMessage] = useState(""),
    [conflict, setConflict] = useState(false);
  const listRequest = useRef(0),
    detailRequest = useRef(0),
    mutation = useRef(false),
    confirming = useRef(false);
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setFilters((value) =>
          value.q === search.trim()
            ? value
            : { ...value, q: search.trim(), page: 1 },
        ),
      350,
    );
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const request = ++listRequest.current;
    setLoading(true);
    setError("");
    const params = {
      page: filters.page,
      pageSize: 20,
      q: filters.q || undefined,
      role: filters.role || undefined,
      countryCode: filters.country || undefined,
      actif:
        filters.status === "active"
          ? true
          : filters.status === "inactive"
            ? false
            : undefined,
    };
    usersService
      .getAll(params)
      .then((result) => {
        if (request !== listRequest.current) return;
        if (filters.page > result.totalPages) {
          setFilters((value) => ({
            ...value,
            page: Math.max(1, result.totalPages),
          }));
          return;
        }
        setUsers(result.data || []);
        setMeta({
          totalCount: result.totalCount || 0,
          totalPages: Math.max(1, result.totalPages || 1),
          manageableRoles: result.manageableRoles || [],
        });
      })
      .catch((next) => {
        if (request === listRequest.current)
          setError(
            next?.response?.data?.message ||
              "Impossible de charger les utilisateurs.",
          );
      })
      .finally(() => {
        if (request === listRequest.current) setLoading(false);
      });
    return () => {
      listRequest.current += 1;
    };
  }, [filters, refresh]);
  useEffect(() => {
    let active = true;
    settingsService
      .getCountriesList()
      .then((rows) => {
        if (active) {
          setCountries(rows);
          setCountriesError("");
        }
      })
      .catch(() => {
        if (active) setCountriesError("La liste des pays est indisponible.");
      });
    return () => {
      active = false;
    };
  }, [countriesRetry]);
  useEffect(
    () => () => {
      detailRequest.current += 1;
    },
    [],
  );
  const dirty = useMemo(
    () =>
      dialog &&
      dialog.mode !== "view" &&
      JSON.stringify(form) !== JSON.stringify(initial),
    [dialog, form, initial],
  );
  useEffect(() => {
    if (!dirty && !busy) return undefined;
    const warn = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  const countryOptions = isSuper
    ? countries
    : countries.filter((country) => country.code === admin?.countryCode);
  const patch =
    dialog?.mode === "edit" ? userPatch(form, initial, isSuper) : {};
  const closeDialog = async () => {
    if (mutation.current || confirming.current) return;
    if (dirty) {
      confirming.current = true;
      const ok = await confirm({
        title: "Fermer sans enregistrer ?",
        message: "Les modifications de cette fiche seront perdues.",
        confirmLabel: "Fermer sans enregistrer",
        tone: "warning",
      });
      confirming.current = false;
      if (!ok) return;
    }
    detailRequest.current += 1;
    setDialog(null);
    setForm(emptyForm());
    setInitial(emptyForm());
    setFormErrors({});
    setFormMessage("");
    setConflict(false);
  };
  function setDialogData(user, mode) {
    const next =
      mode === "create" ? emptyForm(admin?.countryCode || "") : userForm(user);
    setForm(next);
    setInitial(structuredClone(next));
    setFormErrors({});
    setFormMessage("");
    setConflict(false);
    setDialog({ mode, user });
  }
  const open = async (user, mode = "view") => {
    if (mutation.current) return;
    const request = ++detailRequest.current;
    setOpening(user.id);
    setError("");
    try {
      const result = await usersService.getById(user.id);
      if (request !== detailRequest.current) return;
      setDialogData(result, mode);
    } catch (next) {
      if (request === detailRequest.current)
        setError(
          next?.response?.data?.message || "Impossible de charger cette fiche.",
        );
    } finally {
      if (request === detailRequest.current) setOpening("");
    }
  };
  const reloadDialog = async () => {
    if (mutation.current || !dialog?.user) return;
    if (
      dirty &&
      !(await confirm({
        title: "Recharger cette fiche ?",
        message: "Le brouillon sera remplacé par les valeurs enregistrées.",
        confirmLabel: "Recharger",
        tone: "warning",
      }))
    )
      return;
    await open(dialog.user, dialog.mode);
  };
  function afterUpdate(updated) {
    if (updated.id === admin?.id) {
      const changedSession =
        dialog?.mode === "password" ||
        [
          "email",
          "role",
          "countryCode",
          "permissionAllow",
          "permissionDeny",
        ].some((key) => key in patch);
      if (changedSession) {
        clearAdminSession();
        navigate("/login", { replace: true });
        return true;
      }
      setAdminUser({ ...admin, ...updated });
    }
    return false;
  }
  const submit = async () => {
    if (mutation.current || !dialog || dialog.mode === "view") return;
    if (conflict) {
      setFormMessage(
        "Rechargez la fiche avant de réappliquer vos modifications.",
      );
      return;
    }
    const errors = validateUserForm(form, dialog.mode);
    setFormErrors(errors);
    setFormMessage("");
    if (Object.keys(errors).length) {
      setFormMessage("Corrigez les champs indiqués.");
      return errors.fullName || errors.email
        ? "identity"
        : errors.role || errors.countryCode
          ? "access"
          : null;
    }
    if (dialog.mode === "edit" && !Object.keys(patch).length) {
      setFormMessage("Aucune modification à enregistrer.");
      return;
    }
    const changesAccess =
      dialog.mode === "password" ||
      [
        "role",
        "countryCode",
        "permissionAllow",
        "permissionDeny",
        "email",
      ].some((key) => key in patch);
    if (changesAccess) {
      confirming.current = true;
      const ok = await confirm({
        title:
          dialog.mode === "password"
            ? "Réinitialiser ce mot de passe ?"
            : "Appliquer ces changements d’accès ?",
        message:
          "Les sessions précédentes de ce compte seront invalidées." +
          (dialog.user?.id === admin?.id
            ? " Vous devrez vous reconnecter."
            : ""),
        confirmLabel: "Confirmer",
        tone: "warning",
      });
      confirming.current = false;
      if (!ok) return;
    }
    mutation.current = true;
    setBusy(true);
    setConflict(false);
    try {
      let updated;
      if (dialog.mode === "create")
        updated = await usersService.create({
          ...form,
          fullName: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          ...(isSuper
            ? {}
            : { permissionAllow: undefined, permissionDeny: undefined }),
        });
      else
        updated = await usersService.update(form.id, {
          ...(dialog.mode === "password" ? { password: form.password } : patch),
          expectedUpdatedAt: dialog.user.updatedAt,
        });
      if (dialog.mode !== "create" && afterUpdate(updated)) return;
      setNotice(
        dialog.mode === "create"
          ? "Compte créé. La liste respecte les filtres sélectionnés."
          : dialog.mode === "password"
            ? "Mot de passe réinitialisé et sessions révoquées."
            : "Compte enregistré.",
      );
      setDialog(null);
      setForm(emptyForm());
      setInitial(emptyForm());
      setRefresh((value) => value + 1);
    } catch (next) {
      setFormErrors(next?.response?.data?.errors || {});
      setFormMessage(
        next?.response?.data?.message ||
          "Impossible d’enregistrer le compte. Votre brouillon est conservé.",
      );
      setConflict(
        next?.response?.status === 409 && !next?.response?.data?.errors,
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };
  const changeStatus = async (user) => {
    if (
      mutation.current ||
      confirming.current ||
      !user.actions?.canChangeStatus
    )
      return;
    confirming.current = true;
    const ok = await confirm({
      title: user.actif ? "Désactiver ce compte ?" : "Réactiver ce compte ?",
      message:
        (user.fullName || user.email) +
        (user.actif
          ? " ne pourra plus se connecter. Ses sessions seront invalidées."
          : " pourra de nouveau se connecter avec son mot de passe."),
      confirmLabel: user.actif ? "Désactiver" : "Réactiver",
      tone: "warning",
    });
    confirming.current = false;
    if (!ok) return;
    mutation.current = true;
    setBusy(true);
    setError("");
    try {
      await usersService.updateStatus(user.id, !user.actif, user.updatedAt);
      setNotice(
        user.actif
          ? "Compte désactivé et sessions révoquées."
          : "Compte réactivé.",
      );
      setRefresh((value) => value + 1);
    } catch (next) {
      setError(
        next?.response?.data?.message || "Impossible de modifier ce statut.",
      );
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };
  const revoke = async () => {
    const user = dialog?.user;
    if (!user || mutation.current || confirming.current) return;
    confirming.current = true;
    const ok = await confirm({
      title: "Déconnecter les sessions ?",
      message:
        "Toutes les sessions précédentes de " +
        (user.fullName || user.email) +
        " seront invalidées." +
        (user.id === admin?.id ? " Vous serez également déconnecté." : ""),
      confirmLabel: "Déconnecter",
      tone: "warning",
    });
    confirming.current = false;
    if (!ok) return;
    mutation.current = true;
    setBusy(true);
    try {
      const updated = await usersService.revokeSessions(
        user.id,
        user.updatedAt,
      );
      if (user.id === admin?.id) {
        clearAdminSession();
        navigate("/login", { replace: true });
        return;
      }
      setDialogData(updated, "view");
      setNotice("Les sessions de ce compte ont été révoquées.");
      setRefresh((value) => value + 1);
    } catch (next) {
      setFormMessage(
        next?.response?.data?.message || "Impossible de révoquer les sessions.",
      );
      setConflict(next?.response?.status === 409);
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  };
  const changeFilter = (key, value) => {
    setFilters((previous) => ({ ...previous, [key]: value, page: 1 }));
    setNotice("");
  };
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Utilisateurs et accès
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Comptes administrateurs, rôles et périmètres de travail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            detailRequest.current += 1;
            setDialogData(null, "create");
          }}
          disabled={busy || loading || !meta.manageableRoles.length}
          className="rounded-lg bg-[#FFC600] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          Nouvel utilisateur
        </button>
      </header>
      {notice ? (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
        >
          {notice}
          <button
            type="button"
            aria-label="Fermer le message"
            onClick={() => setNotice("")}
            className="ml-3"
          >
            ×
          </button>
        </div>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
          <button
            type="button"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={busy || loading}
            className="underline"
          >
            Actualiser la liste
          </button>
        </div>
      ) : null}
      {countriesError ? (
        <p role="alert" className="text-sm text-amber-700">
          {countriesError}{" "}
          <button
            type="button"
            onClick={() => setCountriesRetry((value) => value + 1)}
            className="underline"
          >
            Réessayer
          </button>
        </p>
      ) : null}
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1.5 text-xs font-medium text-gray-600">
            Rechercher
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nom ou email"
              disabled={busy}
              className={inputClass}
            />
          </label>
          <label
            id="users-role-filter"
            className={
              "gap-1.5 text-xs font-medium text-gray-600 " +
              (filtersOpen ? "grid" : "hidden sm:grid")
            }
          >
            Rôle
            <select
              value={filters.role}
              onChange={(event) => changeFilter("role", event.target.value)}
              disabled={busy}
              className={inputClass}
            >
              <option value="">Tous les rôles</option>
              {ROLE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.roles.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label
            id="users-country-filter"
            className={
              "gap-1.5 text-xs font-medium text-gray-600 " +
              (filtersOpen ? "grid" : "hidden sm:grid")
            }
          >
            Pays
            <select
              value={isSuper ? filters.country : admin?.countryCode || ""}
              onChange={(event) => changeFilter("country", event.target.value)}
              disabled={busy || !isSuper}
              className={inputClass}
            >
              {isSuper ? <option value="">Tous les pays</option> : null}
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>
          <label
            id="users-status-filter"
            className={
              "gap-1.5 text-xs font-medium text-gray-600 " +
              (filtersOpen ? "grid" : "hidden sm:grid")
            }
          >
            Statut
            <select
              value={filters.status}
              onChange={(event) => changeFilter("status", event.target.value)}
              disabled={busy}
              className={inputClass}
            >
              <option value="">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <p role="status" className="text-xs text-gray-500">
            {loading
              ? "Chargement des utilisateurs…"
              : meta.totalCount + " compte(s) correspondant(s)"}
            {!isSuper
              ? " · " +
                (admin?.countryName || admin?.countryCode || "Votre pays")
              : ""}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFiltersOpen((value) => !value)}
              aria-expanded={filtersOpen}
              aria-controls="users-role-filter users-country-filter users-status-filter"
              className="text-xs text-gray-600 underline sm:hidden"
            >
              {filtersOpen
                ? "Masquer les filtres"
                : "Filtres" +
                  ([filters.role, filters.country, filters.status].filter(
                    Boolean,
                  ).length
                    ? " (" +
                      [filters.role, filters.country, filters.status].filter(
                        Boolean,
                      ).length +
                      ")"
                    : "")}
            </button>
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => setRefresh((value) => value + 1)}
              className="text-xs text-gray-600 underline"
            >
              Actualiser
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setSearch("");
                setFilters({
                  q: "",
                  role: "",
                  country: "",
                  status: "",
                  page: 1,
                });
                setNotice("");
              }}
              className="text-xs text-gray-600 underline"
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      </section>
      <section
        aria-busy={loading}
        className="overflow-hidden rounded-xl border border-gray-200 bg-white"
      >
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                {[
                  "Utilisateur",
                  "Rôle et droits",
                  "Pays",
                  "Statut",
                  "Actions",
                ].map((label) => (
                  <th key={label} scope="col" className="px-4 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={
                    "border-t border-gray-100 " + (loading ? "opacity-50" : "")
                  }
                >
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      disabled={busy || loading}
                      onClick={() => open(user)}
                      className="text-left font-medium text-gray-900 hover:underline"
                    >
                      {user.fullName || user.email}
                      {user.id === admin?.id ? (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                          Votre compte
                        </span>
                      ) : null}
                    </button>
                    <p className="mt-1 text-xs text-gray-500">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Dernière connexion : {formatDate(user.lastLoginAt)}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-700">
                      {roleLabel(user.role)}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {user.permissions?.length || 0} droits ·{" "}
                      {user.permissionAllow?.length || 0} ajout(s) ·{" "}
                      {user.permissionDeny?.length || 0} refus
                    </p>
                  </td>
                  <td className="px-4 py-4 text-gray-600">
                    {user.role === "SUPER_ADMIN"
                      ? "Tous les pays"
                      : user.countryName || user.countryCode || "Non attribué"}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={
                        "rounded-full px-2 py-1 text-xs font-medium " +
                        (user.actif
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-500")
                      }
                    >
                      {user.actif ? "Actif" : "Inactif"}
                    </span>
                    {user.lockedUntil &&
                    new Date(user.lockedUntil) > new Date() ? (
                      <p className="mt-2 text-xs text-amber-700">
                        Verrouillé jusqu’au {formatDate(user.lockedUntil)}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => open(user)}
                        disabled={busy || loading || Boolean(opening)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-xs disabled:opacity-50"
                      >
                        {opening === user.id ? "Ouverture…" : "Consulter"}
                      </button>
                      {user.actions?.canEdit ? (
                        <button
                          type="button"
                          onClick={() => open(user, "edit")}
                          disabled={busy || loading || Boolean(opening)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs disabled:opacity-50"
                        >
                          Modifier
                        </button>
                      ) : null}
                      {user.actions?.canChangeStatus ? (
                        <button
                          type="button"
                          onClick={() => changeStatus(user)}
                          disabled={busy || loading}
                          className={
                            "rounded-lg border px-3 py-2 text-xs disabled:opacity-50 " +
                            (user.actif
                              ? "border-red-200 text-red-700"
                              : "border-emerald-200 text-emerald-700")
                          }
                        >
                          {user.actif ? "Désactiver" : "Réactiver"}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-gray-500"
                  >
                    {loading
                      ? "Chargement…"
                      : error
                        ? "La liste est indisponible. Réessayez."
                        : "Aucun utilisateur ne correspond à ces filtres."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-gray-200 sm:hidden">
          {users.map((user) => (
            <article
              key={user.id}
              className={"space-y-3 p-4 " + (loading ? "opacity-50" : "")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => open(user)}
                    disabled={busy || loading}
                    className="break-words text-left text-sm font-semibold text-gray-900"
                  >
                    {user.fullName || user.email}
                  </button>
                  <p className="break-all text-xs text-gray-500">
                    {user.email}
                  </p>
                  {user.id === admin?.id ? (
                    <span className="text-xs text-gray-500">Votre compte</span>
                  ) : null}
                </div>
                <span
                  className={
                    "shrink-0 rounded-full px-2 py-1 text-xs " +
                    (user.actif
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-500")
                  }
                >
                  {user.actif ? "Actif" : "Inactif"}
                </span>
              </div>
              <div className="text-xs text-gray-600">
                <p>
                  {roleLabel(user.role)} ·{" "}
                  {user.role === "SUPER_ADMIN"
                    ? "Tous les pays"
                    : user.countryName || user.countryCode || "Non attribué"}
                </p>
                <p className="mt-1 text-gray-500">
                  Dernière connexion : {formatDate(user.lastLoginAt)}
                </p>
                {user.lockedUntil && new Date(user.lockedUntil) > new Date() ? (
                  <p className="mt-1 text-amber-700">
                    Verrouillé jusqu’au {formatDate(user.lockedUntil)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => open(user)}
                  disabled={busy || loading || Boolean(opening)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs disabled:opacity-50"
                >
                  {opening === user.id ? "Ouverture…" : "Consulter"}
                </button>
                {user.actions?.canEdit ? (
                  <button
                    type="button"
                    onClick={() => open(user, "edit")}
                    disabled={busy || loading || Boolean(opening)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs disabled:opacity-50"
                  >
                    Modifier
                  </button>
                ) : null}
                {user.actions?.canChangeStatus ? (
                  <button
                    type="button"
                    onClick={() => changeStatus(user)}
                    disabled={busy || loading}
                    className={
                      "rounded-lg border px-3 py-2 text-xs disabled:opacity-50 " +
                      (user.actif
                        ? "border-red-200 text-red-700"
                        : "border-emerald-200 text-emerald-700")
                    }
                  >
                    {user.actif ? "Désactiver" : "Réactiver"}
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {!users.length ? (
            <p className="p-8 text-center text-sm text-gray-500">
              {loading
                ? "Chargement…"
                : error
                  ? "La liste est indisponible. Réessayez."
                  : "Aucun compte ne correspond aux filtres."}
            </p>
          ) : null}
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-4 text-xs text-gray-500">
          <p>
            {meta.totalCount ? (filters.page - 1) * 20 + 1 : 0}–
            {Math.min(filters.page * 20, meta.totalCount)} sur {meta.totalCount}
          </p>
          <nav
            aria-label="Pagination des utilisateurs"
            className="flex items-center gap-3"
          >
            <button
              type="button"
              disabled={busy || loading || filters.page <= 1}
              onClick={() =>
                setFilters((value) => ({ ...value, page: value.page - 1 }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-40"
            >
              Précédent
            </button>
            <span>
              Page {filters.page} sur {meta.totalPages}
            </span>
            <button
              type="button"
              disabled={busy || loading || filters.page >= meta.totalPages}
              onClick={() =>
                setFilters((value) => ({ ...value, page: value.page + 1 }))
              }
              className="rounded-lg border border-gray-300 px-3 py-2 disabled:opacity-40"
            >
              Suivant
            </button>
          </nav>
        </footer>
      </section>
      {dialog ? (
        <UserFormDialog
          key={dialog.mode + ":" + (dialog.user?.id || "new")}
          mode={dialog.mode}
          form={form}
          baseline={dialog.user}
          onChange={(next) => {
            setForm(next);
            setFormErrors({});
            if (!conflict) setFormMessage("");
          }}
          onClose={closeDialog}
          onSubmit={submit}
          busy={busy}
          submitBlocked={conflict}
          errors={formErrors}
          message={formMessage}
          allowedRoles={meta.manageableRoles}
          countries={countryOptions}
          countryLocked={!isSuper}
          canOverride={isSuper}
          isOwn={dialog.user?.id === admin?.id}
          onEdit={() => setDialogData(dialog.user, "edit")}
          onPassword={() => setDialogData(dialog.user, "password")}
          onRevoke={revoke}
          onReload={conflict ? reloadDialog : undefined}
        />
      ) : null}
    </div>
  );
}
