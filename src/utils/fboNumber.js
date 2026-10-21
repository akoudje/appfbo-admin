// Formatage et pré-remplissage du numéro FBO (12 chiffres groupés
// "XXX-XXX-XXX-XXX") partagés par les écrans admin qui en saisissent un.

import { getCountryCode } from "../services/api";

// Indicatif numérique utilisé comme préfixe des numéros FBO (ex. 225 pour
// la Côte d'Ivoire) — correspond à l'indicatif téléphonique international
// du pays, cohérent avec le reste du système.
const FBO_NUMBER_PREFIX_BY_COUNTRY = {
  CIV: "225",
  BFA: "226",
  NER: "227",
  TGO: "228",
  BEN: "229",
};

export function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatFboNumber(input) {
  const d = digitsOnly(input).slice(0, 12);
  const p1 = d.slice(0, 3);
  const p2 = d.slice(3, 6);
  const p3 = d.slice(6, 9);
  const p4 = d.slice(9, 12);
  let out = p1;
  if (p2) out += `-${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

export function isValidFboNumber(formatted) {
  return digitsOnly(formatted).length === 12;
}

// Tous les numéros FBO de ce système commencent par "{indicatif pays}-000-"
// (ex. 225-000-xxx-xxx) : pré-rempli par défaut pour les champs où
// l'utilisateur saisit ou assigne un numéro, il n'a plus qu'à ajouter les
// 6 chiffres restants.
export function defaultFboNumberPrefix() {
  const prefix = FBO_NUMBER_PREFIX_BY_COUNTRY[getCountryCode()] || "";
  return prefix ? `${prefix}-000-` : "";
}
