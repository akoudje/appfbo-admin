import test from "node:test";
import assert from "node:assert/strict";
import {
  formValues,
  productPayload,
  validateProduct,
  readFilters,
  filterSearch,
} from "./src/lib/products/productModel.js";
import { parseProductCsv } from "./src/lib/products/productCsv.js";
const fixture = () =>
  formValues({
    sku: "SKU",
    nom: "Produit",
    cc: "0.123",
    poidsKg: "0.200",
    stockQty: 7,
    prixBaseFcfa: 100,
    maxQtyPerOrder: 2,
    actif: true,
    gradePrices: { MANAGER: 80 },
  });
test("edit payload contains only changed fields and never stock", () => {
  const initial = fixture(),
    form = { ...initial, nom: "Nouveau" };
  assert.deepEqual(productPayload(form, initial, true), {
    nom: "Nouveau",
    gradePrices: {},
  });
});
test("blank grade and quantity limit are explicit removals", () => {
  const initial = fixture(),
    form = {
      ...initial,
      maxQtyPerOrder: "",
      gradePrices: { ...initial.gradePrices, MANAGER: "" },
    };
  assert.deepEqual(productPayload(form, initial, true), {
    maxQtyPerOrder: null,
    gradePrices: { MANAGER: null },
  });
});
test("initial stock is included only on creation and zero prices remain zero", () => {
  const form = { ...fixture(), prixBaseFcfa: "0" };
  const payload = productPayload(form, null, false);
  assert.equal(payload.stockQty, 7);
  assert.equal(payload.prixBaseFcfa, 0);
});
test("staged image previews are not sent as remote URLs", () => {
  const form = { ...fixture(), imageUrl: "blob:local-preview" };
  assert.equal("imageUrl" in productPayload(form, fixture(), true), false);
});
test("integer, decimal and text validation rejects malformed values", () => {
  for (const [key, value] of [
    ["prixBaseFcfa", "1.5"],
    ["cc", "-1"],
    ["poidsKg", "0.1234"],
    ["stockQty", "1.5"],
    ["maxQtyPerOrder", "0"],
    ["sku", ""],
  ]) {
    const errors = validateProduct({ ...fixture(), [key]: value });
    assert.ok(errors[key], key);
  }
  assert.equal(Object.keys(validateProduct(fixture())).length, 0);
});
test("URL filters preserve view, sorting and pagination across navigation", () => {
  const filters = {
    ...readFilters(""),
    q: "Aloe vera",
    stock: "low",
    page: 3,
    pageSize: 50,
    sort: "stockQty",
    dir: "desc",
  };
  assert.deepEqual(readFilters(filterSearch(filters)), filters);
});
test("CSV keeps delimiters and newlines inside quoted descriptions", () => {
  const rows = parseProductCsv(
    'sku;nom;details\nSKU;"Produit; spécial";"Ligne 1\nLigne 2, ""citation"""',
  );
  assert.deepEqual(rows, [
    {
      sku: "SKU",
      nom: "Produit; spécial",
      details: 'Ligne 1\nLigne 2, "citation"',
    },
  ]);
});
test("CSV preserves absent columns and normalizes aliases, decimals and booleans", () => {
  const rows = parseProductCsv(
    '\uFEFFsku;prix;poids;actif\nSKU;100;"0,300";non',
  );
  assert.deepEqual(rows, [
    { sku: "SKU", prixBaseFcfa: "100", poidsKg: "0.300", actif: false },
  ]);
  assert.equal("stockQty" in rows[0], false);
});
test("CSV rejects duplicate headings, unclosed quotes and wrong column counts", () => {
  for (const csv of [
    "sku;sku\nA;B",
    'sku;nom\nA;"non fermé',
    "sku;nom\nA;B;C",
    "nom\nA",
  ])
    assert.throws(() => parseProductCsv(csv));
});
test("CSV rejects unknown booleans instead of activating a product", () => {
  assert.throws(() => parseProductCsv("sku;actif\nSKU;incorrect"));
});
