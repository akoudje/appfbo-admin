import { foreverLogoUrl } from "../lib/assetUrls";
export const DEFAULT_SETTINGS = {
  countries: {
    supportPhone: "",
    pickupAddress: "",
    defaultPointDeVente: "",
    enableWave: true,
    enableOrangeMoney: true,
    enableCash: true,
    enableBankTransfer: true,
    enableEcobankPay: false,
    enablePiSpi: false,
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
    ecobankPayMerchantName: "",
    ecobankPayMerchantId: "",
    ecobankPayTerminalName: "",
    ecobankPayTerminalId: "",
    ecobankPayQrImageUrl: "",
    ecobankPayInstructions: "",
    piSpiAlias: "",
    piSpiMerchantName: "",
    piSpiQrImageUrl: "",
    piSpiInstructions: "",
  },
  commercial: {
    minCartTotalFcfa: 100,
    maxQtyPerProduct: 10,
    packagingFeeFcfa: 100,
    preinvoicedAutoCancelAfterHours: 2,
    preinvoicedAutoReminderAfterHours: 1,
    preinvoicedAutoCancelAfterMinutes: 120,
    preinvoicedAutoReminderAfterMinutes: 60,
    preorderSubmissionEnabled: true,
    preorderSubmissionDisabledMessage:
      "Les soumissions de précommandes sont temporairement suspendues. Vous pouvez continuer à consulter le catalogue et votre panier.",
    publicAnnouncementEnabled: false,
    publicAnnouncementMessage: "",
    closedOnSaturday: false,
    currencyLabel: "FCFA",
    pricingDisclaimer:
      "Les prix affichés sont indicatifs. Le montant final est confirmé par le facturier à partir de l'AS400.",
  },
  theme: {
    primaryColor: "#FFC600",
    secondaryColor: "#74AA50",
    darkColor: "#000000",
    logoPath: foreverLogoUrl,
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
          "FOREVER: Votre facture est prête. Code {{paymentCollectionCode}}. Montant {{totalFcfa}}F. Déposez votre preuve ici: {{bankProofUploadLink}}",
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
        INVOICE_WAVE: {
          subject: "FOREVER | Lien de paiement Wave {{preorderNumber}}",
          body: "Bonjour {{customerName}},\n\nVotre facture est disponible.\n\nRéférence facture: {{invoiceRef}}\nNuméro de commande: {{preorderNumber}}\nMontant à payer: {{totalFcfaLabel}}\nLien de paiement sécurisé: {{paymentLink}}\n\nPour toute assistance, contactez-nous au {{supportPhone}}.\n\nCordialement,\nService Client FOREVER",
        },
        INVOICE_BANK_TRANSFER: {
          subject: "FOREVER | Dépôt de preuve bancaire {{preorderNumber}}",
          body: "Bonjour {{customerName}},\n\nVotre facture est disponible pour paiement par virement bancaire.\n\nRéférence facture: {{invoiceRef}}\nNuméro de commande: {{preorderNumber}}\nMontant à payer: {{totalFcfaLabel}}\n{{bankAccountLine}}\nLien sécurisé de dépôt de preuve: {{bankProofUploadLink}}\n\nPour toute assistance, contactez-nous au {{supportPhone}}.\n\nCordialement,\nService Client FOREVER",
        },
        ORDER_READY: {
          subject: "FOREVER | Colis prêt - Commande {{preorderNumber}}",
          body: "Bonjour {{customerName}},\n\nVotre colis est prêt au retrait.\n\nRéférence colis: {{parcelNumber}}\nCode de retrait: {{pickupCode}}\nPoint de retrait: {{pickupAddress}}\n\nMerci de présenter ce code au comptoir.\n\nCordialement,\nService Client FOREVER",
        },
        PREPARATION_STARTED: {
          subject:
            "FOREVER | Préparation en cours - Commande {{preorderNumber}}",
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
  fboHelp: {
    topics: [
      {
        id: "country",
        enabled: true,
        label: "Quel catalogue est affiché ?",
        answer:
          "Le catalogue dépend du pays choisi à l'étape 1. Les produits, prix, stocks et moyens de paiement sont chargés pour ce pays.",
      },
      {
        id: "new-order",
        enabled: true,
        label: "Faire une nouvelle précommande",
        answer:
          "Pour refaire une précommande, revenez à l'étape 1. Si l'ancien panier reste affiché, utilisez Nouvelle précommande.",
      },
      {
        id: "cache",
        enabled: true,
        label: "Anciennes informations affichées",
        answer:
          "Si le téléphone affiche encore les anciennes informations, réinitialisez la précommande en cours puis recommencez depuis l'étape 1.",
      },
      {
        id: "payment",
        enabled: false,
        label: "Paiement et lien reçu",
        answer:
          "Après traitement, vous recevez une notification avec les instructions de paiement.",
      },
      {
        id: "payment-link-missing",
        enabled: true,
        label: "Je n'ai pas reçu mon lien de paiement",
        answer:
          "Renseignez les informations de votre commande. L'équipe vérifiera votre demande avant de renvoyer le lien.",
      },
      {
        id: "status",
        enabled: false,
        label: "Voir mes commandes",
        answer:
          "Ouvrez l'espace client avec votre téléphone pour consulter vos commandes et leur statut.",
      },
      {
        id: "pickup",
        enabled: false,
        label: "Retrait de commande",
        answer:
          "Le retrait se fait selon les informations confirmées après paiement.",
      },
      {
        id: "pickup-code-missing",
        enabled: true,
        label: "Je n'ai pas reçu mon code de retrait",
        answer:
          "Renseignez les informations de votre commande. Si le colis est prêt, le code sera renvoyé automatiquement sur le numéro de commande.",
      },
      {
        id: "support",
        enabled: false,
        label: "Contacter le support",
        answer:
          "Si vous êtes bloqué, contactez le support avec votre numéro FBO et votre code de précommande.",
      },
    ],
  },
  soundAlerts: {
    forceEnabled: true,
    forceVolumePercent: 100,
  },
};

export function settingsFromApi(data = {}) {
  const prev = structuredClone(DEFAULT_SETTINGS);
  return {
    ...prev,
    countries: {
      ...prev.countries,
      supportPhone: data.supportPhone || "",
      pickupAddress: data.pickupAddress || "",
      defaultPointDeVente: data.defaultPointDeVente || "",
      enableWave: Boolean(data.enableWave),
      enableOrangeMoney: Boolean(data.enableOrangeMoney),
      enableCash: Boolean(data.enableCash),
      enableBankTransfer: data.enableBankTransfer ?? true,
      enableEcobankPay: Boolean(data.enableEcobankPay),
      enablePiSpi: Boolean(data.enablePiSpi),
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
      ecobankPayMerchantName: data.ecobankPayMerchantName || "",
      ecobankPayMerchantId: data.ecobankPayMerchantId || "",
      ecobankPayTerminalName: data.ecobankPayTerminalName || "",
      ecobankPayTerminalId: data.ecobankPayTerminalId || "",
      ecobankPayQrImageUrl: data.ecobankPayQrImageUrl || "",
      ecobankPayInstructions: data.ecobankPayInstructions || "",
      piSpiAlias: data.piSpiAlias || "",
      piSpiMerchantName: data.piSpiMerchantName || "",
      piSpiQrImageUrl: data.piSpiQrImageUrl || "",
      piSpiInstructions: data.piSpiInstructions || "",
    },
    commercial: {
      ...prev.commercial,
      minCartTotalFcfa: data.minCartFcfa ?? prev.commercial.minCartTotalFcfa,
      maxQtyPerProduct:
        data.maxQtyPerProduct ?? prev.commercial.maxQtyPerProduct,
      packagingFeeFcfa:
        data.packagingFeeFcfa ?? prev.commercial.packagingFeeFcfa,
      preinvoicedAutoCancelAfterHours:
        data.preinvoicedAutoCancelAfterHours ??
        prev.commercial.preinvoicedAutoCancelAfterHours,
      preinvoicedAutoReminderAfterHours:
        data.preinvoicedAutoReminderAfterHours ??
        prev.commercial.preinvoicedAutoReminderAfterHours,
      preinvoicedAutoCancelAfterMinutes:
        data.preinvoicedAutoCancelAfterMinutes ??
        (data.preinvoicedAutoCancelAfterHours
          ? data.preinvoicedAutoCancelAfterHours * 60
          : prev.commercial.preinvoicedAutoCancelAfterMinutes),
      preinvoicedAutoReminderAfterMinutes:
        data.preinvoicedAutoReminderAfterMinutes ??
        (data.preinvoicedAutoReminderAfterHours
          ? data.preinvoicedAutoReminderAfterHours * 60
          : prev.commercial.preinvoicedAutoReminderAfterMinutes),
      preorderSubmissionEnabled:
        data.preorderSubmissionEnabled ??
        prev.commercial.preorderSubmissionEnabled,
      preorderSubmissionDisabledMessage:
        data.preorderSubmissionDisabledMessage ||
        prev.commercial.preorderSubmissionDisabledMessage,
      publicAnnouncementEnabled:
        data.publicAnnouncementEnabled ??
        prev.commercial.publicAnnouncementEnabled,
      publicAnnouncementMessage:
        data.publicAnnouncementMessage ??
        prev.commercial.publicAnnouncementMessage,
      closedOnSaturday:
        data.closedOnSaturday ?? prev.commercial.closedOnSaturday,
      currencyLabel: data.currencyLabel ?? prev.commercial.currencyLabel,
      pricingDisclaimer:
        data.pricingDisclaimer ?? prev.commercial.pricingDisclaimer,
    },
    theme: {
      ...prev.theme,
      primaryColor: data.themePrimaryColor ?? prev.theme.primaryColor,
      secondaryColor: data.themeSecondaryColor ?? prev.theme.secondaryColor,
      darkColor: data.themeDarkColor ?? prev.theme.darkColor,
      logoPath: data.themeLogoPath ?? prev.theme.logoPath,
      sliderEnabled: data.themeSliderEnabled ?? prev.theme.sliderEnabled,
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
    fboHelp: {
      topics: Array.isArray(data?.fboHelpTopics)
        ? data.fboHelpTopics
        : prev.fboHelp.topics,
    },
  };
}
export function settingsToApi(settings) {
  return {
    minCartFcfa: settings.commercial.minCartTotalFcfa,
    maxQtyPerProduct: settings.commercial.maxQtyPerProduct,
    packagingFeeFcfa: settings.commercial.packagingFeeFcfa,
    preinvoicedAutoCancelAfterHours:
      settings.commercial.preinvoicedAutoCancelAfterHours,
    preinvoicedAutoReminderAfterHours:
      settings.commercial.preinvoicedAutoReminderAfterHours,
    preinvoicedAutoCancelAfterMinutes:
      settings.commercial.preinvoicedAutoCancelAfterMinutes,
    preinvoicedAutoReminderAfterMinutes:
      settings.commercial.preinvoicedAutoReminderAfterMinutes,
    preorderSubmissionEnabled: settings.commercial.preorderSubmissionEnabled,
    preorderSubmissionDisabledMessage:
      settings.commercial.preorderSubmissionDisabledMessage,
    publicAnnouncementEnabled: settings.commercial.publicAnnouncementEnabled,
    publicAnnouncementMessage: settings.commercial.publicAnnouncementMessage,
    closedOnSaturday: settings.commercial.closedOnSaturday,
    supportPhone: settings.countries.supportPhone,
    pickupAddress: settings.countries.pickupAddress,
    defaultPointDeVente: settings.countries.defaultPointDeVente,
    enableWave: settings.countries.enableWave,
    enableOrangeMoney: settings.countries.enableOrangeMoney,
    enableCash: settings.countries.enableCash,
    enableBankTransfer: settings.countries.enableBankTransfer,
    enableEcobankPay: settings.countries.enableEcobankPay,
    enablePiSpi: settings.countries.enablePiSpi,
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
    ecobankPayMerchantName: settings.countries.ecobankPayMerchantName,
    ecobankPayMerchantId: settings.countries.ecobankPayMerchantId,
    ecobankPayTerminalName: settings.countries.ecobankPayTerminalName,
    ecobankPayTerminalId: settings.countries.ecobankPayTerminalId,
    ecobankPayQrImageUrl: settings.countries.ecobankPayQrImageUrl,
    ecobankPayInstructions: settings.countries.ecobankPayInstructions,
    piSpiAlias: settings.countries.piSpiAlias,
    piSpiMerchantName: settings.countries.piSpiMerchantName,
    piSpiQrImageUrl: settings.countries.piSpiQrImageUrl,
    piSpiInstructions: settings.countries.piSpiInstructions,
    currencyLabel: settings.commercial.currencyLabel,
    pricingDisclaimer: settings.commercial.pricingDisclaimer,
    themePrimaryColor: settings.theme.primaryColor,
    themeSecondaryColor: settings.theme.secondaryColor,
    themeDarkColor: settings.theme.darkColor,
    themeLogoPath: settings.theme.logoPath,
    themeSliderEnabled: settings.theme.sliderEnabled,
    themeSidePanelsEnabled: settings.theme.sidePanelsEnabled,
    notificationTemplates: settings.notifications.templates,
    fboHelpTopics: settings.fboHelp.topics,
  };
}
export function settingsPatch(settings, baseline) {
  const current = settingsToApi(settings),
    original = settingsToApi(baseline);
  return Object.fromEntries(
    Object.entries(current).filter(
      ([key, value]) => JSON.stringify(value) !== JSON.stringify(original[key]),
    ),
  );
}

export function resetSettingsSection(settings, section) {
  const next = structuredClone(settings),
    defaults = structuredClone(DEFAULT_SETTINGS);
  const contacts = ["supportPhone", "pickupAddress", "defaultPointDeVente"];
  if (section === "countries" || section === "payments")
    for (const [key, value] of Object.entries(defaults.countries)) {
      if (contacts.includes(key) === (section === "countries"))
        next.countries[key] = value;
    }
  else {
    const key = section === "fbo-help" ? "fboHelp" : section;
    if (defaults[key]) next[key] = defaults[key];
  }
  return next;
}
