const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const code = fs
  .readFileSync("./src/utils/settingsModel.js", "utf8")
  .replace(/import[^;]+;/, 'const foreverLogoUrl="/logo.png";')
  .replaceAll("export ", "");
const api = vm.runInNewContext(
  code +
    ";({DEFAULT_SETTINGS,settingsFromApi,settingsToApi,settingsPatch,resetSettingsSection})",
  { structuredClone },
);
const plain = (value) => JSON.parse(JSON.stringify(value));
test("loading another country never inherits previously entered fields or templates", () => {
  const first = api.settingsFromApi({
    supportPhone: "first",
    notificationTemplates: { sms: { INVOICE: "custom" } },
  });
  first.countries.bankName = "old bank";
  const next = api.settingsFromApi({ supportPhone: "second" });
  assert.equal(next.countries.bankName, "");
  assert.equal(
    next.notifications.templates.sms.INVOICE,
    api.DEFAULT_SETTINGS.notifications.templates.sms.INVOICE,
  );
});
test("an explicitly empty string stays empty rather than reusing a default", () => {
  const next = api.settingsFromApi({
    pricingDisclaimer: "",
    themePrimaryColor: "",
  });
  assert.equal(next.commercial.pricingDisclaimer, "");
  assert.equal(next.theme.primaryColor, "");
});
test("one modified field creates a one-field patch", () => {
  const baseline = api.settingsFromApi({ supportPhone: "old" }),
    next = structuredClone(baseline);
  next.countries.supportPhone = "new";
  assert.deepEqual(plain(api.settingsPatch(next, baseline)), {
    supportPhone: "new",
  });
});
test("restoring general defaults preserves payment configuration", () => {
  const before = api.settingsFromApi({
    supportPhone: "old",
    bankName: "Bank",
    enableWave: false,
  });
  const after = api.resetSettingsSection(before, "countries");
  assert.equal(after.countries.bankName, "Bank");
  assert.equal(after.countries.enableWave, false);
  assert.equal(after.countries.supportPhone, "");
});
test("restoring payment defaults preserves contact details and commercial rules", () => {
  const before = api.settingsFromApi({
    supportPhone: "old",
    minCartFcfa: 5000,
    enableWave: false,
  });
  const after = api.resetSettingsSection(before, "payments");
  assert.equal(after.countries.supportPhone, "old");
  assert.equal(after.commercial.minCartTotalFcfa, 5000);
  assert.equal(after.countries.enableWave, true);
});
test("restoring a section cannot mutate the stored baseline", () => {
  const before = api.settingsFromApi({ supportPhone: "old" });
  api.resetSettingsSection(before, "countries");
  assert.equal(before.countries.supportPhone, "old");
});
