export const CATEGORIES = [
  ["", "Toutes les catégories"],
  ["NON_CLASSE", "Non classé"],
  ["BUVABLE", "Buvable"],
  ["COMBO_PACKS", "Combo packs"],
  ["GESTION_DE_POIDS", "Gestion de poids"],
  ["NUTRITION", "Nutrition"],
  ["PRODUIT_DE_LA_RUCHE", "Produit de la ruche"],
  ["SOINS_DE_LA_PEAU", "Soins de la peau"],
  ["SOINS_PERSONNELS", "Soins personnels"],
];
export const GRADES = [
  ["CLIENT_PRIVILEGIE", "Client privilégié"],
  ["ANIMATEUR_ADJOINT", "Animateur adjoint"],
  ["ANIMATEUR", "Animateur"],
  ["MANAGER_ADJOINT", "Manager adjoint"],
  ["MANAGER", "Manager"],
];
export const categoryLabel = (value) =>
  CATEGORIES.find(([key]) => key === value)?.[1] || value;
export const emptyForm = () => ({
  sku: "",
  nom: "",
  cc: "0.000",
  poidsKg: "0.000",
  prixBaseFcfa: "",
  stockQty: "0",
  maxQtyPerOrder: "",
  imageUrl: "",
  category: "NON_CLASSE",
  actif: true,
  details: "",
  gradePrices: Object.fromEntries(GRADES.map(([key]) => [key, ""])),
});
export function formValues(product) {
  const base = emptyForm();
  return product
    ? {
        ...base,
        ...product,
        cc: String(product.cc ?? 0),
        poidsKg: String(product.poidsKg ?? 0),
        prixBaseFcfa: String(product.prixBaseFcfa ?? ""),
        stockQty: String(product.stockQty ?? 0),
        maxQtyPerOrder:
          product.maxQtyPerOrder == null ? "" : String(product.maxQtyPerOrder),
        gradePrices: Object.fromEntries(
          GRADES.map(([key]) => [
            key,
            String(product.gradePrices?.[key] ?? ""),
          ]),
        ),
      }
    : base;
}
export function validateProduct(form, editing = false) {
  const errors = {};
  for (const key of ["sku", "nom"])
    if (!String(form[key] || "").trim()) errors[key] = "Ce champ est requis.";
  for (const key of ["cc", "poidsKg"])
    if (
      !/^\d+(\.\d{1,3})?$/.test(String(form[key]).trim().replace(",", ".")) ||
      Number(String(form[key]).replace(",", ".")) > 9999999.999
    )
      errors[key] = "Nombre positif, trois décimales maximum.";
  for (const key of ["prixBaseFcfa", ...(!editing ? ["stockQty"] : [])])
    if (!/^\d+$/.test(String(form[key])) || Number(form[key]) > 2147483647)
      errors[key] = "Entier positif ou nul requis.";
  if (
    form.maxQtyPerOrder !== "" &&
    (!/^\d+$/.test(String(form.maxQtyPerOrder)) ||
      Number(form.maxQtyPerOrder) < 1 ||
      Number(form.maxQtyPerOrder) > 2147483647)
  )
    errors.maxQtyPerOrder = "Entier supérieur ou égal à 1 requis.";
  for (const [key] of GRADES) {
    const raw = form.gradePrices[key];
    if (
      raw !== "" &&
      (!/^\d+(\.\d{1,4})?$/.test(String(raw).replace(",", ".")) ||
        Number(String(raw).replace(",", ".")) > 99999999.9999)
    )
      errors[`grade.${key}`] = "Tarif positif, quatre décimales maximum.";
  }
  if (form.sku.length > 100) errors.sku = "100 caractères maximum.";
  if (form.nom.length > 250) errors.nom = "250 caractères maximum.";
  if (form.details?.length > 20000)
    errors.details = "20 000 caractères maximum.";
  return errors;
}
export function productPayload(form, initial, editing = false) {
  const result = {};
  for (const key of [
    "sku",
    "nom",
    "cc",
    "poidsKg",
    "prixBaseFcfa",
    "maxQtyPerOrder",
    "category",
    "details",
    "actif",
    "imageUrl",
  ]) {
    let value = form[key];
    if (key === "imageUrl" && value?.startsWith("blob:")) continue;
    if (["cc", "poidsKg"].includes(key))
      value = String(value).replace(",", ".");
    if (key === "prixBaseFcfa") value = Number(value);
    if (key === "maxQtyPerOrder") value = value === "" ? null : Number(value);
    if (["imageUrl", "details"].includes(key)) value = value?.trim() || null;
    if (["sku", "nom"].includes(key)) value = value.trim();
    if (!editing || String(value ?? "") !== String(initial?.[key] ?? ""))
      result[key] = value;
  }
  if (!editing) result.stockQty = Number(form.stockQty);
  result.gradePrices = {};
  for (const [key] of GRADES) {
    const raw = form.gradePrices[key];
    if (!editing || String(raw) !== String(initial?.gradePrices?.[key] ?? ""))
      result.gradePrices[key] =
        raw === "" ? null : Number(String(raw).replace(",", "."));
  }
  return result;
}
export function readFilters(search) {
  const p = new URLSearchParams(search);
  return {
    q: p.get("q") || "",
    actif: p.get("actif") || "",
    category: p.get("category") || "",
    stock: p.get("stock") || "",
    incomplete: p.get("incomplete") || "",
    sort: p.get("sort") || "nom",
    dir: p.get("dir") || "asc",
    page: Math.max(1, Number(p.get("page")) || 1),
    pageSize: [20, 30, 50, 100].includes(Number(p.get("pageSize")))
      ? Number(p.get("pageSize"))
      : 30,
  };
}
export function filterSearch(filters) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (
      value !== "" &&
      !(key === "page" && value === 1) &&
      !(key === "pageSize" && value === 30) &&
      !(key === "sort" && value === "nom") &&
      !(key === "dir" && value === "asc")
    )
      p.set(key, value);
  return p.toString();
}
