// CC de l'achat de parrainage et seuils de la promotion du filleul au grade
// Animateur adjoint (règle backend sponsorship-promotion.service) : au moins
// 2 CC, ou un pack 634 / 635, dès le lendemain de la validation.
export const PROMOTION_MIN_CC = 2;
export const PROMOTION_PACK_SKUS = ["634", "635"];

export function formatCc(value) {
  return `${Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 3 })} CC`;
}

function round(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

// Panier composé dans l'admin : [{ productId, qty }] + catalogue (cc unitaires).
export function cartCcSummary(cart, byId) {
  let totalCc = 0;
  let hasPack = false;
  for (const line of cart || []) {
    const product = byId.get(line.productId);
    totalCc += Number(product?.cc || 0) * Number(line.qty || 0);
    if (PROMOTION_PACK_SKUS.includes(String(product?.sku || "").trim())) hasPack = true;
  }
  totalCc = round(totalCc);
  return { totalCc, hasPack, known: true, qualifies: hasPack || totalCc >= PROMOTION_MIN_CC };
}

// Panier enregistré sur le parrainage (lignes avec lineTotalCc). Les paniers
// saisis avant l'affichage des CC n'en portent pas : known = false.
export function savedCartCcSummary(items) {
  const lines = Array.isArray(items) ? items : [];
  const known = lines.length > 0 && lines.every((line) => line.lineTotalCc != null);
  const totalCc = round(lines.reduce((sum, line) => sum + Number(line.lineTotalCc || 0), 0));
  const hasPack = lines.some((line) => PROMOTION_PACK_SKUS.includes(String(line.sku || "").trim()));
  return { totalCc, hasPack, known, qualifies: hasPack || (known && totalCc >= PROMOTION_MIN_CC) };
}

export function promotionHint({ totalCc, hasPack, known, qualifies }) {
  if (qualifies) {
    return `${hasPack ? "Pack 634/635 inclus" : `${formatCc(totalCc)} atteints`} : le filleul sera Animateur adjoint dès le lendemain de la validation.`;
  }
  if (!known) return "CC non disponibles pour ce panier (saisi avant leur affichage).";
  return `Encore ${formatCc(Math.max(0, PROMOTION_MIN_CC - totalCc))} (ou un pack 634/635) pour que le filleul devienne Animateur adjoint.`;
}
