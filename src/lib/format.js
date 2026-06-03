// src/lib/format.js

export function formatFcfa(n) {
  const v = Number(n || 0);
  const display = v > 0 && v % 1 !== 0 ? Math.ceil(v) : Math.round(v);
  return `${display.toLocaleString("fr-FR")} FCFA`;
}

export function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
