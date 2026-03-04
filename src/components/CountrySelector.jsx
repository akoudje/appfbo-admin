// src/components/CountrySelector.jsx
// Ce composant affiche un sélecteur de pays dans la topbar pour permettre à l'utilisateur de changer le pays actif de l'application.

import { useEffect, useState } from "react";
import { getCountryCode, setCountryCode } from "../services/api";

const COUNTRIES = [
  { code: "CI", label: "🇨🇮 CI" },
  { code: "BF", label: "🇧🇫 BF" },
  { code: "TG", label: "🇹🇬 TG" },
  { code: "BJ", label: "🇧🇯 BJ" }, // Bénin (remplace Mali)
  { code: "NE", label: "🇳🇪 NE" }, // Niger (code NE dans ton seed actuel)
];

export default function CountrySelector({ className = "" }) {
  const [country, setCountry] = useState(getCountryCode());

  useEffect(() => {
    setCountry(getCountryCode());
  }, []);

  function onChange(e) {
    const next = setCountryCode(e.target.value);
    setCountry(next);
    window.location.reload();
  }

  return (
    <select
      value={country}
      onChange={onChange}
      className={
        "h-9 rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200 " +
        className
      }
      aria-label="Pays actif"
      title="Pays actif"
    >
      {COUNTRIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.label}
        </option>
      ))}
    </select>
  );
}