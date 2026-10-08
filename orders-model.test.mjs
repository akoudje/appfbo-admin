import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import {
  orderAmounts,
  orderLabel,
  orderNextAction,
} from "./src/lib/orders/orderPresentation.js";
import {
  readOrderFilters,
  orderFilterParams,
  orderRequestParams,
  quickDateRange,
} from "./src/lib/orders/orderFilters.js";
import * as permissions from "./src/auth/permissions.js";
const require = createRequire(import.meta.url),
  babel = require("@babel/core");
function moduleFrom(file, dependencies) {
  const module = { exports: {} };
  const code = babel.transformSync(
    fs.readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      babelrc: false,
      configFile: false,
      plugins: ["@babel/plugin-transform-modules-commonjs"],
    },
  ).code;
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (id) => dependencies[id],
    console,
    Date,
  });
  return module.exports;
}
test("missing confirmed totals remain distinct from an indicative amount and zero is preserved", () => {
  assert.equal(orderAmounts({ totalFcfa: 1000 }).confirmed, null);
  assert.equal(
    orderAmounts({ totalFcfa: 1000, as400InvoiceTotalFcfa: 0 }).display,
    0,
  );
  assert.equal(
    orderAmounts({
      totalFcfa: 1000,
      as400InvoiceTotalFcfa: 800,
      activePayment: { amountExpectedFcfa: 824 },
    }).display,
    824,
  );
  assert.equal(
    orderAmounts({ as400InvoiceTotalFcfa: NaN, totalFcfa: 100 }).confirmed,
    null,
  );
});
test("pending status and business priorities have readable French labels", () => {
  assert.equal(orderLabel("PAYMENT_PENDING"), "Paiement en attente");
  assert.equal(orderLabel("URGENT"), "Urgente");
  assert.equal(orderLabel("BANK_TRANSFER"), "Virement bancaire");
});
test("URL filters survive a return to the list including false defaults, pagination and old priority links", () => {
  const selected = readOrderFilters(
    new URLSearchParams(
      "status=READY&q=Alla&assignedToMe=true&page=3&pageSize=50&sort=priority",
    ),
  );
  assert.equal(selected.sort, "billingPriority");
  assert.equal(selected.page, 3);
  assert.equal(selected.assignedToMe, true);
  assert.deepEqual(readOrderFilters(orderFilterParams(selected)), selected);
  const query = orderRequestParams(selected);
  assert.equal(query.includeDrafts, true);
  assert.equal(query.includeCancelled, true);
  assert.equal(query.priority, undefined);
});
test("7 and 30 day shortcuts are inclusive day counts across month and leap year boundaries", () => {
  assert.deepEqual(quickDateRange(30, new Date(2026, 2, 31)), {
    dateFrom: "2026-03-02",
    dateTo: "2026-03-31",
  });
  assert.deepEqual(quickDateRange(7, new Date(2024, 2, 2)), {
    dateFrom: "2024-02-25",
    dateTo: "2024-03-02",
  });
});
test("next actions follow available permissions and do not expose billing to a preparer", () => {
  assert.equal(
    orderNextAction({ status: "SUBMITTED" }, { billing: true }).tab,
    "billing",
  );
  assert.equal(
    orderNextAction(
      { status: "PAID", preparationLaunchedAt: "now" },
      { preparation: true, overview: false },
    ).tab,
    "preparation",
  );
  assert.equal(
    orderNextAction({ status: "READY" }, { payment: true, overview: false })
      .tab,
    "payment",
  );
  assert.equal(
    orderNextAction({ status: "CANCELLED" }, { preparation: true }).tab,
    "history",
  );
});
const { orderPolicy } = moduleFrom(
  "./src/hooks/orders/useOrderPermissions.js",
  {
    "../../auth/permissions": permissions,
    "../usePermission": { usePermission: () => false },
  },
);
test("a manual bank provider is never classified as cash", () => {
  const flags = orderPolicy(
    {
      status: "INVOICED",
      paymentStatus: "UNPAID",
      paymentProvider: "MANUAL",
      preorderPaymentMode: "BANK_TRANSFER",
    },
    "SUPER_ADMIN",
    { billing: true, payment: true },
  );
  assert.equal(flags.isCash, false);
  assert.equal(flags.canCashPay, false);
  assert.equal(flags.canProof, true);
});
test("preparation and exceptional regularization retain their role and payment guards", () => {
  const paid = {
    status: "PAID",
    paymentStatus: "PAID",
    preparationLaunchedAt: "now",
  };
  assert.equal(
    orderPolicy(paid, "INVOICER", { billing: true }).canPrepare,
    false,
  );
  assert.equal(
    orderPolicy(
      {
        ...paid,
        billingEscalationType: "AS400_CERTIFICATION_MISSING",
        as400CertificationStatus: "OPEN",
      },
      "ORDER_PREPARER",
      { preparation: true },
    ).canPrepare,
    false,
  );
  assert.equal(
    orderPolicy({ ...paid, paymentStatus: "UNPAID" }, "SUPER_ADMIN", {})
      .canFulfillNoNotification,
    false,
  );
});
function storeFixture() {
  let context = "actor:CIV";
  const pending = [];
  const { useOrdersStore } = moduleFrom("./src/store/useOrdersStore.js", {
    zustand: require("zustand"),
    "../services/ordersService": {
      ordersService: {
        getAll: (params) =>
          new Promise((resolve, reject) =>
            pending.push({ params, resolve, reject }),
          ),
      },
    },
    "../lib/orders/orderFilters": {
      DEFAULT_ORDER_FILTERS: readOrderFilters(new URLSearchParams()),
      orderRequestParams,
    },
    "../hooks/orders/useOrdersScope": { ordersScopeKey: () => context },
  });
  return {
    store: useOrdersStore,
    pending,
    setContext: (value) => (context = value),
  };
}
test("a delayed list response cannot replace newer filter results", async () => {
  const f = storeFixture();
  const first = f.store.getState().fetchOrders({ q: "old" }),
    second = f.store.getState().fetchOrders({ q: "new" });
  f.pending[1].resolve({ data: [{ id: "new" }], totalCount: 1, totalPages: 1 });
  await second;
  f.pending[0].resolve({ data: [{ id: "old" }], totalCount: 1 });
  await first;
  assert.equal(f.store.getState().orders[0].id, "new");
});
test("failed queries clear obsolete rows and cross-country replies cannot enter the store", async () => {
  const f = storeFixture();
  let task = f.store.getState().fetchOrders();
  f.pending[0].resolve({ data: [{ id: "old" }], totalCount: 1 });
  await task;
  task = f.store.getState().fetchOrders({ q: "changed" });
  f.pending[1].reject({ response: { data: { message: "Échec" } } });
  await task;
  assert.equal(f.store.getState().orders.length, 0);
  assert.equal(f.store.getState().error, "Échec");
  task = f.store.getState().fetchOrders();
  f.setContext("actor:BFA");
  f.pending[2].resolve({ data: [{ id: "CIV-secret" }] });
  await task;
  assert.equal(f.store.getState().orders.length, 0);
});
