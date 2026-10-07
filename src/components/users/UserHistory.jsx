import { useEffect, useState } from "react";
import { usersService } from "../../services/usersService";
import { formatDate, roleLabel, permissionLabel } from "./usersModel";
const ACTIONS = {
  ADMIN_USER_CREATED: "Compte créé",
  ADMIN_USER_UPDATED: "Compte modifié",
  ADMIN_USER_UPDATED_PASSWORD: "Mot de passe réinitialisé",
  ADMIN_USER_ACTIVATED: "Compte activé",
  ADMIN_USER_DEACTIVATED: "Compte désactivé",
  ADMIN_USER_SESSIONS_REVOKED: "Sessions déconnectées",
  LOGIN_SUCCESS: "Connexion réussie",
  LOGIN_FAILED: "Connexion refusée",
};
const FIELDS = {
  email: "Email",
  fullName: "Nom complet",
  role: "Rôle",
  actif: "Statut",
  countryId: "Pays",
  permissionAllow: "Droits ajoutés",
  permissionDeny: "Droits refusés",
};
function display(key, value, countries) {
  if (value === null || value === undefined || value === "")
    return "Non renseigné";
  if (key === "role") return roleLabel(value);
  if (key === "countryId")
    return countries.find((item) => item.id === value)?.name || "Pays attribué";
  if (typeof value === "boolean") return value ? "Actif" : "Inactif";
  if (Array.isArray(value))
    return value.map(permissionLabel).join(", ") || "Aucun";
  return String(value);
}
export default function UserHistory({ userId, updatedAt, countries }) {
  const [result, setResult] = useState({ loading: true, rows: [], error: "" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    usersService
      .getHistory(userId)
      .then((data) => {
        if (active)
          setResult({ loading: false, rows: data.data || [], error: "" });
      })
      .catch(() => {
        if (active)
          setResult({
            loading: false,
            rows: [],
            error: "Impossible de charger l’historique.",
          });
      });
    return () => {
      active = false;
    };
  }, [userId, updatedAt, retry]);
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-gray-900">Activité et historique</h3>
      <p className="text-xs text-gray-500">
        Les 30 derniers événements de ce compte. Les mots de passe ne figurent
        jamais dans l’historique.
      </p>
      {result.loading ? (
        <p role="status" className="text-sm text-gray-500">
          Chargement…
        </p>
      ) : result.error ? (
        <p role="alert" className="text-sm text-red-700">
          {result.error}{" "}
          <button
            type="button"
            onClick={() => {
              setResult({ loading: true, rows: [], error: "" });
              setRetry((value) => value + 1);
            }}
            className="underline"
          >
            Réessayer
          </button>
        </p>
      ) : !result.rows.length ? (
        <p className="text-sm text-gray-500">Aucun événement enregistré.</p>
      ) : (
        result.rows.map((row) => (
          <details
            key={row.id}
            className="rounded-lg border border-gray-200 bg-white p-3"
          >
            <summary className="cursor-pointer text-sm">
              <span className="font-medium">
                {ACTIONS[row.action] || "Événement du compte"}
              </span>
              <span className="ml-2 text-xs text-gray-500">
                {formatDate(row.createdAt)} · {row.actorLabel}
              </span>
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-600">
              {row.note ? <p>{row.note}</p> : null}
              {row.sessionsRevoked ? (
                <p>Les sessions précédentes ont été révoquées.</p>
              ) : null}
              {Object.entries(row.changes || {}).map(([key, change]) => (
                <p key={key}>
                  <strong>{FIELDS[key] || "Information du compte"} :</strong>{" "}
                  {display(key, change.before, countries)} →{" "}
                  {display(key, change.after, countries)}
                </p>
              ))}
            </div>
          </details>
        ))
      )}
    </section>
  );
}
