import { useEffect, useMemo, useState } from "react";
import AdminUsersPage from "./AdminUsersPage";
import AdminGradeDiscountsPage from "./AdminGradeDiscountsPage";
import { settingsService } from "../services/settingsService";
import useSoundAlerts from "../hooks/useSoundAlerts";

const TABS = [
  { key: "countries", label: "Pays" },
  { key: "commercial", label: "Règles commerciales" },
  { key: "notifications", label: "Notifications" },
  { key: "sound-alerts", label: "Alertes sonores" },
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
    maxQtyPerProduct: 10,
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
  notifications: {
    templates: {
      sms: {
        INVOICE:
          "FOREVER: Facture {{invoiceRef}}. Montant: {{totalFcfa}}F. Paiement: {{paymentLink}}",
        ORDER_READY:
          "FOREVER: Bonjour {{customerName}}, colis {{parcelNumber}} prêt. Code retrait: {{pickupCode}}.",
        PREPARATION_STARTED:
          "FOREVER: Bonjour {{customerName}}, colis {{parcelNumber}} en préparation.",
        ORDER_FULFILLED:
          "FOREVER: Bonjour {{customerName}}, votre commande {{preorderNumber}} est clôturée. Merci pour votre confiance.",
        REMINDER:
          "FOREVER: Rappel commande {{preorderNumber}}. Ref: {{invoiceRef}}. Paiement: {{paymentLink}}",
      },
      email: {
        INVOICE: {
          subject: "FOREVER | Facture de commande {{preorderNumber}}",
          body: "Bonjour {{customerName}},\n\nNous vous remercions pour votre commande.\nVotre facture est disponible.\n\nRéférence facture: {{invoiceRef}}\nNuméro de commande: {{preorderNumber}}\nMontant à payer: {{totalFcfaLabel}}\nLien de paiement: {{paymentLink}}\n\nPour toute assistance, contactez-nous au {{supportPhone}}.\n\nCordialement,\nService Client FOREVER",
        },
        ORDER_READY: {
          subject: "FOREVER | Colis prêt - Commande {{preorderNumber}}",
          body: "Bonjour {{customerName}},\n\nVotre colis est prêt au retrait.\n\nRéférence colis: {{parcelNumber}}\nCode de retrait: {{pickupCode}}\nPoint de retrait: {{pickupAddress}}\n\nMerci de présenter ce code au comptoir.\n\nCordialement,\nService Client FOREVER",
        },
        PREPARATION_STARTED: {
          subject: "FOREVER | Préparation en cours - Commande {{preorderNumber}}",
          body: "Bonjour {{customerName}},\n\nVotre commande est en cours de préparation.\n\nRéférence colis: {{parcelNumber}}\n\nNous vous informerons dès qu'elle sera prête.\n\nCordialement,\nService Client FOREVER",
        },
        ORDER_FULFILLED: {
          subject: "FOREVER | Commande clôturée {{preorderNumber}}",
          body: "Bonjour {{customerName}},\n\nVotre commande {{preorderNumber}} a été clôturée avec succès.\nRéférence colis: {{parcelNumber}}\n\nNous vous remercions pour votre confiance.\n\nCordialement,\nService Client FOREVER",
        },
        REMINDER: {
          subject: "FOREVER | Rappel de commande {{preorderNumber}}",
          body: "Bonjour {{customerName}},\n\nNous vous rappelons les informations de votre commande.\n\nRéférence facture: {{invoiceRef}}\nNuméro de commande: {{preorderNumber}}\nMontant: {{totalFcfaLabel}}\nLien de paiement: {{paymentLink}}\n\nNous restons à votre disposition au {{supportPhone}}.\n\nCordialement,\nService Client FOREVER",
        },
      },
    },
  },
  soundAlerts: {
    forceEnabled: true,
    forceVolumePercent: 100,
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
  const sound = useSoundAlerts("settings");
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
            maxQtyPerProduct:
              data.maxQtyPerProduct ?? prev.commercial.maxQtyPerProduct,
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
          notifications: {
            templates: {
              sms: {
                ...prev.notifications.templates.sms,
                ...(data?.notificationTemplates?.sms || {}),
              },
              email: {
                ...prev.notifications.templates.email,
                ...(data?.notificationTemplates?.email || {}),
              },
            },
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
        maxQtyPerProduct: settings.commercial.maxQtyPerProduct,
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
        notificationTemplates: settings.notifications.templates,
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

  function setSmsTemplate(purpose, value) {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        templates: {
          ...prev.notifications.templates,
          sms: {
            ...prev.notifications.templates.sms,
            [purpose]: value,
          },
        },
      },
    }));
  }

  function setEmailTemplate(purpose, field, value) {
    setSettings((prev) => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        templates: {
          ...prev.notifications.templates,
          email: {
            ...prev.notifications.templates.email,
            [purpose]: {
              ...(prev.notifications.templates.email?.[purpose] || {}),
              [field]: value,
            },
          },
        },
      },
    }));
  }

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
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-3">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-[#e4d395] bg-[#fff7df] text-[#6c5715]"
                      : "border-[#e7dec8] bg-white text-[#5D4B3C] hover:bg-[#fcfbf7]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
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

              <Field label="Quantité maximum par produit">
                <TextInput
                  type="number"
                  min="1"
                  max="999"
                  value={settings.commercial.maxQtyPerProduct}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      commercial: {
                        ...prev.commercial,
                        maxQtyPerProduct: Number(e.target.value || 1),
                      },
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
                <p className="mt-1 text-sm text-[#6f6a60]">
                  Quantité max/produit:{" "}
                  <span className="font-semibold text-[#000000]">
                    {settings.commercial.maxQtyPerProduct}
                  </span>
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "users" ? (
            <AdminUsersPage />
          ) : null}

          {activeTab === "notifications" ? (
            <div className="space-y-6">
              <div className="border border-[#e7dec8] bg-[#fcfbf7] p-4 text-sm text-[#6f6a60]">
                Variables disponibles:{" "}
                <code>{`{{customerName}} {{preorderNumber}} {{parcelNumber}} {{invoiceRef}} {{totalFcfa}} {{totalFcfaLabel}} {{paymentLink}} {{pickupCode}} {{supportPhone}} {{pickupAddress}}`}</code>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <Field label="SMS - Facture">
                  <TextArea
                    rows={3}
                    value={settings.notifications.templates.sms.INVOICE || ""}
                    onChange={(e) => setSmsTemplate("INVOICE", e.target.value)}
                  />
                </Field>
                <Field label="SMS - Colis prêt">
                  <TextArea
                    rows={3}
                    value={settings.notifications.templates.sms.ORDER_READY || ""}
                    onChange={(e) => setSmsTemplate("ORDER_READY", e.target.value)}
                  />
                </Field>
                <Field label="SMS - Préparation en cours">
                  <TextArea
                    rows={3}
                    value={settings.notifications.templates.sms.PREPARATION_STARTED || ""}
                    onChange={(e) =>
                      setSmsTemplate("PREPARATION_STARTED", e.target.value)
                    }
                  />
                </Field>
                <Field label="SMS - Rappel">
                  <TextArea
                    rows={3}
                    value={settings.notifications.templates.sms.REMINDER || ""}
                    onChange={(e) => setSmsTemplate("REMINDER", e.target.value)}
                  />
                </Field>
                <Field label="SMS - Commande clôturée">
                  <TextArea
                    rows={3}
                    value={settings.notifications.templates.sms.ORDER_FULFILLED || ""}
                    onChange={(e) =>
                      setSmsTemplate("ORDER_FULFILLED", e.target.value)
                    }
                  />
                </Field>
              </div>

              <div className="space-y-4">
                <div className="text-base font-semibold text-[#000000]">
                  Templates Email
                </div>
                {["INVOICE", "ORDER_READY", "PREPARATION_STARTED", "ORDER_FULFILLED", "REMINDER"].map(
                  (purpose) => (
                    <div
                      key={purpose}
                      className="grid gap-4 border border-[#e7dec8] bg-white p-4 xl:grid-cols-2"
                    >
                      <Field label={`Email ${purpose} - Sujet`}>
                        <TextInput
                          value={
                            settings.notifications.templates.email?.[purpose]
                              ?.subject || ""
                          }
                          onChange={(e) =>
                            setEmailTemplate(purpose, "subject", e.target.value)
                          }
                        />
                      </Field>
                      <div className="xl:col-span-2">
                        <Field label={`Email ${purpose} - Corps`}>
                          <TextArea
                            rows={5}
                            value={
                              settings.notifications.templates.email?.[purpose]
                                ?.body || ""
                            }
                            onChange={(e) =>
                              setEmailTemplate(purpose, "body", e.target.value)
                            }
                          />
                        </Field>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : null}

          {activeTab === "sound-alerts" ? (
            <div className="space-y-4">
              <div className="border border-[#e7dec8] bg-[#fcfbf7] p-4 text-sm text-[#6f6a60]">
                Les alertes sonores sont gérées de façon centralisée pour les espaces
                Facturation, Caisse et Préparation.
              </div>

              <div className="grid gap-4 xl:grid-cols-3">
                <div className="border border-[#e7dec8] bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-[#8d7a5c]">
                    État global
                  </div>
                  <div className="mt-2 text-base font-semibold text-[#000000]">
                    Toujours activées
                  </div>
                </div>
                <div className="border border-[#e7dec8] bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-[#8d7a5c]">
                    Volume global
                  </div>
                  <div className="mt-2 text-base font-semibold text-[#000000]">
                    100%
                  </div>
                </div>
                <div className="border border-[#e7dec8] bg-white p-4">
                  <div className="text-xs uppercase tracking-wide text-[#8d7a5c]">
                    Activation navigateur
                  </div>
                  <div className="mt-2 text-base font-semibold text-[#000000]">
                    {sound.unlocked ? "Active" : "À activer"}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                {!sound.unlocked ? (
                  <button
                    type="button"
                    onClick={sound.unlockSound}
                    className="border border-[#e7dec8] bg-white px-4 py-2 text-sm font-medium text-[#5D4B3C] hover:bg-[#fcfbf7]"
                  >
                    Activer le son navigateur
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={sound.testSound}
                  className="bg-[#FFC600] px-4 py-2 text-sm font-medium text-black hover:bg-[#e6b200]"
                >
                  Tester l'alerte sonore
                </button>
              </div>
            </div>
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
