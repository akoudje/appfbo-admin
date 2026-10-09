import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProductsResponse } from "./src/lib/products/productListResponse.js";
import { readFilters, filterSearch } from "./src/lib/products/productModel.js";
const items = Array.from({ length: 45 }, (_, i) => ({
  id: String(i),
  nom: "Produit " + String(i).padStart(2, "0"),
  sku: "SKU-" + i,
  category: "NUTRITION",
  prixBaseFcfa: i,
  stockQty: i % 3,
  actif: i % 2 === 0,
}));
test("a legacy array cannot write undefined into pagination or lose stats", () => {
  const result = normalizeProductsResponse(
    items,
    readFilters("page=undefined"),
  );
  assert.equal(result.page, 1);
  assert.equal(result.items.length, 30);
  assert.equal(result.stats.actifs, 23);
  assert.equal(result.stats.rupture, 15);
  assert.equal(result.totalCount, 45);
  assert.equal(filterSearch({ ...readFilters(""), page: result.page }), "");
});
test("legacy pagination and sorting apply to the received filtered products", () => {
  const result = normalizeProductsResponse(
    items,
    readFilters("page=2&pageSize=20&sort=stockQty&dir=desc"),
  );
  assert.equal(result.items.length, 20);
  assert.equal(result.page, 2);
  assert.equal(result.totalCount, 45);
  assert.equal(result.items[0].stockQty, 1);
});
test("legacy stock and status filters are not silently ignored", () => {
  const result = normalizeProductsResponse(
    items,
    readFilters("stock=low&actif=true"),
  );
  assert.equal(result.totalCount, 15);
  assert.ok(
    result.items.every(
      (row) => row.actif && row.stockQty > 0 && row.stockQty <= 5,
    ),
  );
});
test("server pagination remains authoritative with global counters", () => {
  const result = normalizeProductsResponse(
    {
      items: items.slice(0, 20),
      page: 3,
      totalCount: 100,
      stats: { actifs: 80, rupture: 7, faible: 9 },
    },
    readFilters("page=3&pageSize=20"),
  );
  assert.equal(result.page, 3);
  assert.equal(result.stats.actifs, 80);
  assert.equal(result.totalCount, 100);
  assert.equal(result.legacy, false);
});
test("missing page or counters never create a blank page", () => {
  const result = normalizeProductsResponse(
    { items: items.slice(0, 20), totalCount: 100, stats: null },
    readFilters("page=2&pageSize=20"),
  );
  assert.equal(result.page, 2);
  assert.equal(result.stats.actifs, null);
  assert.equal(result.items.length, 20);
});
test("malformed responses produce a controlled loading error", () => {
  for (const payload of [
    null,
    undefined,
    {},
    { items: null, totalCount: 1 },
    { items: [null], totalCount: 1 },
    { items, totalCount: "bad" },
  ])
    assert.throws(
      () => normalizeProductsResponse(payload, readFilters("")),
      /catalogue/,
    );
});
test("pages beyond the received array clamp and empty arrays remain valid", () => {
  assert.equal(
    normalizeProductsResponse(items, readFilters("page=20")).page,
    2,
  );
  const empty = normalizeProductsResponse([], readFilters("page=20"));
  assert.equal(empty.page, 1);
  assert.equal(empty.totalCount, 0);
  assert.equal(empty.stats.actifs, 0);
});
