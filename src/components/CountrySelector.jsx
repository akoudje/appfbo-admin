// src/components/CountrySelector.jsx
// Ce composant affiche un sélecteur de pays dans la topbar pour permettre à l'utilisateur de changer le pays actif de l'application.

import { useState } from "react";
import { getCountryCode, setCountryCode } from "../services/api";
import useAdminAuth from "../hooks/useAdminAuth";

const COUNTRIES = [
  { code: "CIV", label: "CIV" },
  { code: "BFA", label: "BFA" },
  { code: "TGO", label: "TGO" },
  { code: "BEN", label: "BEN" }, // Bénin (remplace Mali)
  { code: "NER", label: "NER" }, // Niger
];

export default function CountrySelector({ className = "" }) {
  const { admin, role } = useAdminAuth();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const lockedCountryCode = admin?.countryCode || getCountryCode();
  const [country, setCountry] = useState(getCountryCode());
  const effectiveCountry = isSuperAdmin ? country : lockedCountryCode;

  function onChange(e) {
    const next = setCountryCode(e.target.value);
    setCountry(next);
    if (next === e.target.value) {
      window.location.reload();
    }
  }

  const visibleCountries = isSuperAdmin
    ? COUNTRIES
    : COUNTRIES.filter((c) => c.code === lockedCountryCode);

  return (
    <select
      value={effectiveCountry}
      onChange={onChange}
      disabled={!isSuperAdmin}
      className={
        "h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 " +
        className
      }
      aria-label={isSuperAdmin ? "Pays actif" : "Pays du compte"}
      title={isSuperAdmin ? "Pays actif" : "Pays du compte"}
    >
      {visibleCountries.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
