// src/lib/format.js

export function formatFcfa(n) {
  const v = Number(n || 0);
  return `${v.toLocaleString()} FCFA`;
}

export function formatDateTime(v) {
  if (!v) return "—";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
