import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "appfbo-admin-general-settings-draft";

const TABS = [
  { key: "countries", label: "Pays" },
  { key: "commercial", label: "Règles commerciales" },
  { key: "users", label: "Utilisateurs" },
  { key: "theme", label: "Thème" },
];

const DEFAULT_SETTINGS = {
  countries: {
    defaultCountryCode: "CIV",
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

function loadInitialState() {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function Card({ title, description, actions, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>
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
      <div className="text-sm font-medium text-gray-700">{label}</div>
      {children}
      {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function TextArea(props) {
  return (
    <textarea
      {...props}
      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function ToggleCard({ label, hint, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-500">{hint}</div>
      </div>
    </label>
  );
}

function QuickLinkCard({ title, body, to, actionLabel }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="text-base font-semibold text-gray-900">{title}</div>
      <p className="mt-2 text-sm text-gray-500">{body}</p>
      <Link
        to={to}
        className="mt-4 inline-flex rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-900"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState("countries");
  const [settings, setSettings] = useState(loadInitialState);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    const timer = window.setTimeout(() => setSaved(false), 1800);
    return () => window.clearTimeout(timer);
  }, [settings]);

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
            {saved ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Brouillon sauvegardé
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setSettings(DEFAULT_SETTINGS)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Réinitialiser
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-4">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "countries" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Field label="Pays actif par défaut">
                <select
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  value={settings.countries.defaultCountryCode}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      countries: { ...prev.countries, defaultCountryCode: e.target.value },
                    }))
                  }
                >
                  <option value="CIV">Côte d’Ivoire</option>
                  <option value="BFA">Burkina Faso</option>
                  <option value="TGO">Togo</option>
                  <option value="BEN">Bénin</option>
                  <option value="NER">Niger</option>
                </select>
              </Field>

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

              <QuickLinkCard
                title="Remises par grade"
                body="Gère la grille des remises utilisée par la facturation, avec ses règles métier existantes."
                to="/settings/grade-discounts"
                actionLabel="Ouvrir les remises"
              />

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-base font-semibold text-gray-900">Résumé actuel</div>
                <p className="mt-2 text-sm text-gray-500">
                  Panier minimum configuré: <span className="font-semibold text-gray-900">{commercialSummary}</span>
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "users" ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <QuickLinkCard
                title="Gestion des utilisateurs"
                body="Crée, modifie et active les comptes administrateurs par rôle et par pays."
                to="/settings/users"
                actionLabel="Ouvrir les utilisateurs"
              />

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="text-base font-semibold text-gray-900">Organisation recommandée</div>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>Facturier, Caissière, Préparateur pour l’exécution.</li>
                  <li>Responsables pour la supervision métier.</li>
                  <li>Limiter les rôles techniques aux profils habilités.</li>
                </ul>
              </div>
            </div>
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

              <div className="xl:col-span-2">
                <QuickLinkCard
                  title="Campagnes marketing"
                  body="Les slides et panneaux latéraux sont maintenant gérés dans une page dédiée de l’admin."
                  to="/marketing/campaigns"
                  actionLabel="Ouvrir les campagnes"
                />
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
