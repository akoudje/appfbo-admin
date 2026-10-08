import { useEffect, useId, useRef, useState } from "react";
import { getRolePermissions } from "../../auth/permissions";
import {
  ROLE_GROUPS,
  ROLE_OPTIONS,
  permissionOptions,
  permissionLabel,
  effectivePermissions,
  overrideValue,
  setOverride,
  roleLabel,
  formatDate,
} from "./usersModel";
import UserHistory from "./UserHistory";
const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500";
function Field({ label, error, children }) {
  const id = useId();
  return (
    <div className="grid gap-1.5 text-sm font-medium text-gray-900">
      <label htmlFor={id}>{label}</label>
      {children(id)}
      {error ? (
        <span
          id={id + "-error"}
          role="alert"
          className="text-xs font-normal text-red-700"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
export default function UserFormDialog({
  mode,
  form,
  baseline,
  onChange,
  onClose,
  onSubmit,
  busy,
  submitBlocked,
  errors,
  message,
  allowedRoles,
  countries,
  countryLocked,
  canOverride,
  isOwn,
  onEdit,
  onPassword,
  onRevoke,
  onReload,
}) {
  const panel = useRef(null),
    title = useId();
  const [showPassword, setShowPassword] = useState(false),
    [tab, setTab] = useState("identity");
  const readOnly = mode === "view";
  const passwordMode = mode === "password";
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (
      panel.current?.querySelector(
        "input:not(:disabled):not([type=checkbox])",
      ) || panel.current?.querySelector("button")
    )?.focus();
    return () => {
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  function keyboard(event) {
    if (document.querySelector("[role=alertdialog]")) return;
    if (event.key === "Escape" && !busy) {
      event.preventDefault();
      event.stopPropagation();
      onClose();
    }
    if (event.key === "Tab") {
      const controls = [
        ...panel.current.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]',
        ),
      ].filter((node) => node.getClientRects().length);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }
  const rights = effectivePermissions(form);
  const groupRoles = ROLE_GROUPS.map((group) => ({
    ...group,
    roles: group.roles.filter(
      (role) => allowedRoles.includes(role.value) || role.value === form.role,
    ),
  })).filter((group) => group.roles.length);
  const titleText =
    mode === "create"
      ? "Nouvel utilisateur"
      : passwordMode
        ? "Réinitialiser le mot de passe"
        : readOnly
          ? "Fiche utilisateur"
          : "Modifier le compte";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title}
      onKeyDown={keyboard}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-5"
    >
      <section
        ref={panel}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-gray-200 p-5">
          <div className="min-w-0 break-words">
            <h2 id={title} className="text-lg font-semibold text-gray-900">
              {titleText}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {mode === "create"
                ? "Créez un compte et attribuez son périmètre de travail."
                : baseline?.fullName + " · " + baseline?.email}
              {isOwn ? " · Votre compte" : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer la fiche"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-2 py-1 text-xl text-gray-500 disabled:opacity-50"
          >
            ×
          </button>
        </header>
        <form
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            const section = await onSubmit();
            if (section) setTab(section);
            requestAnimationFrame(() =>
              panel.current?.querySelector('[aria-invalid="true"]')?.focus(),
            );
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
            {message ? (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              >
                {message}
                {onReload ? (
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={onReload}
                    disabled={busy}
                  >
                    Recharger la fiche
                  </button>
                ) : null}
              </div>
            ) : null}
            {!passwordMode ? (
              <nav
                aria-label="Sections de la fiche"
                className="flex gap-2 overflow-x-auto"
              >
                {[
                  ["identity", "Identité"],
                  ["access", "Accès et permissions"],
                  ...(readOnly ? [["activity", "Sécurité et activité"]] : []),
                ].map(([key, label]) => (
                  <button
                    type="button"
                    key={key}
                    aria-pressed={tab === key}
                    onClick={() => setTab(key)}
                    className={
                      "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium " +
                      (tab === key
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600")
                    }
                  >
                    {label}
                  </button>
                ))}
              </nav>
            ) : null}
            {passwordMode ? (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Le nouveau mot de passe invalidera toutes les sessions de ce
                compte.{isOwn ? " Vous devrez vous reconnecter." : ""}
              </p>
            ) : null}
            {!passwordMode && tab === "identity" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nom complet" error={errors.fullName}>
                    {(id) => (
                      <input
                        id={id}
                        autoComplete="name"
                        maxLength={150}
                        required
                        value={form.fullName}
                        onChange={(event) =>
                          onChange({ ...form, fullName: event.target.value })
                        }
                        disabled={busy}
                        readOnly={readOnly}
                        aria-invalid={Boolean(errors.fullName)}
                        aria-describedby={
                          errors.fullName ? id + "-error" : undefined
                        }
                        className={inputClass}
                      />
                    )}
                  </Field>
                  <Field label="Email" error={errors.email}>
                    {(id) => (
                      <input
                        id={id}
                        autoComplete="off"
                        type="email"
                        required
                        maxLength={254}
                        value={form.email}
                        onChange={(event) =>
                          onChange({ ...form, email: event.target.value })
                        }
                        disabled={busy}
                        readOnly={readOnly}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={
                          errors.email ? id + "-error" : undefined
                        }
                        className={inputClass}
                      />
                    )}
                  </Field>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm">
                  <p>
                    <strong>Statut :</strong> {form.actif ? "Actif" : "Inactif"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {isOwn
                      ? "Votre rôle, votre pays et votre statut sont protégés."
                      : "La désactivation se fait depuis la liste, avec confirmation."}
                  </p>
                </div>
                {mode === "create" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.actif}
                      onChange={(event) =>
                        onChange({ ...form, actif: event.target.checked })
                      }
                      disabled={busy}
                    />
                    Activer le compte dès sa création
                  </label>
                ) : null}
                {readOnly ? (
                  <div className="grid gap-3 sm:grid-cols-2 text-sm">
                    <p>
                      <span className="block text-xs text-gray-500">Rôle</span>
                      {roleLabel(form.role)}
                    </p>
                    <p>
                      <span className="block text-xs text-gray-500">Pays</span>
                      {form.role === "SUPER_ADMIN"
                        ? "Tous les pays"
                        : countries.find(
                            (country) => country.code === form.countryCode,
                          )?.name || form.countryCode}
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
            {!passwordMode && tab === "access" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Rôle" error={errors.role}>
                    {(id) => (
                      <select
                        id={id}
                        value={form.role}
                        onChange={(event) =>
                          onChange({
                            ...form,
                            role: event.target.value,
                            countryCode:
                              event.target.value === "SUPER_ADMIN"
                                ? ""
                                : form.countryCode,
                          })
                        }
                        disabled={busy || readOnly || isOwn}
                        required
                        className={inputClass}
                        aria-invalid={Boolean(errors.role)}
                        aria-describedby={
                          errors.role ? id + "-error" : undefined
                        }
                      >
                        <option value="">Sélectionner un rôle</option>
                        {groupRoles.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.roles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    )}
                  </Field>
                  <Field label="Pays de travail" error={errors.countryCode}>
                    {(id) => (
                      <select
                        id={id}
                        value={
                          form.role === "SUPER_ADMIN" ? "" : form.countryCode
                        }
                        onChange={(event) =>
                          onChange({ ...form, countryCode: event.target.value })
                        }
                        disabled={
                          busy ||
                          readOnly ||
                          isOwn ||
                          countryLocked ||
                          form.role === "SUPER_ADMIN"
                        }
                        className={inputClass}
                        aria-invalid={Boolean(errors.countryCode)}
                        aria-describedby={
                          errors.countryCode ? id + "-error" : undefined
                        }
                      >
                        <option value="">
                          {form.role === "SUPER_ADMIN"
                            ? "Tous les pays"
                            : "Sélectionner un pays"}
                        </option>
                        {countries.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </Field>
                </div>
                <p className="text-xs text-gray-500">
                  {ROLE_OPTIONS.find((role) => role.value === form.role)
                    ?.help || "Le rôle définit les droits de base du compte."}
                </p>
                <section className="space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    Permissions effectives
                  </h3>
                  <p className="text-xs text-gray-500">
                    {rights.length} droit(s) accordé(s). Un refus spécifique
                    prévaut sur le rôle et sur une autorisation ajoutée.
                  </p>
                  {permissionOptions.map((key) => {
                    const inherited = getRolePermissions(form.role).includes(
                        key,
                      ),
                      enabled = rights.includes(key);
                    return (
                      <div
                        key={key}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 p-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {permissionLabel(key)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {enabled ? "Autorisé" : "Non autorisé"} ·{" "}
                            {overrideValue(form, key) === "inherit"
                              ? inherited
                                ? "Hérité du rôle"
                                : "Non inclus dans le rôle"
                              : "Exception spécifique"}
                          </p>
                        </div>
                        {canOverride && !readOnly ? (
                          <label className="text-xs text-gray-500">
                            <span className="sr-only">
                              Droit spécifique : {permissionLabel(key)}
                            </span>
                            <select
                              value={overrideValue(form, key)}
                              onChange={(event) =>
                                onChange(
                                  setOverride(form, key, event.target.value),
                                )
                              }
                              disabled={busy}
                              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm"
                            >
                              <option value="inherit">Hérité du rôle</option>
                              <option value="allow">Autoriser</option>
                              <option value="deny">Refuser</option>
                            </select>
                          </label>
                        ) : (
                          <span
                            className={
                              "rounded-full px-2 py-1 text-xs " +
                              (enabled
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-gray-100 text-gray-500")
                            }
                          >
                            {enabled ? "Autorisé" : "Non autorisé"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </section>
              </>
            ) : null}
            {passwordMode || mode === "create" ? (
              <Field
                label={
                  passwordMode ? "Nouveau mot de passe" : "Mot de passe initial"
                }
                error={errors.password}
              >
                {(id) => (
                  <>
                    <div className="flex gap-2">
                      <input
                        id={id}
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        required
                        value={form.password}
                        onChange={(event) =>
                          onChange({ ...form, password: event.target.value })
                        }
                        disabled={busy}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={
                          id +
                          "-policy" +
                          (errors.password ? " " + id + "-error" : "")
                        }
                        className={inputClass}
                      />
                      <button
                        type="button"
                        aria-label={
                          showPassword
                            ? "Masquer le mot de passe"
                            : "Afficher le mot de passe"
                        }
                        onClick={() => setShowPassword((value) => !value)}
                        className="rounded-lg border border-gray-300 px-3 text-xs text-gray-600"
                      >
                        {showPassword ? "Masquer" : "Afficher"}
                      </button>
                    </div>
                    <span
                      id={id + "-policy"}
                      className="text-xs font-normal text-gray-500"
                    >
                      Au moins 12 caractères et 3 types parmi majuscule,
                      minuscule, chiffre et caractère spécial. Maximum 72
                      octets.
                    </span>
                  </>
                )}
              </Field>
            ) : null}
            {readOnly && tab === "activity" ? (
              <>
                <dl className="grid gap-4 sm:grid-cols-2 text-sm">
                  <div>
                    <dt className="text-xs text-gray-500">
                      Dernière connexion
                    </dt>
                    <dd>{formatDate(baseline.lastLoginAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">
                      Dernier changement de mot de passe
                    </dt>
                    <dd>{formatDate(baseline.passwordChangedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">
                      Verrouillage temporaire
                    </dt>
                    <dd>
                      {baseline.lockedUntil &&
                      new Date(baseline.lockedUntil) > new Date()
                        ? "Jusqu’au " + formatDate(baseline.lockedUntil)
                        : "Aucun verrouillage en cours"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-500">Compte créé le</dt>
                    <dd>{formatDate(baseline.createdAt)}</dd>
                  </div>
                </dl>
                <div className="flex flex-wrap gap-2">
                  {baseline.actions?.canResetPassword ? (
                    <button
                      type="button"
                      onClick={onPassword}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      Réinitialiser le mot de passe
                    </button>
                  ) : null}
                  {baseline.actions?.canRevokeSessions ? (
                    <button
                      type="button"
                      onClick={onRevoke}
                      disabled={busy}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      Déconnecter les sessions
                    </button>
                  ) : null}
                </div>
                <UserHistory
                  key={baseline.id + baseline.updatedAt}
                  userId={baseline.id}
                  updatedAt={baseline.updatedAt}
                  countries={countries}
                />
              </>
            ) : null}
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 p-4">
            <p className="text-xs text-gray-500">
              {readOnly
                ? "Consultation du compte"
                : passwordMode
                  ? "Les sessions précédentes seront invalidées."
                  : "Les changements prennent effet après enregistrement."}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm disabled:opacity-50"
              >
                {readOnly ? "Fermer" : "Annuler"}
              </button>
              {readOnly ? (
                baseline.actions?.canEdit ? (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-lg bg-[#FFC600] px-4 py-2 text-sm font-semibold"
                  >
                    Modifier le compte
                  </button>
                ) : null
              ) : (
                <button
                  type="submit"
                  disabled={busy || submitBlocked}
                  className="rounded-lg bg-[#FFC600] px-4 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  {busy
                    ? "Enregistrement…"
                    : passwordMode
                      ? "Réinitialiser"
                      : mode === "create"
                        ? "Créer le compte"
                        : "Enregistrer"}
                </button>
              )}
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}
