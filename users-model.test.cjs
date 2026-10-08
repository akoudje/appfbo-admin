const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  vm = require("node:vm");
const roles = {
  ORDER_PREPARER: ["PREORDER_READ", "PREPARATION_UPDATE"],
  INVOICER: ["PREORDER_READ", "INVOICE_CREATE"],
  SUPER_ADMIN: ["USER_ADMIN", "PREORDER_READ"],
};
const source = fs
  .readFileSync("./src/components/users/usersModel.js", "utf8")
  .replace(/import[^;]+;/, "")
  .replaceAll("export ", "");
const api = vm.runInNewContext(
  source +
    ";({emptyForm,userForm,userPatch,validateUserForm,effectivePermissions,setOverride,overrideValue})",
  {
    Permission: {
      USER_ADMIN: "USER_ADMIN",
      PREORDER_READ: "PREORDER_READ",
      PREPARATION_UPDATE: "PREPARATION_UPDATE",
    },
    getRolePermissions: (role) => roles[role] || [],
    TextEncoder,
  },
);
const plain = (value) => JSON.parse(JSON.stringify(value));
test("profile edits send only changed fields, with no password or status", () => {
  const baseline = api.userForm({
    id: "u",
    fullName: "Name",
    email: "name@example.test",
    role: "ORDER_PREPARER",
    countryCode: "CIV",
    actif: true,
  });
  const current = {
    ...baseline,
    fullName: "New Name",
    password: "must not be sent",
    actif: false,
  };
  assert.deepEqual(plain(api.userPatch(current, baseline, true)), {
    fullName: "New Name",
  });
});
test("non-super forms never send custom permission overrides", () => {
  const baseline = api.userForm({ role: "ORDER_PREPARER" });
  assert.deepEqual(
    plain(
      api.userPatch(
        { ...baseline, permissionAllow: ["USER_ADMIN"] },
        baseline,
        false,
      ),
    ),
    {},
  );
});
test("effective permissions respect denies and restore inherited rights", () => {
  let form = { ...api.emptyForm("CIV"), role: "ORDER_PREPARER" };
  form = api.setOverride(form, "PREORDER_READ", "deny");
  assert.equal(api.effectivePermissions(form).includes("PREORDER_READ"), false);
  form = api.setOverride(form, "PREORDER_READ", "inherit");
  assert.equal(api.effectivePermissions(form).includes("PREORDER_READ"), true);
  assert.equal(form.permissionDeny.length, 0);
});
test("create form requires identity, role, country and strong password", () => {
  const errors = api.validateUserForm(api.emptyForm(), "create");
  assert.ok(errors.email);
  assert.ok(errors.fullName);
  assert.ok(errors.role);
  assert.ok(errors.countryCode);
  assert.ok(errors.password);
});
test("password reset validates only password and honors bcrypt byte limit", () => {
  assert.deepEqual(
    plain(
      api.validateUserForm(
        { ...api.emptyForm(), password: "ValidPassword123!" },
        "password",
      ),
    ),
    {},
  );
  assert.ok(
    api.validateUserForm(
      { ...api.emptyForm(), password: "AbÉ123!".repeat(15) },
      "password",
    ).password,
  );
});
test("Super Admin global scope does not require a country", () => {
  const form = {
    ...api.emptyForm(),
    fullName: "Root",
    email: "root@example.test",
    role: "SUPER_ADMIN",
    password: "ValidPassword123!",
  };
  assert.deepEqual(plain(api.validateUserForm(form, "create")), {});
});
