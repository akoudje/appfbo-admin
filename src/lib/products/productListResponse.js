import { productPage } from "./productModel.js";
const fail = () => {
  throw new Error(
    "Le catalogue n’a pas pu être chargé. Réessayez ou contactez l’administrateur.",
  );
};
function rows(value) {
  if (
    !Array.isArray(value) ||
    value.some(
      (row) =>
        !row ||
        typeof row !== "object" ||
        typeof row.id !== "string" ||
        typeof row.nom !== "string" ||
        ["sku", "category", "imageUrl"].some(
          (key) => row[key] != null && typeof row[key] !== "string",
        ),
    )
  )
    fail();
  return value;
}
function count(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= 0 ? n : null;
}
function legacyRows(items, filters) {
  const term = String(filters.q || "")
    .trim()
    .toLowerCase();
  const filtered = items.filter((row) => {
    const stock = Number(row.stockQty ?? 0);
    if (
      term &&
      ![
        row.nom,
        row.sku,
        ...(Array.isArray(row.packagings)
          ? row.packagings.map((p) => p.barcode)
          : []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    )
      return false;
    if (filters.category && row.category !== filters.category) return false;
    if (filters.actif === "true" && !row.actif) return false;
    if (filters.actif === "false" && row.actif) return false;
    if (filters.stock === "in" && stock <= 0) return false;
    if (filters.stock === "out" && stock > 0) return false;
    if (filters.stock === "low" && !(stock > 0 && stock <= 5)) return false;
    return (
      filters.incomplete !== "true" ||
      !row.imageUrl ||
      row.category === "NON_CLASSE"
    );
  });
  const sort = filters.sort || "nom",
    dir = filters.dir === "desc" ? -1 : 1;
  filtered.sort((a, b) => {
    let result;
    if (["prixBaseFcfa", "stockQty"].includes(sort))
      result = Number(a[sort] ?? 0) - Number(b[sort] ?? 0);
    else if (sort === "updatedAt")
      result = (Date.parse(a.updatedAt) || 0) - (Date.parse(b.updatedAt) || 0);
    else
      result = String(a[sort] ?? "").localeCompare(String(b[sort] ?? ""), "fr");
    return result * dir || a.id.localeCompare(b.id);
  });
  return filtered;
}
export function normalizeProductsResponse(payload, filters) {
  const pageSize = [20, 30, 50, 100].includes(filters.pageSize)
    ? filters.pageSize
    : 30;
  if (Array.isArray(payload)) {
    const filtered = legacyRows(rows(payload), filters),
      totalCount = filtered.length,
      page = Math.min(
        productPage(filters.page),
        Math.max(1, Math.ceil(totalCount / pageSize)),
      );
    const actifs = filtered.filter((row) => row.actif).length;
    return {
      items: filtered.slice((page - 1) * pageSize, page * pageSize),
      totalCount,
      page,
      pageSize,
      legacy: true,
      limited: payload.length >= 500,
      stats: {
        actifs,
        inactifs: totalCount - actifs,
        rupture: filtered.filter((row) => Number(row.stockQty ?? 0) <= 0)
          .length,
        faible: filtered.filter(
          (row) => Number(row.stockQty ?? 0) > 0 && Number(row.stockQty) <= 5,
        ).length,
      },
    };
  }
  if (!payload || typeof payload !== "object") fail();
  const items = rows(payload.items),
    totalCount = count(payload.totalCount);
  if (totalCount === null || totalCount < items.length) fail();
  const page = Math.min(
    productPage(payload.page, productPage(filters.page)),
    Math.max(1, Math.ceil(totalCount / pageSize)),
  );
  return {
    items,
    totalCount,
    page,
    pageSize,
    legacy: false,
    limited: false,
    stats: Object.fromEntries(
      ["actifs", "inactifs", "rupture", "faible", "incomplets"].map((key) => [
        key,
        count(payload.stats?.[key]),
      ]),
    ),
  };
}
