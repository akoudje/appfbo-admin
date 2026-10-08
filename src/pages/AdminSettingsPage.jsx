// src/pages/AdminSettingsPage.jsx
// Page d'administration des paramètres - Version améliorée UI/UX
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  useContext,
} from "react";
import { motion as Motion, AnimatePresence, MotionConfig } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  DEFAULT_SETTINGS,
  settingsFromApi,
  settingsToApi,
  settingsPatch,
  resetSettingsSection,
} from "../utils/settingsModel";
import { validateCountrySettings } from "../utils/settingsValidation";
import SettingsNotificationEditor from "../components/settings/SettingsNotificationEditor";
import SettingsHistory from "../components/settings/SettingsHistory";
import { settingsService } from "../services/settingsService";
import useSoundAlerts from "../hooks/useSoundAlerts";
import useAdminAuth from "../hooks/useAdminAuth";
import { useConfirm } from "../hooks/useDialogs";
import { AdminRole, Permission } from "../auth/permissions";
import { getCountryCode } from "../services/api";
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
  MessageCircle,
  Plus,
  Trash2,
} from "lucide-react";

// --- Constantes ---
const TABS = [
  {
    key: "countries",
    label: "Général",
    icon: Building2,
    description: "Assistance et points de vente",
  },
  {
    key: "payments",
    label: "Paiements et livraison",
    icon: CreditCard,
    description: "Règlement et remise",
  },
  {
    key: "commercial",
    label: "Règles commerciales",
    icon: ShoppingCart,
    description: "Tarification et délais",
  },
  {
    key: "notifications",
    label: "Messages clients",
    icon: Bell,
    description: "Modèles SMS et email",
  },
  {
    key: "fbo-help",
    label: "Aide FBO",
    icon: MessageCircle,
    description: "Rubriques d’assistance",
  },
  {
    key: "theme",
    label: "Apparence du catalogue",
    icon: Palette,
    description: "Identité visuelle",
  },
  {
    key: "history",
    label: "Historique",
    icon: RotateCcw,
    description: "Dernières modifications",
  },
  {
    key: "sound-alerts",
    label: "Préférences personnelles",
    icon: Volume2,
    description: "Alertes de ce navigateur",
  },
];
const SettingsErrorContext = React.createContext({});

function formatDurationFromMinutes(value) {
  const total = Math.max(1, Number.parseInt(String(value || ""), 10) || 1);
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours > 0 && minutes > 0)
    return `${hours}h${String(minutes).padStart(2, "0")}`;
  if (hours > 0) return `${hours}h`;
  return `${minutes} min`;
}

function createCustomFboHelpTopic() {
  const id = `custom-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return {
    id,
    type: "custom",
    enabled: true,
    label: "Nouvelle rubrique",
    answer: "Réponse à compléter.",
  };
}

// --- Composants améliorés ---

function Card({ title, description, actions, children, collapsible = false }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const headerContent = (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 bg-gray-50 px-6 py-5">
      <div>
        <h2 className="text-lg font-bold text-[#000000]">{title}</h2>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        {collapsible && (
          <span className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-label={title}
          className="w-full text-left"
        >
          {headerContent}
        </button>
      ) : (
        headerContent
      )}
      <AnimatePresence>
        {isExpanded && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6">{children}</div>
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.section>
  );
}

function SettingsImagePreview({ url, label }) {
  const [failed, setFailed] = useState(false);
  if (!url || (!/^https?:\/\//i.test(url) && !/^\/(?!\/)/.test(url)))
    return null;
  return failed ? (
    <p role="status" className="text-xs text-amber-700">
      Image indisponible. Vérifiez son adresse.
    </p>
  ) : (
    <figure className="space-y-2">
      <figcaption className="text-xs text-gray-500">{label}</figcaption>
      <img
        src={url}
        alt={label}
        onError={() => setFailed(true)}
        className="max-h-40 max-w-48 rounded-lg border border-gray-200 bg-white p-2 object-contain"
      />
    </figure>
  );
}

function fieldControls(nodes) {
  return React.Children.toArray(nodes).flatMap((child) => {
    if (!React.isValidElement(child)) return [];
    if (
      child.type === TextInput ||
      child.type === TextArea ||
      ["input", "select", "textarea"].includes(child.type)
    )
      return [child];
    return child.props.children ? fieldControls(child.props.children) : [];
  });
}
function attachFieldId(nodes, id, invalid) {
  return React.Children.map(nodes, (child) => {
    if (!React.isValidElement(child)) return child;
    if (
      child.type === TextInput ||
      child.type === TextArea ||
      ["input", "select", "textarea"].includes(child.type)
    )
      return React.cloneElement(child, {
        id,
        "aria-describedby": id + "-help",
        "aria-invalid": invalid,
      });
    return child.props.children
      ? React.cloneElement(
          child,
          {},
          attachFieldId(child.props.children, id, invalid),
        )
      : child;
  });
}
function Field({ label, hint, error, required, children }) {
  const id = React.useId(),
    errors = useContext(SettingsErrorContext),
    key = fieldControls(children)[0]?.props["data-setting-key"],
    message = error || errors[key];
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-900">
        {label}
        {required ? " *" : ""}
      </label>
      {attachFieldId(children, id, Boolean(message))}
      <div id={id + "-help"}>
        {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
        {message ? (
          <p role="alert" className="text-xs text-red-700">
            {message}
          </p>
        ) : null}
      </div>
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
          : "border-gray-200 focus:border-gray-900 focus:ring-[#FFC600]/20"
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
          : "border-gray-200 focus:border-gray-900 focus:ring-[#FFC600]/20"
      }`}
    />
  );
}

function ToggleCard({
  label,
  hint,
  checked,
  onChange,
  icon: Icon,
  settingKey,
}) {
  const errors = useContext(SettingsErrorContext);
  return (
    <Motion.label
      className={`flex items-center gap-4 rounded-lg border-2 px-4 py-3 cursor-pointer transition-all ${
        checked
          ? "border-gray-900 bg-gray-50"
          : "border-gray-200 bg-white hover:bg-gray-50"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={Boolean(errors[settingKey])}
        className="sr-only peer"
      />
      <div
        className={`p-2 rounded-lg ${checked ? "bg-[#FFC600]/20" : "bg-gray-100"}`}
      >
        {Icon && (
          <Icon
            className={`w-5 h-5 ${checked ? "text-gray-900" : "text-gray-500"}`}
          />
        )}
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-[#000000]">{label}</div>
        <div className="text-xs text-gray-500">{hint}</div>
        {errors[settingKey] ? (
          <p role="alert" className="text-xs text-red-700">
            {errors[settingKey]}
          </p>
        ) : null}
      </div>
      <div
        className={`peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-gray-900 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          checked ? "border-gray-900 bg-[#FFC600]" : "border-gray-300"
        }`}
      >
        {checked && <CheckCircle2 className="w-4 h-4 text-white" />}
      </div>
    </Motion.label>
  );
}

function StatCard({ icon: Icon, label, value, color = "gold" }) {
  const colors = {
    gold: "bg-gradient-to-br from-[#fff7d6] to-[#fffbeb] border-[#f0cf57]",
    blue: "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200",
    emerald: "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200",
  };

  return (
    <Motion.div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-3">
        <div
          className={`p-2 rounded-lg ${color === "gold" ? "bg-[#FFC600]/20" : "bg-white/50"}`}
        >
          {Icon ? <Icon className="w-5 h-5 text-gray-900" /> : null}
        </div>
        <div>
          <div className="text-xs text-gray-500 uppercase tracking-wider">
            {label}
          </div>
          <div className="text-lg font-bold text-gray-900">{value}</div>
        </div>
      </div>
    </Motion.div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (type === "error") return undefined;
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose, type]);

  const configs = {
    success: {
      bg: "bg-emerald-50 border-emerald-200",
      text: "text-emerald-800",
      icon: CheckCircle2,
    },
    error: {
      bg: "bg-red-50 border-red-200",
      text: "text-red-800",
      icon: AlertCircle,
    },
  };

  const config = configs[type] || configs.success;
  const Icon = config.icon;

  return (
    <Motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      role={type === "error" ? "alert" : "status"}
      className={`fixed top-20 right-6 z-50 rounded-xl border px-4 py-3 shadow-lg flex items-center gap-3 ${config.bg} ${config.text}`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm font-medium">{message}</span>
      <button
        type="button"
        aria-label="Fermer le message"
        onClick={onClose}
        className="ml-2 rounded p-1"
      >
        ×
      </button>
    </Motion.div>
  );
}

// --- Composant Principal ---
export default function AdminSettingsPage() {
  const confirm = useConfirm();
  const [soundWorkspace, setSoundWorkspace] = useState("billing");
  const sound = useSoundAlerts(soundWorkspace);
  const { role, permissions } = useAdminAuth();
  const canWrite = permissions.includes(Permission.COUNTRY_WRITE);
  const navigate = useNavigate();
  const isSuperAdmin = role === AdminRole.SUPER_ADMIN;
  const [activeTab, setActiveTab] = useState("countries");
  const [settings, setSettings] = useState(() =>
    structuredClone(DEFAULT_SETTINGS),
  );
  const [baseline, setBaseline] = useState(() =>
    structuredClone(DEFAULT_SETTINGS),
  );
  const [version, setVersion] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [conflictError, setConflictError] = useState(false);
  const [reload, setReload] = useState(0);
  const [countriesError, setCountriesError] = useState("");
  const [countriesReload, setCountriesReload] = useState(0);
  const [serverErrors, setServerErrors] = useState({});
  const loadRequest = useRef(0),
    saveLock = useRef(false),
    navigationLock = useRef(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState(() =>
    getCountryCode(),
  );
  const [expandedSections, setExpandedSections] = useState({
    bank: true,
    sms: true,
    email: true,
  });
  const [countriesList, setCountriesList] = useState([]);
  const [togglingCountry, setTogglingCountry] = useState(null);

  const patch = useMemo(
    () => settingsPatch(settings, baseline),
    [settings, baseline],
  );
  const dirty = Object.keys(patch).length > 0;
  const validationErrors = validateCountrySettings(
    patch,
    settingsToApi(settings),
  );
  const fieldPaths = {
    minCartFcfa: "commercial.minCartTotalFcfa",
    maxQtyPerProduct: "commercial.maxQtyPerProduct",
    packagingFeeFcfa: "commercial.packagingFeeFcfa",
    preorderSubmissionEnabled: "commercial.preorderSubmissionEnabled",
    publicAnnouncementEnabled: "commercial.publicAnnouncementEnabled",
    publicAnnouncementMessage: "commercial.publicAnnouncementMessage",
    closedOnSaturday: "commercial.closedOnSaturday",
    supportPhone: "countries.supportPhone",
    pickupAddress: "countries.pickupAddress",
    defaultPointDeVente: "countries.defaultPointDeVente",
    enableWave: "countries.enableWave",
    enableOrangeMoney: "countries.enableOrangeMoney",
    enableCash: "countries.enableCash",
    enableBankTransfer: "countries.enableBankTransfer",
    enableEcobankPay: "countries.enableEcobankPay",
    enablePiSpi: "countries.enablePiSpi",
    enableDelivery: "countries.enableDelivery",
    enablePickup: "countries.enablePickup",
    bankAccountLabel: "countries.bankAccountLabel",
    bankName: "countries.bankName",
    bankAccountNumber: "countries.bankAccountNumber",
    bankIban: "countries.bankIban",
    bankSwift: "countries.bankSwift",
    bankAccountHolder: "countries.bankAccountHolder",
    bankPaymentDueHours: "countries.bankPaymentDueHours",
    bankProofMaxFileSizeMb: "countries.bankProofMaxFileSizeMb",
    ecobankPayMerchantName: "countries.ecobankPayMerchantName",
    ecobankPayMerchantId: "countries.ecobankPayMerchantId",
    ecobankPayTerminalName: "countries.ecobankPayTerminalName",
    ecobankPayTerminalId: "countries.ecobankPayTerminalId",
    ecobankPayQrImageUrl: "countries.ecobankPayQrImageUrl",
    ecobankPayInstructions: "countries.ecobankPayInstructions",
    piSpiAlias: "countries.piSpiAlias",
    piSpiMerchantName: "countries.piSpiMerchantName",
    piSpiQrImageUrl: "countries.piSpiQrImageUrl",
    piSpiInstructions: "countries.piSpiInstructions",
    currencyLabel: "commercial.currencyLabel",
    pricingDisclaimer: "commercial.pricingDisclaimer",
    themePrimaryColor: "theme.primaryColor",
    themeSecondaryColor: "theme.secondaryColor",
    themeDarkColor: "theme.darkColor",
    themeLogoPath: "theme.logoPath",
    themeSliderEnabled: "theme.sliderEnabled",
    themeSidePanelsEnabled: "theme.sidePanelsEnabled",
    notificationTemplates: "notifications.templates",
    fboHelpTopics: "fboHelp.topics",
  };
  const fieldErrors = Object.fromEntries(
    Object.entries({ ...validationErrors, ...serverErrors }).map(
      ([key, value]) => [fieldPaths[key] || key, value],
    ),
  );
  useEffect(() => {
    setServerErrors({});
  }, [settings]);
  useEffect(() => {
    let active = true;
    settingsService
      .getCountriesList()
      .then((data) => {
        if (active) {
          setCountriesList(data);
          setCountriesError("");
        }
      })
      .catch(() => {
        if (active)
          setCountriesError("Impossible de charger la liste des pays.");
      });
    return () => {
      active = false;
    };
  }, [countriesReload]);
  useEffect(() => {
    const request = ++loadRequest.current;
    setLoading(true);
    setLoadError("");
    settingsService
      .getCountrySettings(selectedCountryCode)
      .then((data) => {
        if (request !== loadRequest.current) return;
        const next = settingsFromApi(data);
        setSettings(next);
        setBaseline(structuredClone(next));
        setVersion(data.updatedAt || null);
        setConflictError(false);
        setServerErrors({});
      })
      .catch((error) => {
        if (request === loadRequest.current)
          setLoadError(
            error?.response?.data?.message ||
              "Impossible de charger les paramètres. Réessayez avant de les modifier.",
          );
      })
      .finally(() => {
        if (request === loadRequest.current) setLoading(false);
      });
    return () => {
      loadRequest.current += 1;
    };
  }, [selectedCountryCode, reload]);
  useEffect(() => {
    if (!dirty && !saving) return undefined;
    const beforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const leave = async (event) => {
      const anchor = event.target.closest?.("a[href]");
      if (
        !anchor ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        anchor.target === "_blank"
      )
        return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        url.href === window.location.href
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      if (saveLock.current || navigationLock.current) return;
      navigationLock.current = true;
      const ok = await confirm({
        title: "Quitter les paramètres ?",
        message: "Les modifications non enregistrées seront perdues.",
        confirmLabel: "Quitter sans enregistrer",
        tone: "warning",
      });
      navigationLock.current = false;
      if (ok) {
        setBaseline(structuredClone(settings));
        navigate(
          url.hash.startsWith("#/")
            ? url.hash.slice(1)
            : url.pathname + url.search + url.hash,
        );
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty, saving, confirm, navigate, settings]);
  const changeCountry = async (code) => {
    if (
      code === selectedCountryCode ||
      saveLock.current ||
      navigationLock.current ||
      !isSuperAdmin
    )
      return;
    navigationLock.current = true;
    const ok =
      !dirty ||
      (await confirm({
        title: "Changer de pays ?",
        message:
          "Les modifications de " +
          selectedCountryCode +
          " n’ont pas été enregistrées.",
        confirmLabel: "Changer sans enregistrer",
        tone: "warning",
      }));
    navigationLock.current = false;
    if (ok) {
      setLoading(true);
      setSelectedCountryCode(code);
      setServerErrors({});
      setToast(null);
    }
  };
  const discardChanges = async () => {
    if (saveLock.current) return;
    if (
      await confirm({
        title: "Annuler les modifications ?",
        message:
          "Les valeurs enregistrées seront restaurées dans le formulaire.",
        confirmLabel: "Annuler les modifications",
        tone: "warning",
      })
    ) {
      setSettings(structuredClone(baseline));
      setServerErrors({});
    }
  };
  const handleSave = async () => {
    if (saveLock.current || loading || loadError || !dirty || !canWrite) return;
    if (Object.keys(validationErrors).length) {
      setToast({
        type: "error",
        message: "Corrigez les champs indiqués avant d’enregistrer.",
      });
      return;
    }
    saveLock.current = true;
    setSaving(true);
    setToast(null);
    try {
      const data = await settingsService.updateCountrySettings(
        { ...patch, expectedUpdatedAt: version },
        selectedCountryCode,
      );
      const next = settingsFromApi(data);
      setSettings(next);
      setBaseline(structuredClone(next));
      setVersion(data.updatedAt || null);
      setServerErrors({});
      setToast({
        type: "success",
        message: "Paramètres " + selectedCountryCode + " enregistrés.",
      });
    } catch (error) {
      setConflictError(error?.response?.status === 409);
      setServerErrors(error?.response?.data?.errors || {});
      setToast({
        type: "error",
        message:
          error?.response?.data?.message ||
          "Impossible d’enregistrer. Vos modifications restent dans le formulaire.",
      });
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };

  const commercialSummary = useMemo(
    () =>
      `${settings.commercial.minCartTotalFcfa} ${settings.commercial.currencyLabel}`,
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

  const updateFboHelpTopic = useCallback((topicId, patch) => {
    setSettings((prev) => ({
      ...prev,
      fboHelp: {
        ...prev.fboHelp,
        topics: prev.fboHelp.topics.map((topic) =>
          topic.id === topicId ? { ...topic, ...patch } : topic,
        ),
      },
    }));
  }, []);

  const addFboHelpTopic = useCallback(() => {
    const topic = createCustomFboHelpTopic();
    setSettings((prev) => ({
      ...prev,
      fboHelp: {
        ...prev.fboHelp,
        topics: [...prev.fboHelp.topics, topic],
      },
    }));
    setToast({ message: "Rubrique personnalisée ajoutée", type: "success" });
  }, []);

  const removeFboHelpTopic = useCallback((topicId) => {
    setSettings((prev) => ({
      ...prev,
      fboHelp: {
        ...prev.fboHelp,
        topics: prev.fboHelp.topics.filter(
          (topic) => topic.id !== topicId || topic.type === "system",
        ),
      },
    }));
  }, []);

  const handleToggleCountry = useCallback(
    async (code, actif) => {
      if (!isSuperAdmin) {
        setToast({
          message: "Seul le super admin peut activer ou désactiver un pays.",
          type: "error",
        });
        return;
      }

      if (togglingCountry) return;
      if (
        !(await confirm({
          title: actif ? "Activer ce pays ?" : "Désactiver ce pays ?",
          message:
            "Cette action s’applique immédiatement au catalogue public de " +
            code +
            ".",
          confirmLabel: actif ? "Activer" : "Désactiver",
          tone: "warning",
        }))
      )
        return;
      setTogglingCountry(code);
      try {
        const updated = await settingsService.toggleCountry(code, actif);
        setCountriesList((prev) =>
          prev.map((c) =>
            c.code === updated.code ? { ...c, actif: updated.actif } : c,
          ),
        );
        setToast({
          message: `${updated.name} ${updated.actif ? "activé" : "désactivé"} pour les clients`,
          type: "success",
        });
      } catch (e) {
        setToast({
          message:
            e?.response?.data?.message || "Impossible de modifier ce pays.",
          type: "error",
        });
      } finally {
        setTogglingCountry(null);
      }
    },
    [isSuperAdmin, togglingCountry, confirm],
  );

  const resetToDefault = useCallback(async () => {
    const ok = await confirm({
      tone: "warning",
      title: "Restaurer les valeurs de cette rubrique",
      message:
        "Charger les valeurs par défaut de cette rubrique ? Les autres rubriques seront conservées. Enregistrez ensuite pour appliquer les changements.",
      confirmLabel: "Réinitialiser",
    });
    if (ok) {
      setSettings((prev) => resetSettingsSection(prev, activeTab));
      setToast({
        message: "Valeurs par défaut chargées. Enregistrez pour les appliquer.",
        type: "success",
      });
    }
  }, [confirm, activeTab]);

  return (
    <SettingsErrorContext.Provider value={fieldErrors}>
      <MotionConfig reducedMotion="user">
        <div className="space-y-6 pb-4">
          <AnimatePresence>
            {toast && (
              <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast(null)}
              />
            )}
          </AnimatePresence>

          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Paramètres
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Configuration du catalogue, des commandes et de la communication
                client.
              </p>
            </div>
            <label className="grid gap-1 text-xs font-medium text-gray-600">
              Pays configuré
              <select
                value={selectedCountryCode}
                onChange={(event) => changeCountry(event.target.value)}
                disabled={!isSuperAdmin || loading || saving}
                className="min-w-48 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900"
              >
                {(countriesList.length
                  ? countriesList.filter(
                      (country) =>
                        isSuperAdmin || country.code === selectedCountryCode,
                    )
                  : [{ code: selectedCountryCode, name: selectedCountryCode }]
                ).map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </label>
          </header>
          {countriesError ? (
            <div
              role="alert"
              className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
            >
              {countriesError}{" "}
              <button
                type="button"
                onClick={() => setCountriesReload((value) => value + 1)}
                className="underline"
              >
                Réessayer
              </button>
            </div>
          ) : null}
          {conflictError ? (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
            >
              <p>
                Un autre administrateur a modifié ces paramètres. Votre
                brouillon est conservé.
              </p>
              <button
                type="button"
                className="rounded-lg border border-amber-300 px-3 py-2 font-medium"
                onClick={async () => {
                  if (
                    await confirm({
                      title: "Recharger les paramètres ?",
                      message:
                        "Les valeurs enregistrées remplaceront votre brouillon. Copiez les modifications à conserver avant de continuer.",
                      confirmLabel: "Recharger",
                      tone: "warning",
                    })
                  ) {
                    setLoading(true);
                    setReload((value) => value + 1);
                  }
                }}
              >
                Recharger les valeurs enregistrées
              </button>
            </div>
          ) : null}
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="min-w-0 rounded-xl border border-gray-200 bg-white p-2 lg:sticky lg:top-4">
              <nav
                aria-label="Rubriques des paramètres"
                className="flex overflow-x-auto lg:block"
              >
                {TABS.filter((tab) => tab.key !== "history" || canWrite).map(
                  (tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        aria-current={
                          activeTab === tab.key ? "page" : undefined
                        }
                        onClick={() => setActiveTab(tab.key)}
                        className={
                          "flex min-w-max items-start gap-3 rounded-lg px-3 py-3 text-left lg:w-full " +
                          (activeTab === tab.key
                            ? "bg-gray-100 text-gray-900"
                            : "text-gray-600 hover:bg-gray-50")
                        }
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          <span className="block text-sm font-medium">
                            {tab.label}
                          </span>
                          <span className="hidden text-xs text-gray-500 lg:block">
                            {tab.description}
                          </span>
                        </span>
                      </button>
                    );
                  },
                )}
              </nav>
              <div className="mt-2 border-t border-gray-200 pt-2">
                {permissions.includes(Permission.USER_ADMIN) ? (
                  <Link
                    to="/settings/users"
                    className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Utilisateurs et accès ↗
                  </Link>
                ) : null}
                {permissions.includes(Permission.DISCOUNT_READ) ? (
                  <Link
                    to="/settings/grade-discounts"
                    className="block rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Remises par grade ↗
                  </Link>
                ) : null}
              </div>
            </aside>
            <main className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  {TABS.find((tab) => tab.key === activeTab)?.label}
                </h2>
                <span className="text-xs text-gray-500">
                  {activeTab === "sound-alerts"
                    ? "Préférences locales"
                    : selectedCountryCode}
                </span>
              </div>
              {activeTab !== "sound-alerts" && activeTab !== "history" ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-gray-500">
                    {version
                      ? "Dernière modification : " +
                        new Date(version).toLocaleString("fr-FR")
                      : "Configuration initiale"}
                  </p>
                  {canWrite && !loading && !loadError ? (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={resetToDefault}
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Restaurer cette rubrique
                    </button>
                  ) : null}
                </div>
              ) : null}
              {loading ? (
                <div
                  role="status"
                  className="rounded-xl border border-gray-200 bg-white p-12 text-center text-sm text-gray-500"
                >
                  Chargement des paramètres…
                </div>
              ) : loadError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"
                >
                  {loadError}
                  <button
                    type="button"
                    onClick={() => setReload((value) => value + 1)}
                    className="ml-3 underline"
                  >
                    Réessayer
                  </button>
                </div>
              ) : (
                <fieldset
                  disabled={
                    saving || (!canWrite && activeTab !== "sound-alerts")
                  }
                  className="min-w-0 space-y-6"
                >
                  {/* Contenu des onglets */}
                  <AnimatePresence mode="wait">
                    {activeTab === "countries" && (
                      <div className="space-y-6">
                        <Card
                          title="Coordonnées et points de vente"
                          description="Informations affichées aux clients de ce pays."
                        >
                          {" "}
                          <div className="grid gap-4 xl:grid-cols-2">
                            <Field
                              label="Téléphone support"
                              hint="Numéro affiché dans les communications"
                            >
                              <TextInput
                                value={settings.countries.supportPhone}
                                data-setting-key="countries.supportPhone"
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    countries: {
                                      ...prev.countries,
                                      supportPhone: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="+225 07 00 00 00 00"
                              />
                            </Field>
                            <Field
                              label="Point de vente par défaut"
                              hint="Ville ou agence utilisée pour les nouvelles précommandes du pays"
                            >
                              <TextInput
                                value={settings.countries.defaultPointDeVente}
                                data-setting-key="countries.defaultPointDeVente"
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    countries: {
                                      ...prev.countries,
                                      defaultPointDeVente: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="ABIDJAN, OUAGADOUGOU, LOME..."
                              />
                            </Field>
                          </div>
                          <div>
                            <Field
                              label="Adresse de retrait"
                              hint="Adresse physique du point de retrait"
                            >
                              <TextArea
                                rows={3}
                                value={settings.countries.pickupAddress}
                                data-setting-key="countries.pickupAddress"
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    countries: {
                                      ...prev.countries,
                                      pickupAddress: e.target.value,
                                    },
                                  }))
                                }
                                placeholder="Adresse ou point de retrait par défaut"
                              />
                            </Field>
                          </div>
                        </Card>
                        {isSuperAdmin ? (
                          <Card
                            title="Disponibilité des pays"
                            description="Ces changements sont appliqués immédiatement au catalogue public."
                          >
                            <div className="space-y-3">
                              {countriesList.map((country) => (
                                <div
                                  key={country.code}
                                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 p-3"
                                >
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {country.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {country.code} ·{" "}
                                      {country.actif
                                        ? "Visible pour les clients"
                                        : "Masqué aux clients"}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    disabled={
                                      Boolean(togglingCountry) || saving
                                    }
                                    onClick={() =>
                                      handleToggleCountry(
                                        country.code,
                                        !country.actif,
                                      )
                                    }
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium disabled:opacity-50"
                                  >
                                    {togglingCountry === country.code
                                      ? "Mise à jour…"
                                      : country.actif
                                        ? "Désactiver"
                                        : "Activer"}
                                  </button>
                                </div>
                              ))}
                            </div>
                          </Card>
                        ) : null}
                      </div>
                    )}
                    {activeTab === "payments" && (
                      <div className="space-y-6">
                        <p className="text-sm text-gray-500">
                          Les moyens activés seront proposés aux clients de{" "}
                          {selectedCountryCode}. Complétez les coordonnées avant
                          activation.
                        </p>{" "}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          <ToggleCard
                            label="Wave"
                            hint="Paiement mobile Wave"
                            checked={settings.countries.enableWave}
                            settingKey="countries.enableWave"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                countries: {
                                  ...prev.countries,
                                  enableWave: checked,
                                },
                              }))
                            }
                            icon={Smartphone}
                          />
                          <ToggleCard
                            label="Orange Money"
                            hint="Paiement mobile Orange"
                            checked={settings.countries.enableOrangeMoney}
                            settingKey="countries.enableOrangeMoney"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                countries: {
                                  ...prev.countries,
                                  enableOrangeMoney: checked,
                                },
                              }))
                            }
                            icon={Smartphone}
                          />
                          <ToggleCard
                            label="Espèces"
                            hint="Paiement en espèces"
                            checked={settings.countries.enableCash}
                            settingKey="countries.enableCash"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                countries: {
                                  ...prev.countries,
                                  enableCash: checked,
                                },
                              }))
                            }
                            icon={Banknote}
                          />
                          <ToggleCard
                            label="Virement bancaire"
                            hint="Virement classique"
                            checked={settings.countries.enableBankTransfer}
                            settingKey="countries.enableBankTransfer"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                countries: {
                                  ...prev.countries,
                                  enableBankTransfer: checked,
                                },
                              }))
                            }
                            icon={Building2}
                          />
                          <ToggleCard
                            label="Ecobank Pay"
                            hint="QR Ecobank avec dépôt de preuve"
                            checked={settings.countries.enableEcobankPay}
                            settingKey="countries.enableEcobankPay"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                countries: {
                                  ...prev.countries,
                                  enableEcobankPay: checked,
                                },
                              }))
                            }
                            icon={CreditCard}
                          />
                          <ToggleCard
                            label="PI SPI"
                            hint="QR PI SPI avec dépôt de preuve"
                            checked={settings.countries.enablePiSpi}
                            settingKey="countries.enablePiSpi"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                countries: {
                                  ...prev.countries,
                                  enablePiSpi: checked,
                                },
                              }))
                            }
                            icon={CreditCard}
                          />
                          <ToggleCard
                            label="Livraison"
                            hint="Livraison à domicile"
                            checked={settings.countries.enableDelivery}
                            settingKey="countries.enableDelivery"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                countries: {
                                  ...prev.countries,
                                  enableDelivery: checked,
                                },
                              }))
                            }
                            icon={Truck}
                          />
                          <ToggleCard
                            label="Retrait"
                            hint="Retrait en point de vente"
                            checked={settings.countries.enablePickup}
                            settingKey="countries.enablePickup"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                countries: {
                                  ...prev.countries,
                                  enablePickup: checked,
                                },
                              }))
                            }
                            icon={ShoppingCart}
                          />
                        </div>
                        {/* Section Ecobank Pay */}
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSections((prev) => ({
                                ...prev,
                                ecobank: !prev.ecobank,
                              }))
                            }
                            aria-expanded={Boolean(expandedSections.ecobank)}
                            className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-gray-900" />
                              <span className="font-semibold text-gray-900">
                                Paramètres Ecobank Pay
                              </span>
                            </div>
                            {expandedSections.ecobank ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedSections.ecobank && (
                              <Motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-5 border-t border-gray-200 grid gap-4 sm:grid-cols-2">
                                  <Field label="Nom marchand">
                                    <TextInput
                                      value={
                                        settings.countries
                                          .ecobankPayMerchantName
                                      }
                                      data-setting-key="countries.ecobankPayMerchantName"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            ecobankPayMerchantName:
                                              e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="FOREVER LIVING PRODUCT BF"
                                    />
                                  </Field>
                                  <Field label="ID marchand">
                                    <TextInput
                                      value={
                                        settings.countries.ecobankPayMerchantId
                                      }
                                      data-setting-key="countries.ecobankPayMerchantId"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            ecobankPayMerchantId:
                                              e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="858172371"
                                    />
                                  </Field>
                                  <Field label="Nom terminal">
                                    <TextInput
                                      value={
                                        settings.countries
                                          .ecobankPayTerminalName
                                      }
                                      data-setting-key="countries.ecobankPayTerminalName"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            ecobankPayTerminalName:
                                              e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="FOREVER LIVING PRODUCT BF"
                                    />
                                  </Field>
                                  <Field label="ID terminal">
                                    <TextInput
                                      value={
                                        settings.countries.ecobankPayTerminalId
                                      }
                                      data-setting-key="countries.ecobankPayTerminalId"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            ecobankPayTerminalId:
                                              e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="32629497"
                                    />
                                  </Field>
                                  <Field
                                    label="URL QR code"
                                    hint="Image publique du QR Ecobank Pay"
                                  >
                                    <TextInput
                                      value={
                                        settings.countries.ecobankPayQrImageUrl
                                      }
                                      data-setting-key="countries.ecobankPayQrImageUrl"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            ecobankPayQrImageUrl:
                                              e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="https://..."
                                    />
                                  </Field>
                                  <SettingsImagePreview
                                    key={
                                      settings.countries.ecobankPayQrImageUrl
                                    }
                                    url={
                                      settings.countries.ecobankPayQrImageUrl
                                    }
                                    label="Aperçu du QR de paiement"
                                  />
                                  <Field label="Instructions">
                                    <TextArea
                                      value={
                                        settings.countries
                                          .ecobankPayInstructions
                                      }
                                      data-setting-key="countries.ecobankPayInstructions"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            ecobankPayInstructions:
                                              e.target.value,
                                          },
                                        }))
                                      }
                                      rows={3}
                                      placeholder="Scannez le QR Ecobank Pay, payez le montant exact, puis déposez une capture."
                                    />
                                  </Field>
                                </div>
                              </Motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Section PI SPI */}
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSections((prev) => ({
                                ...prev,
                                piSpi: !prev.piSpi,
                              }))
                            }
                            aria-expanded={Boolean(expandedSections.piSpi)}
                            className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <CreditCard className="w-5 h-5 text-gray-900" />
                              <span className="font-semibold text-gray-900">
                                Paramètres PI SPI
                              </span>
                            </div>
                            {expandedSections.piSpi ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedSections.piSpi && (
                              <Motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-5 border-t border-gray-200 grid gap-4 sm:grid-cols-2">
                                  <Field label="Nom client / marchand">
                                    <TextInput
                                      value={
                                        settings.countries.piSpiMerchantName
                                      }
                                      data-setting-key="countries.piSpiMerchantName"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            piSpiMerchantName: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="FOREVER LIVING PRODUCTS CI"
                                    />
                                  </Field>
                                  <Field label="Alias PI SPI">
                                    <TextInput
                                      value={settings.countries.piSpiAlias}
                                      data-setting-key="countries.piSpiAlias"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            piSpiAlias: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="edf16237-6b72-4155-831a-f9cb64a30434"
                                    />
                                  </Field>
                                  <Field
                                    label="URL QR code"
                                    hint="Image publique du QR PI SPI"
                                  >
                                    <TextInput
                                      value={settings.countries.piSpiQrImageUrl}
                                      data-setting-key="countries.piSpiQrImageUrl"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            piSpiQrImageUrl: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="/QR%20code%20pi%20spi.png"
                                    />
                                  </Field>
                                  <SettingsImagePreview
                                    key={settings.countries.piSpiQrImageUrl}
                                    url={settings.countries.piSpiQrImageUrl}
                                    label="Aperçu du QR de paiement"
                                  />
                                  <Field label="Instructions">
                                    <TextArea
                                      value={
                                        settings.countries.piSpiInstructions
                                      }
                                      data-setting-key="countries.piSpiInstructions"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            piSpiInstructions: e.target.value,
                                          },
                                        }))
                                      }
                                      rows={3}
                                      placeholder="Scannez le QR PI SPI, vérifiez le bénéficiaire, payez le montant exact, puis déposez une capture."
                                    />
                                  </Field>
                                </div>
                              </Motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Section virement bancaire */}
                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedSections((prev) => ({
                                ...prev,
                                bank: !prev.bank,
                              }))
                            }
                            aria-expanded={Boolean(expandedSections.bank)}
                            className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Building2 className="w-5 h-5 text-gray-900" />
                              <span className="font-semibold text-gray-900">
                                Paramètres virement bancaire
                              </span>
                            </div>
                            {expandedSections.bank ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedSections.bank && (
                              <Motion.div
                                initial={{ height: 0 }}
                                animate={{ height: "auto" }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="p-5 border-t border-gray-200 grid gap-4 sm:grid-cols-2">
                                  <Field label="Libellé compte">
                                    <TextInput
                                      value={
                                        settings.countries.bankAccountLabel
                                      }
                                      data-setting-key="countries.bankAccountLabel"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            bankAccountLabel: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Compte principal FCFA"
                                    />
                                  </Field>
                                  <Field label="Banque">
                                    <TextInput
                                      value={settings.countries.bankName}
                                      data-setting-key="countries.bankName"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            bankName: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Nom de la banque"
                                    />
                                  </Field>
                                  <Field label="Numéro de compte">
                                    <TextInput
                                      value={
                                        settings.countries.bankAccountNumber
                                      }
                                      data-setting-key="countries.bankAccountNumber"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            bankAccountNumber: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="Ex: 1234567890"
                                    />
                                  </Field>
                                  <Field label="Titulaire du compte">
                                    <TextInput
                                      value={
                                        settings.countries.bankAccountHolder
                                      }
                                      data-setting-key="countries.bankAccountHolder"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            bankAccountHolder: e.target.value,
                                          },
                                        }))
                                      }
                                      placeholder="FOREVER LIVING PRODUCTS"
                                    />
                                  </Field>
                                  <Field label="IBAN (optionnel)">
                                    <TextInput
                                      value={settings.countries.bankIban}
                                      data-setting-key="countries.bankIban"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            bankIban: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </Field>
                                  <Field label="SWIFT/BIC (optionnel)">
                                    <TextInput
                                      value={settings.countries.bankSwift}
                                      data-setting-key="countries.bankSwift"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            bankSwift: e.target.value,
                                          },
                                        }))
                                      }
                                    />
                                  </Field>
                                  <Field label="Délai de paiement (heures)">
                                    <TextInput
                                      type="number"
                                      min="1"
                                      max="720"
                                      value={
                                        settings.countries.bankPaymentDueHours
                                      }
                                      data-setting-key="countries.bankPaymentDueHours"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            bankPaymentDueHours: Number(
                                              e.target.value || 72,
                                            ),
                                          },
                                        }))
                                      }
                                    />
                                  </Field>
                                  <Field label="Taille maximale de la preuve (Mo)">
                                    <TextInput
                                      type="number"
                                      min="1"
                                      max="8"
                                      value={
                                        settings.countries
                                          .bankProofMaxFileSizeMb
                                      }
                                      data-setting-key="countries.bankProofMaxFileSizeMb"
                                      onChange={(e) =>
                                        setSettings((prev) => ({
                                          ...prev,
                                          countries: {
                                            ...prev.countries,
                                            bankProofMaxFileSizeMb: Number(
                                              e.target.value || 8,
                                            ),
                                          },
                                        }))
                                      }
                                    />
                                  </Field>
                                </div>
                              </Motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}

                    {/* Règles commerciales */}
                    {activeTab === "commercial" && (
                      <Motion.div
                        key="commercial"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field
                            label="Panier minimum (FCFA)"
                            hint="Montant minimum pour valider une commande"
                          >
                            <TextInput
                              type="number"
                              min="0"
                              value={settings.commercial.minCartTotalFcfa}
                              data-setting-key="commercial.minCartTotalFcfa"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  commercial: {
                                    ...prev.commercial,
                                    minCartTotalFcfa: Number(
                                      e.target.value || 0,
                                    ),
                                  },
                                }))
                              }
                            />
                          </Field>

                          <Field
                            label="Quantité max par produit"
                            hint="Limite par ligne de commande"
                          >
                            <TextInput
                              type="number"
                              min="1"
                              max="999"
                              value={settings.commercial.maxQtyPerProduct}
                              data-setting-key="commercial.maxQtyPerProduct"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  commercial: {
                                    ...prev.commercial,
                                    maxQtyPerProduct: Number(
                                      e.target.value || 1,
                                    ),
                                  },
                                }))
                              }
                            />
                          </Field>

                          <Field
                            label="Frais d'emballage (FCFA)"
                            hint="Forfait fixe ajouté à chaque précommande soumise"
                          >
                            <TextInput
                              type="number"
                              min="0"
                              value={settings.commercial.packagingFeeFcfa}
                              data-setting-key="commercial.packagingFeeFcfa"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  commercial: {
                                    ...prev.commercial,
                                    packagingFeeFcfa: Number(
                                      e.target.value || 0,
                                    ),
                                  },
                                }))
                              }
                            />
                          </Field>

                          <Field label="Devise affichée">
                            <TextInput
                              value={settings.commercial.currencyLabel}
                              data-setting-key="commercial.currencyLabel"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  commercial: {
                                    ...prev.commercial,
                                    currencyLabel: e.target.value,
                                  },
                                }))
                              }
                            />
                          </Field>

                          <Field
                            label="Annulation auto après préfacturation"
                            hint={`Délai en minutes avant annulation automatique (${formatDurationFromMinutes(settings.commercial.preinvoicedAutoCancelAfterMinutes)}).`}
                          >
                            <TextInput
                              type="number"
                              min="1"
                              max="43200"
                              value={
                                settings.commercial
                                  .preinvoicedAutoCancelAfterMinutes
                              }
                              data-setting-key="commercial.preinvoicedAutoCancelAfterMinutes"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  commercial: {
                                    ...prev.commercial,
                                    preinvoicedAutoCancelAfterMinutes: Number(
                                      e.target.value || 1,
                                    ),
                                  },
                                }))
                              }
                            />
                          </Field>

                          <Field
                            label="Rappel auto après préfacturation"
                            hint={`Délai en minutes avant rappel (${formatDurationFromMinutes(settings.commercial.preinvoicedAutoReminderAfterMinutes)}). Le rappel doit partir avant l'annulation.`}
                          >
                            <TextInput
                              type="number"
                              min="1"
                              max="43199"
                              value={
                                settings.commercial
                                  .preinvoicedAutoReminderAfterMinutes
                              }
                              data-setting-key="commercial.preinvoicedAutoReminderAfterMinutes"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  commercial: {
                                    ...prev.commercial,
                                    preinvoicedAutoReminderAfterMinutes: Number(
                                      e.target.value || 1,
                                    ),
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <ToggleCard
                            label="Autoriser les nouvelles soumissions"
                            hint="Coupe uniquement l'envoi final de nouvelles précommandes. Le catalogue reste accessible."
                            checked={
                              settings.commercial.preorderSubmissionEnabled
                            }
                            settingKey="commercial.preorderSubmissionEnabled"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                commercial: {
                                  ...prev.commercial,
                                  preorderSubmissionEnabled: checked,
                                },
                              }))
                            }
                          />
                          <StatCard
                            icon={ShoppingCart}
                            label="Soumissions"
                            value={
                              settings.commercial.preorderSubmissionEnabled
                                ? "Ouvertes"
                                : "Fermées"
                            }
                            color={
                              settings.commercial.preorderSubmissionEnabled
                                ? "emerald"
                                : "gold"
                            }
                          />
                        </div>

                        {!settings.commercial.preorderSubmissionEnabled && (
                          <Field
                            label="Message de fermeture"
                            hint="Message affiché au client lorsque l'envoi final est temporairement fermé."
                          >
                            <TextArea
                              rows={3}
                              value={
                                settings.commercial
                                  .preorderSubmissionDisabledMessage
                              }
                              data-setting-key="commercial.preorderSubmissionDisabledMessage"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  commercial: {
                                    ...prev.commercial,
                                    preorderSubmissionDisabledMessage:
                                      e.target.value,
                                  },
                                }))
                              }
                            />
                          </Field>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <ToggleCard
                            label="Annonce publique FBO"
                            hint="Affiche une bannière informative sans bloquer les commandes."
                            checked={
                              settings.commercial.publicAnnouncementEnabled
                            }
                            settingKey="commercial.publicAnnouncementEnabled"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                commercial: {
                                  ...prev.commercial,
                                  publicAnnouncementEnabled: checked,
                                },
                              }))
                            }
                          />
                          <StatCard
                            icon={Bell}
                            label="Annonce"
                            value={
                              settings.commercial.publicAnnouncementEnabled
                                ? "Visible"
                                : "Masquée"
                            }
                            color={
                              settings.commercial.publicAnnouncementEnabled
                                ? "blue"
                                : "gold"
                            }
                          />
                        </div>

                        {settings.commercial.publicAnnouncementEnabled && (
                          <Field
                            label="Message d'annonce publique"
                            hint="Message affiché aux FBO sur le formulaire et le catalogue."
                          >
                            <TextArea
                              rows={3}
                              value={
                                settings.commercial.publicAnnouncementMessage
                              }
                              data-setting-key="commercial.publicAnnouncementMessage"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  commercial: {
                                    ...prev.commercial,
                                    publicAnnouncementMessage: e.target.value,
                                  },
                                }))
                              }
                              placeholder="Ex: Aujourd'hui, les commandes en présentiel seront servies jusqu'à 12h00..."
                            />
                          </Field>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                          <ToggleCard
                            label="Service fermé le samedi"
                            hint="Affiche un message d'avertissement aux clients lorsqu'ils visitent le formulaire un samedi."
                            checked={settings.commercial.closedOnSaturday}
                            settingKey="commercial.closedOnSaturday"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                commercial: {
                                  ...prev.commercial,
                                  closedOnSaturday: checked,
                                },
                              }))
                            }
                          />
                          <StatCard
                            icon={ShoppingCart}
                            label="Samedi"
                            value={
                              settings.commercial.closedOnSaturday
                                ? "Fermé"
                                : "Ouvert"
                            }
                            color={
                              settings.commercial.closedOnSaturday
                                ? "gold"
                                : "emerald"
                            }
                          />
                        </div>

                        <Field
                          label="Information sur les prix"
                          hint="Message affiché concernant les prix indicatifs"
                        >
                          <TextArea
                            rows={4}
                            value={settings.commercial.pricingDisclaimer}
                            data-setting-key="commercial.pricingDisclaimer"
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
                            data-setting-key="commercial.maxQtyPerProduct"
                            color="blue"
                          />
                          <StatCard
                            icon={Bell}
                            label="Annulation préfacture"
                            value={formatDurationFromMinutes(
                              settings.commercial
                                .preinvoicedAutoCancelAfterMinutes,
                            )}
                            color="gold"
                          />
                          <StatCard
                            icon={Bell}
                            label="Rappel auto"
                            value={formatDurationFromMinutes(
                              settings.commercial
                                .preinvoicedAutoReminderAfterMinutes,
                            )}
                            color="blue"
                          />
                        </div>
                      </Motion.div>
                    )}

                    {activeTab === "notifications" && (
                      <SettingsNotificationEditor
                        templates={settings.notifications.templates}
                        defaults={DEFAULT_SETTINGS.notifications.templates}
                        onSmsChange={setSmsTemplate}
                        onEmailChange={setEmailTemplate}
                        supportPhone={settings.countries.supportPhone}
                      />
                    )}

                    {/* Aide FBO */}
                    {activeTab === "fbo-help" && (
                      <Motion.div
                        key="fbo-help"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-blue-900">
                                Aide affichée côté FBO
                              </p>
                              <p className="mt-1 text-sm text-blue-800">
                                Activez uniquement les rubriques utiles au
                                client. Les rubriques désactivées restent
                                configurables ici mais ne sont pas visibles dans
                                l'application FBO.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={addFboHelpTopic}
                              className="inline-flex items-center gap-2 rounded-lg bg-[#FFC600] px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-[#e6b200]"
                            >
                              <Plus className="h-4 w-4" />
                              Ajouter une rubrique
                            </button>
                          </div>
                        </div>

                        <div className="grid gap-4">
                          {settings.fboHelp.topics.map((topic) => (
                            <div
                              key={topic.id}
                              className={`rounded-xl border p-4 transition ${
                                topic.enabled
                                  ? "border-gray-900 bg-[#fffdf4]"
                                  : "border-gray-200 bg-gray-50"
                              }`}
                            >
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-gray-900">
                                    {topic.label || topic.id}
                                  </div>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-gray-400">
                                    <span>{topic.id}</span>
                                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5">
                                      {topic.type === "custom"
                                        ? "personnalisée"
                                        : "système"}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <label className="inline-flex cursor-pointer items-center gap-3 rounded-full border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(topic.enabled)}
                                      onChange={(e) =>
                                        updateFboHelpTopic(topic.id, {
                                          enabled: e.target.checked,
                                        })
                                      }
                                      className="h-4 w-4 accent-[#FFC600]"
                                    />
                                    Visible FBO
                                  </label>
                                  {topic.type === "custom" ? (
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        const ok = await confirm({
                                          tone: "danger",
                                          title: "Supprimer la rubrique",
                                          message:
                                            "Supprimer cette rubrique personnalisée ?",
                                          confirmLabel: "Supprimer",
                                        });
                                        if (ok) removeFboHelpTopic(topic.id);
                                      }}
                                      className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Supprimer
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
                                <Field label="Titre de la rubrique">
                                  <TextInput
                                    value={topic.label || ""}
                                    onChange={(e) =>
                                      updateFboHelpTopic(topic.id, {
                                        label: e.target.value,
                                      })
                                    }
                                  />
                                </Field>
                                <Field
                                  label="Réponse affichée"
                                  hint="Variables possibles : {{countryLabel}}, {{supportPhone}}, {{pickupAddress}}"
                                >
                                  <TextArea
                                    rows={3}
                                    value={topic.answer || ""}
                                    onChange={(e) =>
                                      updateFboHelpTopic(topic.id, {
                                        answer: e.target.value,
                                      })
                                    }
                                  />
                                </Field>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Motion.div>
                    )}

                    {/* Alertes sonores */}
                    {activeTab === "sound-alerts" && (
                      <Motion.div
                        key="sound"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-6"
                      >
                        <p className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                          Ces préférences sont enregistrées automatiquement sur
                          ce navigateur. Elles ne modifient pas les paramètres
                          du pays.
                        </p>
                        <Field label="Espace de travail">
                          <select
                            value={soundWorkspace}
                            onChange={(event) =>
                              setSoundWorkspace(event.target.value)
                            }
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                          >
                            <option value="billing">Facturation</option>
                            <option value="cashier">Caisse</option>
                            <option value="preparation">Préparation</option>
                          </select>
                        </Field>
                        <ToggleCard
                          label="Activer les alertes sonores"
                          hint="Préférence de ce navigateur"
                          checked={sound.enabled}
                          onChange={sound.setEnabled}
                        />
                        <Field
                          label="Volume des alertes"
                          hint={Math.round(sound.volume * 100) + " %"}
                        >
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={sound.volume}
                            onChange={(event) =>
                              sound.setVolume(Number(event.target.value))
                            }
                            className="w-full accent-gray-900"
                          />
                        </Field>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <StatCard
                            icon={Volume2}
                            label="Alertes de cet espace"
                            value={sound.enabled ? "Activées" : "Désactivées"}
                            color={sound.enabled ? "emerald" : "gold"}
                          />
                          <StatCard
                            icon={Volume2}
                            label="Volume"
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
                            <Motion.button
                              type="button"
                              onClick={sound.unlockSound}
                              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Activer le son navigateur
                            </Motion.button>
                          )}
                          <Motion.button
                            type="button"
                            onClick={sound.testSound}
                            className="rounded-lg bg-[#FFC600] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#e6b200] shadow-md transition-all"
                          >
                            Tester l'alerte sonore
                          </Motion.button>
                        </div>
                      </Motion.div>
                    )}

                    {activeTab === "history" && canWrite ? (
                      <SettingsHistory
                        countryCode={selectedCountryCode}
                        updatedAt={version}
                      />
                    ) : null}

                    {/* Thème */}
                    {activeTab === "theme" && (
                      <Motion.div
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
                                data-setting-key="theme.primaryColor"
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    theme: {
                                      ...prev.theme,
                                      primaryColor: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <div
                                className="w-10 h-10 rounded-lg border shadow-sm"
                                style={{
                                  backgroundColor: settings.theme.primaryColor,
                                }}
                              />
                            </div>
                          </Field>

                          <Field label="Couleur secondaire">
                            <div className="flex items-center gap-3">
                              <TextInput
                                value={settings.theme.secondaryColor}
                                data-setting-key="theme.secondaryColor"
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    theme: {
                                      ...prev.theme,
                                      secondaryColor: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <div
                                className="w-10 h-10 rounded-lg border shadow-sm"
                                style={{
                                  backgroundColor:
                                    settings.theme.secondaryColor,
                                }}
                              />
                            </div>
                          </Field>

                          <Field label="Couleur sombre">
                            <div className="flex items-center gap-3">
                              <TextInput
                                value={settings.theme.darkColor}
                                data-setting-key="theme.darkColor"
                                onChange={(e) =>
                                  setSettings((prev) => ({
                                    ...prev,
                                    theme: {
                                      ...prev.theme,
                                      darkColor: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <div
                                className="w-10 h-10 rounded-lg border shadow-sm"
                                style={{
                                  backgroundColor: settings.theme.darkColor,
                                }}
                              />
                            </div>
                          </Field>

                          <Field label="Logo principal">
                            <TextInput
                              value={settings.theme.logoPath}
                              data-setting-key="theme.logoPath"
                              onChange={(e) =>
                                setSettings((prev) => ({
                                  ...prev,
                                  theme: {
                                    ...prev.theme,
                                    logoPath: e.target.value,
                                  },
                                }))
                              }
                            />
                          </Field>
                        </div>

                        <section className="rounded-xl border border-gray-200 bg-white p-5">
                          <h3 className="font-semibold text-gray-900">
                            Aperçu de l’identité visuelle
                          </h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Simulation du catalogue · Les changements ne sont
                            pas encore publiés.
                          </p>
                          <div className="mt-4 rounded-lg border border-gray-200 p-4">
                            <SettingsImagePreview
                              key={settings.theme.logoPath}
                              url={settings.theme.logoPath}
                              label="Logo du catalogue"
                            />
                            <div className="mt-3 flex flex-wrap gap-3">
                              <span
                                className="rounded-lg px-4 py-2 text-sm"
                                style={{
                                  backgroundColor: settings.theme.primaryColor,
                                  color: settings.theme.darkColor,
                                }}
                              >
                                Nouvelle précommande
                              </span>
                              <span
                                className="rounded-lg px-4 py-2 text-sm text-white"
                                style={{
                                  backgroundColor:
                                    settings.theme.secondaryColor,
                                }}
                              >
                                Commande prête
                              </span>
                            </div>
                          </div>
                        </section>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <ToggleCard
                            label="Slider actif"
                            hint="Affiche le slider marketing du catalogue"
                            checked={settings.theme.sliderEnabled}
                            settingKey="theme.sliderEnabled"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                theme: {
                                  ...prev.theme,
                                  sliderEnabled: checked,
                                },
                              }))
                            }
                          />
                          <ToggleCard
                            label="Panneaux latéraux actifs"
                            hint="Affiche les panneaux desktop du catalogue"
                            checked={settings.theme.sidePanelsEnabled}
                            settingKey="theme.sidePanelsEnabled"
                            onChange={(checked) =>
                              setSettings((prev) => ({
                                ...prev,
                                theme: {
                                  ...prev.theme,
                                  sidePanelsEnabled: checked,
                                },
                              }))
                            }
                          />
                        </div>
                      </Motion.div>
                    )}
                  </AnimatePresence>
                </fieldset>
              )}
            </main>
          </div>
          {canWrite && !loading && !loadError && dirty ? (
            <div className="sticky bottom-24 z-20 md:bottom-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-lg">
              <div>
                <p role="status" className="text-sm font-medium text-gray-900">
                  {dirty
                    ? "Modifications non enregistrées"
                    : "Tous les paramètres sont enregistrés"}
                </p>
                <p className="text-xs text-gray-500">
                  {selectedCountryCode} · {Object.keys(patch).length} champ(s)
                  modifié(s)
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={resetToDefault}
                  disabled={saving}
                  className="rounded-lg px-3 py-2 text-sm text-gray-500 disabled:opacity-50"
                >
                  Valeurs par défaut
                </button>
                <button
                  type="button"
                  onClick={discardChanges}
                  disabled={!dirty || saving}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={
                    !dirty ||
                    saving ||
                    conflictError ||
                    Object.keys(validationErrors).length > 0
                  }
                  className="rounded-lg bg-[#FFC600] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
              {Object.keys(fieldErrors).length ? (
                <p role="alert" className="w-full text-xs text-red-700">
                  {Object.values(fieldErrors)[0]}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </MotionConfig>
    </SettingsErrorContext.Provider>
  );
}
