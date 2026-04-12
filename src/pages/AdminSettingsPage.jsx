// src/pages/AdminSettingsPage.jsx
// Page d'administration des paramètres - Version améliorée UI/UX
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminUsersPage from "./AdminUsersPage";
import AdminGradeDiscountsPage from "./AdminGradeDiscountsPage";
import { settingsService } from "../services/settingsService";
import useSoundAlerts from "../hooks/useSoundAlerts";
import {
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  ShoppingCart,
  Bell,
  Volume2,
  Users,
  Percent,
  Palette,
  Building2,
  CreditCard,
  Truck,
  Banknote,
  Smartphone,
  Settings2,
  Copy,
  RotateCcw,
} from "lucide-react";

// --- Constantes ---
const TABS = [
  { key: "countries", label: "Pays", icon: Globe, description: "Configuration par pays" },
  { key: "commercial", label: "Règles commerciales", icon: ShoppingCart, description: "Panier et tarification" },
  { key: "notifications", label: "Notifications", icon: Bell, description: "SMS et emails" },
  { key: "sound-alerts", label: "Alertes sonores", icon: Volume2, description: "Sons de notification" },
  { key: "users", label: "Utilisateurs", icon: Users, description: "Gestion des accès" },
  { key: "discounts", label: "Remises", icon: Percent, description: "Remises par grade" },
  { key: "theme", label: "Thème", icon: Palette, description: "Apparence visuelle" },
];

const DEFAULT_SETTINGS = {
  countries: {
    supportPhone: "",
    pickupAddress: "",
    enableWave: true,
    enableOrangeMoney: true,
    enableCash: true,
    enableBankTransfer: true,
    enableDelivery: true,
    enablePickup: true,
    bankAccountLabel: "",
    bankName: "",
    bankAccountNumber: "",
    bankIban: "",
    bankSwift: "",
    bankAccountHolder: "",
    bankPaymentDueHours: 72,
    bankProofMaxFileSizeMb: 8,
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
          "FOREVER: Votre facture est prête. Code {{paymentCollectionCode}}. Montant {{totalFcfa}}F.",
        PREORDER_SUBMITTED:
          "FOREVER: Précommande {{preorderNumber}} bien reçue. Nous préparons votre facture et revenons vers vous rapidement.",
        INVOICE_WAVE:
          "FOREVER: Votre facture est prête. Code {{paymentCollectionCode}}. Montant {{totalFcfa}}F. Payez ici: {{paymentLink}}",
        INVOICE_CASH:
          "FOREVER: Votre facture est prête. Code {{paymentCollectionCode}}. Montant {{totalFcfa}}F. Paiement à la caisse FLP.",
        INVOICE_BANK_TRANSFER:
          "FOREVER: Votre facture est prête. Code {{paymentCollectionCode}}. Montant {{totalFcfa}}F. Infos virement dans votre email/espace client.",
        ORDER_READY:
          "FOREVER: Colis prêt pour la commande {{preorderNumber}}. Code retrait {{pickupCode}}. Présentez ce code au comptoir FLP.",
        PREPARATION_STARTED:
          "FOREVER: Préparation en cours pour la commande {{preorderNumber}}. Nous vous notifions dès que le colis est prêt.",
        ORDER_FULFILLED:
          "FOREVER: Retrait confirmé pour la commande {{preorderNumber}}. Merci pour votre confiance.",
        REMINDER:
          "FOREVER: Rappel commande {{preorderNumber}}. Code {{paymentCollectionCode}}. Montant {{totalFcfa}}F. Assistance: {{supportPhone}}",
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

const NOTIFICATION_VARIABLES = [
  "{{customerName}}",
  "{{preorderNumber}}",
  "{{parcelNumber}}",
  "{{invoiceRef}}",
  "{{paymentCollectionCode}}",
  "{{totalFcfa}}",
  "{{totalFcfaLabel}}",
  "{{paymentLink}}",
  "{{pickupCode}}",
  "{{supportPhone}}",
  "{{pickupAddress}}",
];

const SMS_TEMPLATE_META = {
  PREORDER_SUBMITTED: {
    label: "Demande reçue (après envoi précommande)",
    hint: "Message de confirmation immédiate au client.",
  },
  INVOICE_WAVE: {
    label: "Facture prête - Paiement Wave",
    hint: "Inclure {{paymentLink}} pour le paiement.",
  },
  INVOICE_CASH: {
    label: "Facture prête - Paiement en caisse",
    hint: "Client se présente à la caisse avec son code.",
  },
  INVOICE_BANK_TRANSFER: {
    label: "Facture prête - Virement bancaire",
    hint: "Renvoie vers email/espace client pour les infos bancaires.",
  },
  INVOICE: {
    label: "Facture prête - Message de secours",
    hint: "Utilisé si aucun template spécifique au mode n'est trouvé.",
  },
  REMINDER: {
    label: "Rappel paiement",
    hint: "Relance courte et claire.",
  },
  PREPARATION_STARTED: {
    label: "Préparation en cours",
    hint: "Informe que le colis est en préparation.",
  },
  ORDER_READY: {
    label: "Colis prêt",
    hint: "Inclure le code de retrait {{pickupCode}}.",
  },
  ORDER_FULFILLED: {
    label: "Commande clôturée",
    hint: "Confirmation finale du retrait/livraison.",
  },
};

const SMS_TEMPLATE_GROUPS = [
  {
    title: "Parcours paiement",
    keys: [
      "PREORDER_SUBMITTED",
      "INVOICE_WAVE",
      "INVOICE_CASH",
      "INVOICE_BANK_TRANSFER",
      "INVOICE",
      "REMINDER",
    ],
  },
  {
    title: "Parcours colis",
    keys: ["PREPARATION_STARTED", "ORDER_READY", "ORDER_FULFILLED"],
  },
];

const EMAIL_TEMPLATE_LABELS = {
  INVOICE: "Facture prête",
  ORDER_READY: "Colis prêt",
  PREPARATION_STARTED: "Préparation en cours",
  ORDER_FULFILLED: "Commande clôturée",
  REMINDER: "Rappel paiement",
};

// --- Composants améliorés ---

function Card({ title, description, actions, children, collapsible = false }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const headerContent = (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#efe7d7] bg-gradient-to-r from-[#fcfbf7] to-white px-6 py-5">
      <div>
        <h2 className="text-lg font-bold text-[#000000]">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-[#6f6a60]">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {collapsible && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-[#e7dec8] bg-white shadow-sm overflow-hidden"
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left"
        >
          {headerContent}
        </button>
      ) : (
        headerContent
      )}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function Field({ label, hint, error, required, children }) {
  const id = React.useId();

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-center gap-2">
        <span className="text-sm font-semibold text-[#5D4B3C]">{label}</span>
        {required && <span className="text-red-500 text-xs">*</span>}
      </label>
      {React.isValidElement(children)
        ? React.cloneElement(children, { id })
        : children}
      {hint && <div className="text-xs text-[#8d7a5c]">{hint}</div>}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-xs text-red-600"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.div>
      )}
    </div>
  );
}

function TextInput({ error, ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 ${
        error
          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
          : "border-[#e7dec8] focus:border-[#FFC600] focus:ring-[#FFC600]/20"
      }`}
    />
  );
}

function TextArea({ error, ...props }) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition-all focus:ring-2 resize-y ${
        error
          ? "border-red-300 focus:border-red-400 focus:ring-red-100"
          : "border-[#e7dec8] focus:border-[#FFC600] focus:ring-[#FFC600]/20"
      }`}
    />
  );
}

function ToggleCard({ label, hint, checked, onChange, icon: Icon }) {
  return (
    <motion.label
      whileHover={{ scale: 1.01 }}
      className={`flex items-center gap-4 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all ${
        checked
          ? "border-[#FFC600] bg-gradient-to-r from-[#fff7d6] to-[#fffbeb] shadow-sm"
          : "border-[#e7dec8] bg-white hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <div className={`p-2 rounded-lg ${checked ? "bg-[#FFC600]/20" : "bg-gray-100"}`}>
        {Icon && <Icon className={`w-5 h-5 ${checked ? "text-[#5D4B3C]" : "text-gray-500"}`} />}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-[#000000]">{label}</div>
        <div className="text-xs text-[#8d7a5c]">{hint}</div>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
        checked ? "border-[#FFC600] bg-[#FFC600]" : "border-gray-300"
      }`}>
        {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
      </div>
    </motion.label>
  );
}

function StatCard({ icon: Icon, label, value, color = "gold" }) {
  const colors = {
    gold: "bg-gradient-to-br from-[#fff7d6] to-[#fffbeb] border-[#f0cf57]",
    blue: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
    emerald: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`rounded-xl border p-4 ${colors[color]}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color === "gold" ? "bg-[#FFC600]/20" : "bg-white/50"}`}>
          <Icon className="w-5 h-5 text-[#5D4B3C]" />
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">{label}</div>
          <div className="text-lg font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </motion.div>
  );
}

function VariableChip({ variable, onCopy }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard?.writeText(variable);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    onCopy?.();
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono transition-all ${
        copied
          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
          : "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200"
      } border`}
    >
      {variable}
      {copied ? (
        <CheckCircle2 className="w-3 h-3" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </motion.button>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const configs = {
    success: { bg: "bg-emerald-50 border-emerald-200", text: "text-emerald-800", icon: CheckCircle2 },
    error: { bg: "bg-red-50 border-red-200", text: "text-red-800", icon: AlertCircle },
  };

  const config = configs[type] || configs.success;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`fixed top-20 right-6 z-50 rounded-xl border px-4 py-3 shadow-lg flex items-center gap-3 ${config.bg} ${config.text}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{message}</span>
    </motion.div>
  );
}

// --- Composant Principal ---
export default function AdminSettingsPage() {
  const sound = useSoundAlerts("settings");
  const [activeTab, setActiveTab] = useState("countries");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    bank: true,
    sms: true,
    email: true,
  });

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
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
            enableBankTransfer: data.enableBankTransfer ?? true,
            enableDelivery: Boolean(data.enableDelivery),
            enablePickup: Boolean(data.enablePickup),
            bankAccountLabel: data.bankAccountLabel || "",
            bankName: data.bankName || "",
            bankAccountNumber: data.bankAccountNumber || "",
            bankIban: data.bankIban || "",
            bankSwift: data.bankSwift || "",
            bankAccountHolder: data.bankAccountHolder || "",
            bankPaymentDueHours:
              data.bankPaymentDueHours ?? prev.countries.bankPaymentDueHours,
            bankProofMaxFileSizeMb:
              data.bankProofMaxFileSizeMb ?? prev.countries.bankProofMaxFileSizeMb,
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
        setToast({
          message: e?.response?.data?.message || "Impossible de charger les paramètres.",
          type: "error",
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setSaving(true);
      await settingsService.updateCountrySettings({
        minCartFcfa: settings.commercial.minCartTotalFcfa,
        maxQtyPerProduct: settings.commercial.maxQtyPerProduct,
        supportPhone: settings.countries.supportPhone,
        pickupAddress: settings.countries.pickupAddress,
        enableWave: settings.countries.enableWave,
        enableOrangeMoney: settings.countries.enableOrangeMoney,
        enableCash: settings.countries.enableCash,
        enableBankTransfer: settings.countries.enableBankTransfer,
        enableDelivery: settings.countries.enableDelivery,
        enablePickup: settings.countries.enablePickup,
        bankAccountLabel: settings.countries.bankAccountLabel,
        bankName: settings.countries.bankName,
        bankAccountNumber: settings.countries.bankAccountNumber,
        bankIban: settings.countries.bankIban,
        bankSwift: settings.countries.bankSwift,
        bankAccountHolder: settings.countries.bankAccountHolder,
        bankPaymentDueHours: settings.countries.bankPaymentDueHours,
        bankProofMaxFileSizeMb: settings.countries.bankProofMaxFileSizeMb,
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
      setToast({ message: "Paramètres enregistrés avec succès", type: "success" });
    } catch (e) {
      setToast({
        message: e?.response?.data?.message || "Impossible d'enregistrer les paramètres.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [settings]);

  const commercialSummary = useMemo(
    () => `${settings.commercial.minCartTotalFcfa} ${settings.commercial.currencyLabel}`,
    [settings.commercial],
  );

  const setSmsTemplate = useCallback((purpose, value) => {
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
  }, []);

  const setEmailTemplate = useCallback((purpose, field, value) => {
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
  }, []);

  const resetToDefault = useCallback(() => {
    if (window.confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) {
      setSettings(DEFAULT_SETTINGS);
      setToast({ message: "Paramètres réinitialisés", type: "success" });
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#FFC600] mx-auto mb-3" />
          <p className="text-sm text-gray-500">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      <Card
        title="Paramètres généraux"
        description="Configurez les éléments variables selon les pays, les règles commerciales et l'habillage de l'application."
        actions={
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              onClick={resetToDefault}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Réinitialiser
            </motion.button>
            <motion.button
              type="button"
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-lg bg-[#FFC600] px-5 py-2 text-sm font-semibold text-black hover:bg-[#e6b200] disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Enregistrer
                </>
              )}
            </motion.button>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Onglets */}
          <div className="overflow-x-auto -mx-6 px-6">
            <div className="flex gap-2 pb-2 min-w-max">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <motion.button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                      activeTab === tab.key
                        ? "bg-[#FFC600] text-black shadow-md"
                        : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Contenu des onglets */}
          <AnimatePresence mode="wait">
            {/* Pays */}
            {activeTab === "countries" && (
              <motion.div
                key="countries"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid gap-4 xl:grid-cols-2">
                  <Field label="Téléphone support" hint="Numéro affiché dans les communications">
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
                </div>

                <div>
                  <Field label="Adresse de retrait" hint="Adresse physique du point de retrait">
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

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <ToggleCard
                    label="Wave"
                    hint="Paiement mobile Wave"
                    checked={settings.countries.enableWave}
                    onChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        countries: { ...prev.countries, enableWave: checked },
                      }))
                    }
                    icon={Smartphone}
                  />
                  <ToggleCard
                    label="Orange Money"
                    hint="Paiement mobile Orange"
                    checked={settings.countries.enableOrangeMoney}
                    onChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        countries: { ...prev.countries, enableOrangeMoney: checked },
                      }))
                    }
                    icon={Smartphone}
                  />
                  <ToggleCard
                    label="Espèces"
                    hint="Paiement en espèces"
                    checked={settings.countries.enableCash}
                    onChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        countries: { ...prev.countries, enableCash: checked },
                      }))
                    }
                    icon={Banknote}
                  />
                  <ToggleCard
                    label="Virement bancaire"
                    hint="Virement classique"
                    checked={settings.countries.enableBankTransfer}
                    onChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        countries: { ...prev.countries, enableBankTransfer: checked },
                      }))
                    }
                    icon={Building2}
                  />
                  <ToggleCard
                    label="Livraison"
                    hint="Livraison à domicile"
                    checked={settings.countries.enableDelivery}
                    onChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        countries: { ...prev.countries, enableDelivery: checked },
                      }))
                    }
                    icon={Truck}
                  />
                  <ToggleCard
                    label="Retrait"
                    hint="Retrait en point de vente"
                    checked={settings.countries.enablePickup}
                    onChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        countries: { ...prev.countries, enablePickup: checked },
                      }))
                    }
                    icon={ShoppingCart}
                  />
                </div>

                {/* Section virement bancaire */}
                <div className="rounded-xl border border-[#e7dec8] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSections(prev => ({ ...prev, bank: !prev.bank }))}
                    className="w-full flex items-center justify-between px-5 py-4 bg-[#fcfbf7] hover:bg-[#f8f4e7] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-[#5D4B3C]" />
                      <span className="font-semibold text-[#5D4B3C]">Paramètres virement bancaire</span>
                    </div>
                    {expandedSections.bank ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {expandedSections.bank && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 border-t border-[#e7dec8] grid gap-4 sm:grid-cols-2">
                          <Field label="Libellé compte">
                            <TextInput
                              value={settings.countries.bankAccountLabel}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  countries: { ...prev.countries, bankAccountLabel: e.target.value },
                                }))
                              }
                              placeholder="Compte principal FCFA"
                            />
                          </Field>
                          <Field label="Banque">
                            <TextInput
                              value={settings.countries.bankName}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  countries: { ...prev.countries, bankName: e.target.value },
                                }))
                              }
                              placeholder="Nom de la banque"
                            />
                          </Field>
                          <Field label="Numéro de compte">
                            <TextInput
                              value={settings.countries.bankAccountNumber}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  countries: { ...prev.countries, bankAccountNumber: e.target.value },
                                }))
                              }
                              placeholder="Ex: 1234567890"
                            />
                          </Field>
                          <Field label="Titulaire du compte">
                            <TextInput
                              value={settings.countries.bankAccountHolder}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  countries: { ...prev.countries, bankAccountHolder: e.target.value },
                                }))
                              }
                              placeholder="FOREVER LIVING PRODUCTS"
                            />
                          </Field>
                          <Field label="IBAN (optionnel)">
                            <TextInput
                              value={settings.countries.bankIban}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  countries: { ...prev.countries, bankIban: e.target.value },
                                }))
                              }
                            />
                          </Field>
                          <Field label="SWIFT/BIC (optionnel)">
                            <TextInput
                              value={settings.countries.bankSwift}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  countries: { ...prev.countries, bankSwift: e.target.value },
                                }))
                              }
                            />
                          </Field>
                          <Field label="Délai de paiement (heures)">
                            <TextInput
                              type="number"
                              min="1"
                              max="720"
                              value={settings.countries.bankPaymentDueHours}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  countries: {
                                    ...prev.countries,
                                    bankPaymentDueHours: Number(e.target.value || 72),
                                  },
                                }))
                              }
                            />
                          </Field>
                          <Field label="Taille max preuve (MB)">
                            <TextInput
                              type="number"
                              min="1"
                              max="50"
                              value={settings.countries.bankProofMaxFileSizeMb}
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  countries: {
                                    ...prev.countries,
                                    bankProofMaxFileSizeMb: Number(e.target.value || 8),
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Règles commerciales */}
            {activeTab === "commercial" && (
              <motion.div
                key="commercial"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Panier minimum (FCFA)" hint="Montant minimum pour valider une commande">
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

                  <Field label="Quantité max par produit" hint="Limite par ligne de commande">
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
                </div>

                <Field label="Disclaimer prix AS400" hint="Message affiché concernant les prix indicatifs">
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

                <div className="grid gap-4 sm:grid-cols-2">
                  <StatCard
                    icon={ShoppingCart}
                    label="Panier minimum"
                    value={commercialSummary}
                    color="gold"
                  />
                  <StatCard
                    icon={Settings2}
                    label="Quantité max/produit"
                    value={settings.commercial.maxQtyPerProduct}
                    color="blue"
                  />
                </div>
              </motion.div>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Variables disponibles</p>
                  <div className="flex flex-wrap gap-2">
                    {NOTIFICATION_VARIABLES.map((variable) => (
                      <VariableChip
                        key={variable}
                        variable={variable}
                        onCopy={() => setToast({ message: "Variable copiée", type: "success" })}
                      />
                    ))}
                  </div>
                </div>

                {/* SMS */}
                <div className="rounded-xl border border-[#e7dec8] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSections(prev => ({ ...prev, sms: !prev.sms }))}
                    className="w-full flex items-center justify-between px-5 py-4 bg-[#fcfbf7] hover:bg-[#f8f4e7] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-[#5D4B3C]" />
                      <span className="font-semibold text-[#5D4B3C]">Messages SMS clients</span>
                    </div>
                    {expandedSections.sms ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {expandedSections.sms && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 border-t border-[#e7dec8] space-y-6">
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                            Conseil: restez sous 160 caractères pour éviter les SMS multi-parties.
                          </div>
                          {SMS_TEMPLATE_GROUPS.map((group) => (
                            <div key={group.title} className="space-y-3">
                              <div className="text-sm font-semibold text-[#5D4B3C]">{group.title}</div>
                              <div className="grid gap-4 sm:grid-cols-2">
                                {group.keys.map((purpose) => {
                                  const value = settings.notifications.templates.sms?.[purpose] || "";
                                  const meta = SMS_TEMPLATE_META[purpose] || {
                                    label: purpose.replace(/_/g, " "),
                                    hint: "",
                                  };
                                  const length = String(value).length;
                                  const over = length > 160;
                                  return (
                                    <Field key={purpose} label={meta.label} hint={meta.hint}>
                                      <div className="space-y-1.5">
                                        <TextArea
                                          rows={3}
                                          value={value}
                                          onChange={(e) => setSmsTemplate(purpose, e.target.value)}
                                        />
                                        <div
                                          className={`text-xs ${
                                            over ? "text-red-600 font-semibold" : "text-[#8d7a5c]"
                                          }`}
                                        >
                                          {length}/160 caractères {over ? "(dépassement)" : ""}
                                        </div>
                                      </div>
                                    </Field>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Email */}
                <div className="rounded-xl border border-[#e7dec8] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedSections(prev => ({ ...prev, email: !prev.email }))}
                    className="w-full flex items-center justify-between px-5 py-4 bg-[#fcfbf7] hover:bg-[#f8f4e7] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-[#5D4B3C]" />
                      <span className="font-semibold text-[#5D4B3C]">Messages Email clients</span>
                    </div>
                    {expandedSections.email ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                  <AnimatePresence>
                    {expandedSections.email && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-5 border-t border-[#e7dec8] space-y-4">
                          {["INVOICE", "ORDER_READY", "PREPARATION_STARTED", "ORDER_FULFILLED", "REMINDER"].map(
                            (purpose) => (
                              <div key={purpose} className="grid gap-4 border border-[#e7dec8] rounded-lg p-4">
                                <Field label={`${EMAIL_TEMPLATE_LABELS[purpose] || purpose} - Sujet`}>
                                  <TextInput
                                    value={settings.notifications.templates.email?.[purpose]?.subject || ""}
                                    onChange={(e) => setEmailTemplate(purpose, "subject", e.target.value)}
                                  />
                                </Field>
                                <Field label={`${EMAIL_TEMPLATE_LABELS[purpose] || purpose} - Corps`}>
                                  <TextArea
                                    rows={5}
                                    value={settings.notifications.templates.email?.[purpose]?.body || ""}
                                    onChange={(e) => setEmailTemplate(purpose, "body", e.target.value)}
                                  />
                                </Field>
                              </div>
                            ),
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Utilisateurs */}
            {activeTab === "users" && (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <AdminUsersPage />
              </motion.div>
            )}

            {/* Alertes sonores */}
            {activeTab === "sound-alerts" && (
              <motion.div
                key="sound"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard
                    icon={Volume2}
                    label="État global"
                    value={sound.enabled ? "Activées" : "Désactivées"}
                    color={sound.enabled ? "emerald" : "gold"}
                  />
                  <StatCard
                    icon={Volume2}
                    label="Volume global"
                    value={`${Math.round((Number(sound.volume || 0) || 0) * 100)}%`}
                    color="blue"
                  />
                  <StatCard
                    icon={Volume2}
                    label="Activation navigateur"
                    value={sound.unlocked ? "Active" : "À activer"}
                    color={sound.unlocked ? "emerald" : "gold"}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  {!sound.unlocked && (
                    <motion.button
                      type="button"
                      onClick={sound.unlockSound}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Activer le son navigateur
                    </motion.button>
                  )}
                  <motion.button
                    type="button"
                    onClick={sound.testSound}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="rounded-lg bg-[#FFC600] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#e6b200] shadow-md transition-all"
                  >
                    Tester l'alerte sonore
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Remises */}
            {activeTab === "discounts" && (
              <motion.div
                key="discounts"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <AdminGradeDiscountsPage />
              </motion.div>
            )}

            {/* Thème */}
            {activeTab === "theme" && (
              <motion.div
                key="theme"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Couleur principale">
                    <div className="flex items-center gap-3">
                      <TextInput
                        value={settings.theme.primaryColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, primaryColor: e.target.value },
                          }))
                        }
                      />
                      <div
                        className="w-10 h-10 rounded-lg border shadow-sm"
                        style={{ backgroundColor: settings.theme.primaryColor }}
                      />
                    </div>
                  </Field>

                  <Field label="Couleur secondaire">
                    <div className="flex items-center gap-3">
                      <TextInput
                        value={settings.theme.secondaryColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, secondaryColor: e.target.value },
                          }))
                        }
                      />
                      <div
                        className="w-10 h-10 rounded-lg border shadow-sm"
                        style={{ backgroundColor: settings.theme.secondaryColor }}
                      />
                    </div>
                  </Field>

                  <Field label="Couleur sombre">
                    <div className="flex items-center gap-3">
                      <TextInput
                        value={settings.theme.darkColor}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            theme: { ...prev.theme, darkColor: e.target.value },
                          }))
                        }
                      />
                      <div
                        className="w-10 h-10 rounded-lg border shadow-sm"
                        style={{ backgroundColor: settings.theme.darkColor }}
                      />
                    </div>
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
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <ToggleCard
                    label="Slider actif"
                    hint="Affiche le slider marketing du catalogue"
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
                    hint="Affiche les panneaux desktop du catalogue"
                    checked={settings.theme.sidePanelsEnabled}
                    onChange={(checked) =>
                      setSettings((prev) => ({
                        ...prev,
                        theme: { ...prev.theme, sidePanelsEnabled: checked },
                      }))
                    }
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
