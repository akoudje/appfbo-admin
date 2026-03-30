import { useEffect, useMemo, useState } from "react";
import AdminUsersPage from "./AdminUsersPage";
import AdminGradeDiscountsPage from "./AdminGradeDiscountsPage";
import { settingsService } from "../services/settingsService";

const TABS = [
  { key: "countries", label: "Pays" },
  { key: "commercial", label: "Règles commerciales" },
  { key: "users", label: "Utilisateurs" },
  { key: "discounts", label: "Remises" },
  { key: "theme", label: "Thème" },
];

const DEFAULT_SETTINGS = {
  countries: {
    supportPhone: "",
    pickupAddress: "",
    enableWave: true,
    enableOrangeMoney: true,
    enableCash: true,
    enableDelivery: true,
    enablePickup: true,
  },
  commercial: {
    minCartTotalFcfa: 100,
    currencyLabel: "FCFA",
    pricingDisclaimer:
      "Les prix affichés sont indicatifs. Le montant final est confirmé par le facturier à partir de l'AS400.",
  },
  theme: {
    primaryColor: "#FFC600",
    secondaryColor: "#74AA50",
    darkColor: "#000000",
    logoPath: "/logo-forever.png",
    sliderEnabled: true,
    sidePanelsEnabled: true,
  },
};

function Card({ title, description, actions, children }) {
  return (
    <section className="border border-[#e7dec8] bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#efe7d7] px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-[#000000]">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-[#6f6a60]">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block space-y-1.5">
      <div className="text-sm font-medium text-[#5D4B3C]">{label}</div>
      {children}
      {hint ? <div className="text-xs text-[#8d7a5c]">{hint}</div> : null}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full border border-[#e7dec8] px-3 py-2.5 text-sm outline-none focus:border-[#FFC600] focus:ring-4 focus:ring-[#FFC600]/20"
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full border border-[#e7dec8] px-3 py-2.5 text-sm outline-none focus:border-[#FFC600] focus:ring-4 focus:ring-[#FFC600]/20"
    />
  );
}

function ToggleCard({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 border border-[#e7dec8] bg-white px-4 py-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div>
        <div className="text-sm font-medium text-[#000000]">{label}</div>
        <div className="text-xs text-[#8d7a5c]">{hint}</div>
      </div>
    </label>
  );
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("countries");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const data = await settingsService.getCountrySettings();
        setSettings((prev) => ({
          ...prev,
          countries: {
            ...prev.countries,
            supportPhone: data.supportPhone || "",
            pickupAddress: data.pickupAddress || "",
            enableWave: Boolean(data.enableWave),
            enableOrangeMoney: Boolean(data.enableOrangeMoney),
            enableCash: Boolean(data.enableCash),
            enableDelivery: Boolean(data.enableDelivery),
            enablePickup: Boolean(data.enablePickup),
          },
          commercial: {
            ...prev.commercial,
            minCartTotalFcfa: data.minCartFcfa ?? prev.commercial.minCartTotalFcfa,
            currencyLabel: data.currencyLabel || prev.commercial.currencyLabel,
            pricingDisclaimer:
              data.pricingDisclaimer || prev.commercial.pricingDisclaimer,
          },
          theme: {
            ...prev.theme,
            primaryColor: data.themePrimaryColor || prev.theme.primaryColor,
            secondaryColor: data.themeSecondaryColor || prev.theme.secondaryColor,
            darkColor: data.themeDarkColor || prev.theme.darkColor,
            logoPath: data.themeLogoPath || prev.theme.logoPath,
            sliderEnabled:
              data.themeSliderEnabled ?? prev.theme.sliderEnabled,
            sidePanelsEnabled:
              data.themeSidePanelsEnabled ?? prev.theme.sidePanelsEnabled,
          },
        }));
      } catch (e) {
        setError(e?.response?.data?.message || "Impossible de charger les paramètres.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    try {
      setSaving(true);
      setError("");
      setInfo("");
      await settingsService.updateCountrySettings({
        minCartFcfa: settings.commercial.minCartTotalFcfa,
        supportPhone: settings.countries.supportPhone,
        pickupAddress: settings.countries.pickupAddress,
        enableWave: settings.countries.enableWave,
        enableOrangeMoney: settings.countries.enableOrangeMoney,
        enableCash: settings.countries.enableCash,
        enableDelivery: settings.countries.enableDelivery,
        enablePickup: settings.countries.enablePickup,
        currencyLabel: settings.commercial.currencyLabel,
        pricingDisclaimer: settings.commercial.pricingDisclaimer,
        themePrimaryColor: settings.theme.primaryColor,
        themeSecondaryColor: settings.theme.secondaryColor,
        themeDarkColor: settings.theme.darkColor,
        themeLogoPath: settings.theme.logoPath,
        themeSliderEnabled: settings.theme.sliderEnabled,
        themeSidePanelsEnabled: settings.theme.sidePanelsEnabled,
      });
      setInfo("Paramètres enregistrés.");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d’enregistrer les paramètres.");
    } finally {
      setSaving(false);
    }
  }

  const commercialSummary = useMemo(
    () => `${settings.commercial.minCartTotalFcfa} ${settings.commercial.currencyLabel}`,
    [settings.commercial],
  );

  return (
    <div className="space-y-6">
      <Card
        title="Paramètres"
        description="Configure ici les éléments variables selon les pays, les règles commerciales, les accès administrateurs et l’habillage général de l’application."
        actions={
          <div className="flex items-center gap-3">
            {info ? (
              <span className="border border-[#bad6a7] bg-[#eef7e8] px-3 py-1 text-xs font-medium text-[#587f34]">
                {info}
              </span>
            ) : null}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-[#FFC600] px-4 py-2 text-sm font-medium text-black hover:bg-[#e6b200] disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          {error ? (
            <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`border px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-[#e4d395] bg-[#fff7df] text-[#6c5715]"
                    : "border-[#e7dec8] bg-white text-[#5D4B3C] hover:bg-[#fcfbf7]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "countries" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Field label="Téléphone support">
                <TextInput
                  value={settings.countries.supportPhone}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      countries: { ...prev.countries, supportPhone: e.target.value },
                    }))
                  }
                  placeholder="+225 07 00 00 00 00"
                />
              </Field>

              <div className="xl:col-span-2">
                <Field label="Adresse de retrait">
                  <TextArea
                    rows={3}
                    value={settings.countries.pickupAddress}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        countries: { ...prev.countries, pickupAddress: e.target.value },
                      }))
                    }
                    placeholder="Adresse ou point de retrait par défaut"
                  />
                </Field>
              </div>

              <ToggleCard
                label="Wave disponible"
                hint="Active ou masque ce mode de paiement."
                checked={settings.countries.enableWave}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    countries: { ...prev.countries, enableWave: checked },
                  }))
                }
              />
              <ToggleCard
                label="Orange Money disponible"
                hint="Active ou masque ce mode de paiement."
                checked={settings.countries.enableOrangeMoney}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    countries: { ...prev.countries, enableOrangeMoney: checked },
                  }))
                }
              />
              <ToggleCard
                label="Paiement espèces disponible"
                hint="Utile pour les pays où la caisse physique est active."
                checked={settings.countries.enableCash}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    countries: { ...prev.countries, enableCash: checked },
                  }))
                }
              />
              <ToggleCard
                label="Livraison disponible"
                hint="Active le mode livraison côté frontend user."
                checked={settings.countries.enableDelivery}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    countries: { ...prev.countries, enableDelivery: checked },
                  }))
                }
              />
              <ToggleCard
                label="Retrait disponible"
                hint="Active le retrait site / point de retrait."
                checked={settings.countries.enablePickup}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    countries: { ...prev.countries, enablePickup: checked },
                  }))
                }
              />
            </div>
          ) : null}

          {activeTab === "commercial" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Field label="Panier minimum d’achat">
                <TextInput
                  type="number"
                  min="0"
                  value={settings.commercial.minCartTotalFcfa}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      commercial: {
                        ...prev.commercial,
                        minCartTotalFcfa: Number(e.target.value || 0),
                      },
                    }))
                  }
                />
              </Field>

              <Field label="Devise affichée">
                <TextInput
                  value={settings.commercial.currencyLabel}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      commercial: { ...prev.commercial, currencyLabel: e.target.value },
                    }))
                  }
                />
              </Field>

              <div className="xl:col-span-2">
                <Field label="Disclaimer prix / AS400">
                  <TextArea
                    rows={4}
                    value={settings.commercial.pricingDisclaimer}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        commercial: {
                          ...prev.commercial,
                          pricingDisclaimer: e.target.value,
                        },
                      }))
                    }
                  />
                </Field>
              </div>

              <div className="border border-[#e7dec8] bg-[#fcfbf7] p-5">
                <div className="text-base font-semibold text-[#000000]">Résumé actuel</div>
                <p className="mt-2 text-sm text-[#6f6a60]">
                  Panier minimum configuré: <span className="font-semibold text-[#000000]">{commercialSummary}</span>
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "users" ? (
            <AdminUsersPage />
          ) : null}

          {activeTab === "discounts" ? (
            <AdminGradeDiscountsPage />
          ) : null}

          {activeTab === "theme" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Field label="Couleur principale">
                <TextInput
                  value={settings.theme.primaryColor}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, primaryColor: e.target.value },
                    }))
                  }
                />
              </Field>

              <Field label="Couleur secondaire">
                <TextInput
                  value={settings.theme.secondaryColor}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, secondaryColor: e.target.value },
                    }))
                  }
                />
              </Field>

              <Field label="Couleur sombre">
                <TextInput
                  value={settings.theme.darkColor}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, darkColor: e.target.value },
                    }))
                  }
                />
              </Field>

              <Field label="Logo principal">
                <TextInput
                  value={settings.theme.logoPath}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      theme: { ...prev.theme, logoPath: e.target.value },
                    }))
                  }
                />
              </Field>

              <ToggleCard
                label="Slider actif"
                hint="Affiche ou masque le slider marketing du catalogue frontend."
                checked={settings.theme.sliderEnabled}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, sliderEnabled: checked },
                  }))
                }
              />

              <ToggleCard
                label="Panneaux latéraux actifs"
                hint="Affiche ou masque les panneaux desktop du catalogue frontend."
                checked={settings.theme.sidePanelsEnabled}
                onChange={(checked) =>
                  setSettings((prev) => ({
                    ...prev,
                    theme: { ...prev.theme, sidePanelsEnabled: checked },
                  }))
                }
              />

            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
