// src/pages/OrderDetailPage.jsx
// Page de détail d'une commande, affichant les informations principales de la commande,
// son statut, et proposant des onglets pour voir les détails, la facturation, le paiement,
// la préparation, le fulfillment, l'historique et le workflow de la commande.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ordersService } from "../services/ordersService";
import { as400GatewayService } from "../services/as400GatewayService";
import { list as listProducts } from "../services/productsService";
import RequirePermission from "../components/auth/RequirePermission";
import { AdminRole, Permission } from "../auth/permissions";
import { usePermission } from "../hooks/usePermission";
import useAdminAuth from "../hooks/useAdminAuth";
import { getDefaultOrderTabForRole, getOrderTabsForRole } from "../auth/workspaces";

import OrderDetailTabs from "../components/orders/detail/OrderDetailTabs";
import OrderOverviewTab from "../components/orders/detail/OrderOverviewTab";
import OrderBillingTab from "../components/orders/detail/OrderBillingTab";
import OrderPaymentTab from "../components/orders/detail/OrderPaymentTab";
import OrderPreparationTab from "../components/orders/detail/OrderPreparationTab";
import OrderFulfillmentTab from "../components/orders/detail/OrderFulfillmentTab";
import OrderHistoryTab from "../components/orders/detail/OrderHistoryTab";
import OrderCancelPanel from "../components/orders/detail/OrderCancelPanel";
import OrderWorkflowTab from "../components/orders/detail/OrderWorkflowTab";

function normalizeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function formatFcfa(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function humanizeEnum(value) {
  if (!value) return "—";
  return String(value)
    .trim()
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function isLateWaveReviewOrder(order) {
  const status = String(order?.status || "").trim().toUpperCase();
  const paymentStatus = String(order?.paymentStatus || "").trim().toUpperCase();
  const billingWorkStatus = String(order?.billingWorkStatus || "").trim().toUpperCase();
  const paymentProvider = String(order?.paymentProvider || "").trim().toUpperCase();
  const paymentMode = String(
    order?.preorderPaymentMode || order?.paymentMode || "",
  )
    .trim()
    .toUpperCase();

  return (
    status === "CANCELLED" &&
    paymentStatus === "PAID" &&
    billingWorkStatus === "ESCALATED" &&
    (paymentProvider === "WAVE" || paymentMode === "WAVE")
  );
}

function Alert({ tone = "red", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    gray: "border-gray-200 bg-gray-50 text-gray-900",
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone] || tones.red}`}>
      {title ? <div className="mb-1 text-sm font-semibold">{title}</div> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
    SUBMITTED: "bg-blue-100 text-blue-700 border-blue-200",
    INVOICED: "bg-indigo-100 text-indigo-700 border-indigo-200",
    PAYMENT_PROOF_RECEIVED: "bg-amber-100 text-amber-700 border-amber-200",
    PAYMENT_PENDING: "bg-amber-100 text-amber-700 border-amber-200",
    PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
    READY: "bg-teal-100 text-teal-700 border-teal-200",
    FULFILLED: "bg-green-100 text-green-700 border-green-200",
    CANCELLED: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
        map[status] || map.DRAFT
      }`}
    >
      {status || "—"}
    </span>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-900 break-all">
        {value ?? "—"}
      </span>
    </div>
  );
}

function AccessDeniedPanel({ message }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waveLoading, setWaveLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || getDefaultOrderTabForRole(role),
  );

  const [invoiceRef, setInvoiceRef] = useState("");
  const [invoiceWaTo, setInvoiceWaTo] = useState("");
  const [invoiceEmail, setInvoiceEmail] = useState("");
  const [invoiceGrade, setInvoiceGrade] = useState("");
  const [invoiceAmountFcfa, setInvoiceAmountFcfa] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");
  const [relaunchPaymentMinutes, setRelaunchPaymentMinutes] = useState("10");
  const [relaunchPaymentNote, setRelaunchPaymentNote] = useState("");
  const [relaunchPaymentAsCash, setRelaunchPaymentAsCash] = useState(false);
  const [invoicePreview, setInvoicePreview] = useState(null);
  const [invoicePreviewLoading, setInvoicePreviewLoading] = useState(false);

  const [proofUrl, setProofUrl] = useState("");
  const [proofRef, setProofRef] = useState("");
  const [proofNote, setProofNote] = useState("");

  const [verifyNote, setVerifyNote] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [cashReceiptNumber, setCashReceiptNumber] = useState("");
  const [cashDeskLabel, setCashDeskLabel] = useState("");
  const [cashAmountReceivedFcfa, setCashAmountReceivedFcfa] = useState("");
  const [packingNote, setPackingNote] = useState("");

  const [deliveryTracking, setDeliveryTracking] = useState("");
  const [pickupCode, setPickupCode] = useState("");
  const [pickupPointLabel, setPickupPointLabel] = useState("");
  const [deliveryCarrier, setDeliveryCarrier] = useState("");
  const [fulfillmentMode, setFulfillmentMode] = useState("");
  const [fulfillNote, setFulfillNote] = useState("");
  const [pickupRecipientType, setPickupRecipientType] = useState("CUSTOMER");
  const [pickupRecipientName, setPickupRecipientName] = useState("");
  const [pickupRecipientPhone, setPickupRecipientPhone] = useState("");
  const [pickupConfirmationNote, setPickupConfirmationNote] = useState("");

  const [cancelReason, setCancelReason] = useState("");

  const [messages, setMessages] = useState([]);
  const [as400Requests, setAs400Requests] = useState([]);
  const [replacementProducts, setReplacementProducts] = useState([]);
  const [replacementQuery, setReplacementQuery] = useState("");
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [replacingItemId, setReplacingItemId] = useState("");

  const load = async (options = {}) => {
    const preserveFormDrafts = Boolean(options.preserveFormDrafts);
    const silent = Boolean(options.silent);

    try {
      if (!silent) setLoading(true);
      setError("");

      const [data, messageData, as400Data] = await Promise.all([
        ordersService.getById(id),
        ordersService.getMessages(id).catch(() => []),
        as400GatewayService
          .listRequests({ preorderId: id, take: 10 })
          .catch(() => ({ items: [] })),
      ]);

      setOrder(data);
      setMessages(Array.isArray(messageData) ? messageData : []);
      setAs400Requests(Array.isArray(as400Data?.items) ? as400Data.items : []);

      if (!preserveFormDrafts) {
        setInvoiceRef(data?.factureReference || "");
        setInvoiceWaTo(data?.factureWhatsappTo || "");
        setInvoiceEmail(data?.fboEmail || "");
        setInvoiceGrade(data?.billingGrade || data?.fboGrade || "");
        setInvoiceAmountFcfa(
          data?.as400InvoiceTotalFcfa !== null &&
          data?.as400InvoiceTotalFcfa !== undefined
            ? String(data.as400InvoiceTotalFcfa)
            : "",
        );
        setPaymentLink(data?.paymentLink || "");
        setInvoicePreview(null);

        setProofUrl(data?.manualPaymentProofUrl || data?.paymentProofUrl || "");
        setProofRef(data?.manualPaymentReference || data?.paymentRef || "");
        setProofNote(
          data?.manualPaymentProofNote || data?.paymentProofNote || "",
        );

        setPackingNote(data?.packingNote || "");
        setDeliveryTracking(data?.deliveryTracking || "");
        setPickupCode("");

        setVerifyNote("");
        setCashNote("");
        setCashReceiptNumber("");
        setCashDeskLabel("");
        setCashAmountReceivedFcfa("");
        setFulfillNote("");
        setPickupPointLabel(data?.pickupPointLabel || "");
        setDeliveryCarrier(data?.deliveryCarrier || "");
        setFulfillmentMode(data?.fulfillmentMode || "");
        setPickupRecipientType(data?.pickupRecipientType || "CUSTOMER");
        setPickupRecipientName(data?.pickupRecipientName || data?.fboNomComplet || "");
        setPickupRecipientPhone(data?.pickupRecipientPhone || "");
        setPickupConfirmationNote(data?.pickupConfirmationNote || "");
        setInvoiceNote("");
        setCancelReason("");
      }
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de charger la commande",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const next = searchParams.get("tab") || getDefaultOrderTabForRole(role);
    if (next !== activeTab) {
      setActiveTab(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, role]);

  const setTab = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tabKey);
      return next;
    });
  };

  const status = order?.status;
  const paymentStatus = order?.paymentStatus;
  const canAccessBilling = usePermission(Permission.INVOICE_CREATE);
  const canAccessPayment = usePermission(Permission.PAYMENT_VALIDATE);
  const canAccessPreparation = usePermission(Permission.PREPARATION_UPDATE);
  const canAccessCancel = usePermission(Permission.PREORDER_UPDATE_STATUS);

  const preorderNumber =
    order?.preorderNumber || (order?.id ? `#${order.id.slice(-8)}` : "—");

  const paymentModeRaw = String(
    order?.preorderPaymentMode || order?.paymentMode || "",
  )
    .trim()
    .toUpperCase();

  const paymentProviderRaw = String(order?.paymentProvider || "")
    .trim()
    .toUpperCase();

  const isCash =
    paymentModeRaw.includes("ESPE") ||
    paymentModeRaw.includes("CASH") ||
    paymentProviderRaw === "MANUAL";

  const isWave =
    paymentProviderRaw === "WAVE" ||
    paymentModeRaw.includes("MOBILE") ||
    paymentModeRaw.includes("WAVE") ||
    paymentModeRaw.includes("MOMO");

  const isAutoPayment = !isCash && isWave;
  const isGlobalAdmin =
    role === AdminRole.SUPER_ADMIN || role === AdminRole.TECH_ADMIN;
  const canSwitchPaymentToCash =
    isGlobalAdmin &&
    (isWave || paymentModeRaw === "BANK_TRANSFER" || paymentModeRaw === "ECOBANK_PAY" || paymentModeRaw === "PI_SPI") &&
    ["SUBMITTED", "INVOICED", "PAYMENT_PENDING", "PAYMENT_PROOF_RECEIVED"].includes(
      status,
    );
  const canSwitchPaymentToWave =
    isGlobalAdmin &&
    isCash &&
    paymentStatus !== "PAID" &&
    ["INVOICED", "PAYMENT_PENDING"].includes(status);
  const canFulfillNoNotification =
    [AdminRole.SUPER_ADMIN, AdminRole.TECH_ADMIN, AdminRole.OPERATIONS_DIRECTOR].includes(
      role,
    ) && ["PAID", "READY"].includes(status);

  useEffect(() => {
    if (!order) return;
    if (!["INVOICED", "PAYMENT_PENDING"].includes(status)) return;
    if (!isWave) return;

    const timer = setInterval(() => {
      load({ preserveFormDrafts: true, silent: true });
    }, 10000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isWave, order?.id]);

  const canInvoice = status === "SUBMITTED";
  const canEnqueueAs400Request = canAccessBilling && status === "SUBMITTED";
  const canCorrectAs400Invoice =
    canAccessBilling &&
    Boolean(order?.factureReference || order?.invoicedAt) &&
    paymentStatus !== "PAID" &&
    !["PAID", "READY", "FULFILLED", "CANCELLED"].includes(status);
  const canRelaunchPayment = useMemo(() => {
    if (status !== "CANCELLED" || paymentStatus === "PAID") return false;
    const logs = Array.isArray(order?.logs) ? order.logs : [];
    const hasAutoCancelLog = logs.some(
      (log) =>
        String(log?.action || "").toUpperCase() === "CANCEL" &&
        String(log?.meta?.mode || "").toUpperCase() ===
          "AUTO_CANCEL_UNPAID_AFTER_EXPIRY_WINDOW",
    );
    const reason = String(order?.cancelReason || "").toLowerCase();
    return (
      hasAutoCancelLog ||
      (reason.includes("automatique") && reason.includes("sans paiement"))
    );
  }, [order?.cancelReason, order?.logs, paymentStatus, status]);
  const canReplaceBillingItems =
    canAccessBilling &&
    ["SUBMITTED", "INVOICED", "PAYMENT_PENDING", "PAYMENT_PROOF_RECEIVED"].includes(
      status,
    );
  const canProof =
    status === "INVOICED" && !isCash && !isWave && !isAutoPayment;
  const canVerify =
    ["PAYMENT_PENDING", "PAYMENT_PROOF_RECEIVED", "INVOICED"].includes(
      status,
    ) && paymentStatus !== "PAID";
  const canPrepare = status === "PAID" && Boolean(order?.preparationLaunchedAt);
  const canFulfill = status === "READY";
  const canCancel = !!status && !["FULFILLED", "CANCELLED"].includes(status);
  const canCashPay =
    isCash &&
    ["SUBMITTED", "INVOICED", "PAYMENT_PENDING"].includes(status) &&
    !saving;

  const emptyOrder = useMemo(() => {
    const itemCount = Array.isArray(order?.items) ? order.items.length : 0;
    const total = Number(order?.totalFcfa || 0);
    return itemCount === 0 || total === 0;
  }, [order]);

  const stockDebited = Boolean(order?.stockDeductedAt);
  const stockRestored = Boolean(order?.stockRestoredAt);

  const stockSummary = useMemo(() => {
    const movements = Array.isArray(order?.stockMovements)
      ? order.stockMovements
      : [];

    const debits = movements.filter((m) => m.type === "DEBIT");
    const credits = movements.filter((m) => m.type === "CREDIT");

    return {
      movements,
      debitQty: debits.reduce((sum, m) => sum + Number(m.qty || 0), 0),
      creditQty: credits.reduce((sum, m) => sum + Number(m.qty || 0), 0),
    };
  }, [order]);

  const steps = useMemo(() => {
    if (!order) return [];

    const flow = isCash
      ? ["SUBMITTED", "INVOICED", "PAID", "READY", "FULFILLED"]
      : [
          "SUBMITTED",
          "INVOICED",
          "PAYMENT_PENDING",
          "PAID",
          "READY",
          "FULFILLED",
        ];

    const done = (name) => {
      const idx = flow.indexOf(name);
      const cur = flow.indexOf(order.status);
      return cur >= idx && cur !== -1;
    };

    const base = [
      { key: "SUBMITTED", label: "Soumise", at: order?.submittedAt },
      { key: "INVOICED", label: "Préfacture", at: order?.invoicedAt },
    ];

    const proof = isCash
      ? []
      : [
          {
            key: "PAYMENT_PENDING",
            label: isWave ? "Wave en attente" : "Paiement en attente",
            at:
              order?.manualPaymentReceivedAt ||
              order?.proofReceivedAt ||
              order?.activePayment?.initiatedAt,
          },
        ];

    const tail = [
      { key: "PAID", label: "Paiement OK", at: order?.paidAt },
      { key: "READY", label: "Colis prêt", at: order?.preparedAt },
      { key: "FULFILLED", label: "Clôturée", at: order?.fulfilledAt },
    ];

    return [...base, ...proof, ...tail].map((st) => ({
      ...st,
      done: done(st.key),
    }));
  }, [order, isCash, isWave]);

  const billingMessage = useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) return null;

    return (
      messages.find((m) => ["INVOICE", "PAYMENT_LINK"].includes(m?.purpose)) ||
      null
    );
  }, [messages]);

  const billingNotificationState = useMemo(() => {
    const items = Array.isArray(messages) ? messages : [];
    const relevant = items.filter((message) =>
      ["INVOICE", "PAYMENT_LINK", "REMINDER"].includes(
        String(message?.purpose || "").toUpperCase(),
      ),
    );
    const latestByChannel = (channel) =>
      relevant.find(
        (message) => String(message?.channel || "").toUpperCase() === channel,
      ) || null;

    return {
      sms: latestByChannel("SMS"),
      email: latestByChannel("EMAIL"),
    };
  }, [messages]);

  const showReinvoiceHint = useMemo(() => {
    if (status !== "SUBMITTED") return false;
    const logs = Array.isArray(order?.logs) ? order.logs : [];
    const replacementLog = logs.find(
      (log) =>
        log?.action === "REPRICE" &&
        Boolean(log?.meta?.requiresReinvoice),
    );
    if (!replacementLog) return false;

    const replacementAt = new Date(replacementLog.createdAt || 0).getTime();
    if (!Number.isFinite(replacementAt)) return true;

    const hasNewerInvoice = logs.some((log) => {
      if (log?.action !== "INVOICE") return false;
      const invoiceAt = new Date(log.createdAt || 0).getTime();
      return Number.isFinite(invoiceAt) && invoiceAt > replacementAt;
    });

    return !hasNewerInvoice;
  }, [order?.logs, status]);

  const showLateWaveReviewAlert = useMemo(
    () => isLateWaveReviewOrder(order),
    [order],
  );

  const availableTabs = useMemo(() => {
    return getOrderTabsForRole(role, canAccessCancel, order?.status).filter((tab) => {
      if (tab.key === "billing") return canAccessBilling;
      if (tab.key === "payment") return canAccessPayment;
      if (tab.key === "preparation" || tab.key === "fulfillment") return canAccessPreparation;
      if (tab.key === "cancel") return canAccessCancel;
      return true;
    });
  }, [role, canAccessBilling, canAccessCancel, canAccessPayment, canAccessPreparation, order?.status]);

  useEffect(() => {
    if (!availableTabs.some((tab) => tab.key === activeTab)) {
      const fallback =
        availableTabs.find((tab) => tab.key === getDefaultOrderTabForRole(role))
          ?.key || availableTabs[0]?.key;
      if (fallback) setTab(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTabs, activeTab, role]);

  useEffect(() => {
    let cancelled = false;

    if (
      !order?.id ||
      !canAccessBilling ||
      !invoiceGrade ||
      (!canInvoice && !canCorrectAs400Invoice)
    ) {
      setInvoicePreview(null);
      setInvoicePreviewLoading(false);
      return undefined;
    }

    setInvoicePreviewLoading(true);

    ordersService
      .getInvoicePreview(order.id, {
        fboGrade: invoiceGrade,
        invoiceAmountFcfa,
        factureReference: invoiceRef,
      })
      .then((data) => {
        if (!cancelled) {
          setInvoicePreview(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setInvoicePreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setInvoicePreviewLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    canAccessBilling,
    canCorrectAs400Invoice,
    canInvoice,
    invoiceAmountFcfa,
    invoiceGrade,
    invoiceRef,
    order?.id,
  ]);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    if (!canReplaceBillingItems) {
      setReplacementProducts([]);
      setReplacementLoading(false);
      return undefined;
    }

    setReplacementLoading(true);
    timer = setTimeout(() => {
      listProducts({
        actif: true,
        take: 200,
        q: normalizeStr(replacementQuery) || undefined,
      })
        .then((rows) => {
          if (cancelled) return;
          setReplacementProducts(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (cancelled) return;
          setReplacementProducts([]);
        })
        .finally(() => {
          if (!cancelled) setReplacementLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [canReplaceBillingItems, replacementQuery]);

  const handleActionResult = async (result, fallbackInfo) => {
    if (result?.alreadyDone) {
      setInfo(result?.message || fallbackInfo || "Action déjà effectuée.");
    } else {
      setInfo("");
    }
    await load();
  };

  const navigateToNextPreparationQueueOrder = (nextTab) => {
    if (searchParams.get("prepQueue") !== "1") return false;

    const queueIds = String(searchParams.get("queueIds") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const currentIndex = queueIds.indexOf(id);
    const nextId = currentIndex >= 0 ? queueIds[currentIndex + 1] : "";

    if (!nextId) {
      const queueTab = searchParams.get("queueTab");
      navigate(queueTab ? `/preparation?tab=${encodeURIComponent(queueTab)}` : "/preparation", { replace: true });
      return true;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", nextTab);
    navigate(`/orders/${nextId}?${nextParams.toString()}`, { replace: true });
    return true;
  };

  const handleResendInvoiceNotification = async (channel = "") => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const normalizedChannel = String(channel || "").trim().toUpperCase();
      const result = await ordersService.resendInvoiceSms(
        id,
        {
          ...(normalizedChannel ? { channel: normalizedChannel } : {}),
          phone: normalizeStr(invoiceWaTo) || undefined,
          email: normalizeStr(invoiceEmail) || undefined,
        },
      );
      const sentChannels = (Array.isArray(result?.attempts) ? result.attempts : [])
        .filter((attempt) => attempt?.sent || attempt?.queued)
        .map((attempt) => String(attempt.channel || "").toUpperCase())
        .filter(Boolean);
      const uniqueChannels = [...new Set(sentChannels)];
      const channelsLabel =
        uniqueChannels.length > 0
          ? uniqueChannels.join(" + ")
          : normalizedChannel || "SMS / EMAIL";
      const destinations = [
        result?.toPhone ? `SMS: ${result.toPhone}` : null,
        result?.toEmail ? `Email: ${result.toEmail}` : null,
      ].filter(Boolean);
      const hasPaymentLink = Boolean(
        order?.paymentLink ||
          order?.paymentLinkTarget ||
          order?.trackedPaymentLink ||
          order?.activePayment?.providerLaunchUrl,
      );
      if (result?.sent) {
        setInfo(
          `${hasPaymentLink ? "Notification de paiement avec lien" : "Notification de rappel de paiement"} renvoyée via ${channelsLabel}${
            destinations.length ? ` vers ${destinations.join(" | ")}` : "."
          }`,
        );
      } else if (result?.queued) {
        setInfo(
          `${hasPaymentLink ? "Notification de paiement avec lien" : "Notification de rappel de paiement"} mise en file via ${channelsLabel}${
            destinations.length ? ` vers ${destinations.join(" | ")}` : "."
          }`,
        );
      } else {
        setInfo(
          result?.errorMessage ||
            "Le renvoi de notification a été lancé, mais aucun canal n'a confirmé l'envoi.",
        );
      }

      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de renvoyer le lien de paiement par SMS / email",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationContacts = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.updateNotificationContacts(id, {
        phone: normalizeStr(invoiceWaTo) || "",
        email: normalizeStr(invoiceEmail) || "",
      });

      setInvoiceWaTo(result?.factureWhatsappTo || "");
      setInvoiceEmail(result?.fboEmail || "");
      setInfo("Coordonnées de notification mises à jour pour cette commande.");
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de mettre à jour les coordonnées de notification",
      );
    } finally {
      setSaving(false);
    }
  };

const doInvoice = async (options = {}) => {
  try {
    setSaving(true);
    setError("");
    setInfo("");

    const body = {
      factureReference: normalizeStr(invoiceRef) || undefined,
      whatsappTo: normalizeStr(invoiceWaTo) || undefined,
      notificationEmail: normalizeStr(invoiceEmail) || undefined,
      fboGrade: normalizeStr(invoiceGrade) || undefined,
      invoiceAmountFcfa: normalizeStr(invoiceAmountFcfa) || undefined,
      note: normalizeStr(invoiceNote) || undefined,
      confirmDuplicateAs400Reference:
        options?.confirmDuplicateAs400Reference === true,
    };

    await ordersService.invoice(id, body);
    navigate("/billing?tab=queue&autoClaim=1");
  } catch (e) {
    setError(e?.response?.data?.message || "Impossible de facturer");
  } finally {
    setSaving(false);
  }
};

  const doEnqueueAs400Request = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.enqueueAs400Request(id, {
        mode: "OBSERVATION",
        action: "CREATE_AND_VALIDATE_INVOICE",
        note: "Demande AS400 créée depuis l'onglet facturation en mode observation.",
      });

      setInfo(
        result?.created
          ? "Demande AS400 créée en mode observation. Aucun automate n'a été exécuté."
          : "Une demande AS400 active existe déjà pour cette commande.",
      );
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de créer la demande AS400 en mode observation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doCorrectAs400Invoice = async (options = {}) => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.correctAs400Invoice(id, {
        factureReference: normalizeStr(invoiceRef) || undefined,
        invoiceAmountFcfa: normalizeStr(invoiceAmountFcfa) || undefined,
        note: normalizeStr(invoiceNote) || undefined,
        confirmDuplicateAs400Reference:
          options?.confirmDuplicateAs400Reference === true,
      });

      setOrder(result?.order || result);
      setInfo(
        result?.message ||
          "Facture AS400 corrigée. Le prochain paiement utilisera le nouveau montant.",
      );
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de corriger la facture AS400");
    } finally {
      setSaving(false);
    }
  };

  const doRelaunchPayment = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const minutes = Number.parseInt(String(relaunchPaymentMinutes || ""), 10);
      const result = await ordersService.relaunchPayment(id, {
        durationMinutes: Number.isFinite(minutes) ? minutes : 10,
        note: normalizeStr(relaunchPaymentNote) || undefined,
        switchToCash: Boolean(relaunchPaymentAsCash),
      });
      setOrder(result);
      setInfo(
        relaunchPaymentAsCash
          ? "Commande relancée en mode caisse."
          : "Commande relancée : un nouveau délai de paiement a été envoyé au client.",
      );
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de relancer le paiement de cette commande",
      );
    } finally {
      setSaving(false);
    }
  };

  const doProof = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const body = {
        manualPaymentProofUrl: normalizeStr(proofUrl) || undefined,
        manualPaymentReference: normalizeStr(proofRef) || undefined,
        note: normalizeStr(proofNote) || undefined,
      };

      const result = await ordersService.proof(id, body);
      await handleActionResult(result, "Preuve déjà enregistrée.");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible d'enregistrer la preuve",
      );
    } finally {
      setSaving(false);
    }
  };

  const doUploadBankProof = async (file) => {
    if (!file) {
      setError("Sélectionne le fichier de preuve à uploader.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.uploadBankProof(id, {
        file,
        reference: normalizeStr(proofRef) || undefined,
        declaredAmountFcfa:
          normalizeStr(order?.as400InvoiceTotalFcfa || order?.totalFcfa) ||
          undefined,
        note: normalizeStr(proofNote) || undefined,
      });

      await handleActionResult(result, "Preuve bancaire déjà enregistrée.");
      setInfo("Preuve bancaire uploadée et passée en attente de validation.");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible d'uploader la preuve bancaire",
      );
    } finally {
      setSaving(false);
    }
  };

  const doVerifyPayment = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.verifyPayment(id, {
        note: normalizeStr(verifyNote) || undefined,
      });

      await handleActionResult(result, "Paiement déjà validé.");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de valider le paiement",
      );
    } finally {
      setSaving(false);
    }
  };

  const doCashPay = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.pay(id, {
        note: normalizeStr(cashNote) || undefined,
        receiptNumber: normalizeStr(cashReceiptNumber) || undefined,
        cashDeskLabel: normalizeStr(cashDeskLabel) || undefined,
        amountReceivedFcfa: normalizeStr(cashAmountReceivedFcfa) || undefined,
      });

      await handleActionResult(result, "Paiement espèces déjà enregistré.");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible d'encaisser le paiement espèces",
      );
    } finally {
      setSaving(false);
    }
  };

  const doInitiateWave = async () => {
    try {
      setWaveLoading(true);
      setError("");
      setInfo("");

      const result = await ordersService.initiateWavePayment(id);

      if (result?.checkoutUrl) {
        setInfo("Session Wave créée avec succès.");
      } else {
        setInfo("Paiement Wave initié.");
      }

      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible d'initier le paiement Wave",
      );
    } finally {
      setWaveLoading(false);
    }
  };

  const doSyncWave = async () => {
    try {
      setWaveLoading(true);
      setError("");
      setInfo("");

      const result = await ordersService.syncWavePaymentStatus(id);

      if (result?.mapped?.markOrderPaid) {
        setInfo("Paiement Wave confirmé.");
      } else {
        setInfo("Statut Wave synchronisé.");
      }

      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de synchroniser le paiement Wave",
      );
    } finally {
      setWaveLoading(false);
    }
  };

  const doSimulateWave = async (scenario) => {
    try {
      setWaveLoading(true);
      setError("");
      setInfo("");

      const result = await ordersService.simulateWavePayment(id, scenario);

      if (result?.scenario === "succeeded") {
        setInfo("Simulation Wave succeeded exécutée.");
      } else if (result?.scenario === "expired") {
        setInfo("Simulation Wave expired exécutée.");
      } else if (result?.scenario === "cancelled") {
        setInfo("Simulation Wave cancelled exécutée.");
      } else {
        setInfo("Simulation Wave processing exécutée.");
      }

      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de simuler le paiement Wave",
      );
    } finally {
      setWaveLoading(false);
    }
  };

  const doSwitchPaymentToManual = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      await ordersService.switchPaymentToManual(id);
      setInfo("Mode de paiement basculé en paiement à la caisse.");
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de basculer le mode de paiement en caisse",
      );
    } finally {
      setSaving(false);
    }
  };

  const doSwitchPaymentToWave = async () => {
    try {
      setWaveLoading(true);
      setError("");
      setInfo("");

      const result = await ordersService.switchPaymentToWave(id, {
        phone: normalizeStr(invoiceWaTo) || undefined,
      });

      setInfo(
        result?.paymentLink
          ? "Mode de paiement basculé vers Wave. Le lien est prêt: vous pouvez le renvoyer au client."
          : "Mode de paiement basculé vers Wave. Paiement initié.",
      );
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de basculer le mode de paiement vers Wave",
      );
    } finally {
      setWaveLoading(false);
    }
  };

  const doPrepare = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.prepare(id, {
        packingNote: normalizeStr(packingNote) || undefined,
      });

      await handleActionResult(result, "Commande déjà préparée.");
      navigateToNextPreparationQueueOrder("preparation");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de marquer le colis prêt",
      );
    } finally {
      setSaving(false);
    }
  };

  const doResendConfirmationSms = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.resendConfirmationSms(id, {
        phone: normalizeStr(invoiceWaTo) || undefined,
        email: normalizeStr(invoiceEmail) || undefined,
      });
      if (result?.sent) {
        const channel = String(result?.channel || "SMS").toUpperCase();
        setInfo(`Notification de confirmation renvoyée via ${channel} au ${result?.toPhone || "client"}.`);
      } else {
        setInfo(
          result?.errorMessage ||
            "Le renvoi de notification a été lancé, mais aucun canal n'a confirmé l'envoi.",
        );
      }

      if (result?.toPhone) setInvoiceWaTo(result.toPhone);
      if (result?.toEmail) setInvoiceEmail(result.toEmail);
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de renvoyer le SMS de confirmation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doFulfill = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.fulfill(id, {
        deliveryTracking: normalizeStr(deliveryTracking) || undefined,
        pickupCode: normalizeStr(pickupCode) || undefined,
        pickupPointLabel: normalizeStr(pickupPointLabel) || undefined,
        deliveryCarrier: normalizeStr(deliveryCarrier) || undefined,
        fulfillmentMode: normalizeStr(fulfillmentMode) || undefined,
        pickupRecipientType: normalizeStr(pickupRecipientType) || undefined,
        pickupRecipientName: normalizeStr(pickupRecipientName) || undefined,
        pickupRecipientPhone: normalizeStr(pickupRecipientPhone) || undefined,
        pickupConfirmationNote: normalizeStr(pickupConfirmationNote) || undefined,
        note: normalizeStr(fulfillNote) || undefined,
      });

      await handleActionResult(result, "Commande déjà clôturée.");
      navigateToNextPreparationQueueOrder("fulfillment");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de clôturer");
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    try {
      if (!normalizeStr(cancelReason)) {
        setError("Motif d'annulation requis.");
        return;
      }

      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.cancel(id, {
        reason: normalizeStr(cancelReason),
      });

      await handleActionResult(result, "Commande déjà annulée.");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'annuler");
    } finally {
      setSaving(false);
    }
  };

  const copyWhatsApp = async () => {
    const text = order?.whatsappMessage || "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setInfo("Message SMS copie.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setInfo("Message SMS copie.");
    }
  };

  const doFulfillNoNotification = async () => {
    const confirmed = window.confirm(
      "Cette action va clôturer la commande sans envoyer de SMS ni email au client. Elle débitera le stock si nécessaire et sera tracée dans l'historique. Continuer ?",
    );
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.fulfillNoNotification(id, {
        deliveryTracking: normalizeStr(deliveryTracking) || undefined,
        pickupPointLabel: normalizeStr(pickupPointLabel) || undefined,
        deliveryCarrier: normalizeStr(deliveryCarrier) || undefined,
        fulfillmentMode: normalizeStr(fulfillmentMode) || undefined,
        pickupRecipientType: normalizeStr(pickupRecipientType) || undefined,
        pickupRecipientName: normalizeStr(pickupRecipientName) || undefined,
        pickupRecipientPhone: normalizeStr(pickupRecipientPhone) || undefined,
        pickupConfirmationNote: normalizeStr(pickupConfirmationNote) || undefined,
        note:
          normalizeStr(fulfillNote) ||
          "Commande déjà livrée physiquement. Clôture admin sans notification.",
      });

      if (result?.alreadyDone) {
        setInfo("Commande déjà clôturée.");
      } else {
        setInfo("Commande clôturée sans notification SMS/email.");
      }
      await load();
      navigateToNextPreparationQueueOrder("fulfillment");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de clôturer sans notification",
      );
    } finally {
      setSaving(false);
    }
  };

  const doDownloadDeliveryNote = async () => {
    try {
      setSaving(true);
      setError("");
      const response = await ordersService.downloadDeliveryNotePdf(id);
      const blob = response?.data instanceof Blob ? response.data : new Blob([response?.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const parcelRef = order?.parcelNumber || order?.preorderNumber || id;
      link.href = url;
      link.download = `bon-livraison-${parcelRef}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de générer le bon de livraison");
    } finally {
      setSaving(false);
    }
  };

  const doUpdatePreparationChecklistItem = async (itemId, checked) => {
    try {
      setSaving(true);
      setError("");
      const saved = await ordersService.updatePreparationChecklistItem(id, { itemId, checked });
      setOrder((prev) => {
        if (!prev) return prev;
        const nextItems = Array.isArray(prev.preparationItems)
          ? prev.preparationItems.map((item) =>
              item.preorderItemId === itemId ? { ...item, ...saved } : item,
            )
          : [saved];
        return {
          ...prev,
          preparationItems: nextItems,
        };
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de mettre à jour la checklist de préparation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doBulkUpdatePreparationChecklist = async (checked) => {
    try {
      setSaving(true);
      setError("");
      await ordersService.bulkUpdatePreparationChecklist(id, { checked });
      setOrder((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        return {
          ...prev,
          preparationItems: Array.isArray(prev.preparationItems)
            ? prev.preparationItems.map((item) => ({
                ...item,
                checked: Boolean(checked),
                checkedAt: checked ? now : null,
              }))
            : prev.preparationItems,
        };
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de mettre à jour la checklist de préparation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doCreatePreparationAnomaly = async (body) => {
    try {
      setSaving(true);
      setError("");
      const created = await ordersService.createPreparationAnomaly(id, body);
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          preparationAnomalies: [
            created,
            ...(Array.isArray(prev.preparationAnomalies)
              ? prev.preparationAnomalies
              : []),
          ],
        };
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible d'enregistrer l'anomalie de préparation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doResolvePreparationAnomaly = async (anomalyId, resolutionNote) => {
    try {
      setSaving(true);
      setError("");
      const saved = await ordersService.resolvePreparationAnomaly(id, anomalyId, {
        resolutionNote: normalizeStr(resolutionNote) || undefined,
      });
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          preparationAnomalies: Array.isArray(prev.preparationAnomalies)
            ? prev.preparationAnomalies.map((item) =>
                item.id === anomalyId ? { ...item, ...saved } : item,
              )
            : prev.preparationAnomalies,
        };
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de résoudre l'anomalie de préparation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doReplaceBillingItem = async (itemId, nextProductId) => {
    try {
      setReplacingItemId(itemId);
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.replaceBillingItem(id, itemId, {
        replacementProductId: normalizeStr(nextProductId),
      });

      const nextStatus = result?.order?.status;
      if (nextStatus === "SUBMITTED" && status !== "SUBMITTED") {
        setInfo(
          "Produit remplacé. La commande est repassée en SOUMISE: veuillez régénérer la facture puis renvoyer le SMS.",
        );
      } else {
        setInfo("Produit remplacé. Les totaux de la commande ont été recalculés.");
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de remplacer le produit");
    } finally {
      setSaving(false);
      setReplacingItemId("");
    }
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Chargement…</div>;
  }

  if (!order) return null;

  const commonTabProps = {
    order,
    saving,
    error,
    info,
    setError,
    setInfo,
    reload: load,
    isCash,
    isAutoPayment,
  };

  return (
    <RequirePermission
      permission={Permission.PREORDER_READ}
      fallback={
        <AccessDeniedPanel message="Accès refusé au détail de commande." />
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900 break-all">
                  Précommande {preorderNumber}
                </h2>
                <StatusBadge status={order?.status} />
              </div>

              <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
                <div className="min-w-[220px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Client</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{order?.fboNomComplet || "—"}</div>
                  <div className="text-xs text-gray-600">FBO {order?.fboNumero || "—"}</div>
                </div>
                <div className="min-w-[220px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Commande</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{order?.preorderNumber || "—"}</div>
                  <div className="text-xs text-gray-600">{formatDateTime(order?.createdAt)}</div>
                </div>
                <div className="min-w-[220px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Paiement</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {humanizeEnum(order?.preorderPaymentMode || order?.paymentMode)}
                  </div>
                  <div className="text-xs text-gray-600">{formatFcfa(order?.totalFcfa)}</div>
                </div>
                <div className="min-w-[220px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Livraison</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{humanizeEnum(order?.deliveryMode)}</div>
                  <div className="text-xs text-gray-600">{order?.parcelNumber || "Colis non généré"}</div>
                </div>
                <div className="min-w-[220px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Préparation</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">
                    {order?.preparationLaunchedAt ? formatDateTime(order?.preparationLaunchedAt) : "En attente caisse"}
                  </div>
                  <div className="text-xs text-gray-600">
                    {order?.preparedAt ? `Prêt le ${formatDateTime(order?.preparedAt)}` : "Non finalisée"}
                  </div>
                </div>
                <div className="min-w-[220px] rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500">Référence</div>
                  <div className="mt-1 text-sm font-semibold text-gray-900">{order?.factureReference || "—"}</div>
                  <div className="text-xs text-gray-600">{order?.id || "—"}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start">
              <button
                onClick={load}
                disabled={saving || waveLoading}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                type="button"
              >
                Rafraîchir
              </button>

              {canReplaceBillingItems ? (
                <button
                  onClick={() => setTab("billing")}
                  disabled={saving || waveLoading}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  type="button"
                >
                  Modifier produits
                </button>
              ) : null}

              <RequirePermission permission={Permission.PREORDER_UPDATE_STATUS}>
                {canCancel ? (
                  <button
                    onClick={() => setTab("cancel")}
                    disabled={saving || waveLoading}
                    className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    type="button"
                  >
                    Annuler
                  </button>
                ) : null}
              </RequirePermission>
            </div>
          </div>
        </div>

        {error ? (
          <Alert tone="red" title="Erreur">
            {error}
          </Alert>
        ) : null}

        {info ? (
          <Alert tone="blue" title="Information">
            {info}
          </Alert>
        ) : null}

        {showLateWaveReviewAlert ? (
          <Alert tone="amber" title="Paiement Wave tardif à revoir">
            Cette précommande a été annulée automatiquement, puis un paiement Wave a été confirmé après coup.
            Le dossier doit être vérifié manuellement avant toute réactivation ou remboursement.
          </Alert>
        ) : null}

        <OrderDetailTabs
          activeTab={activeTab}
          onChange={setTab}
          order={order}
          availableTabs={availableTabs}
        />

        {activeTab === "overview" && (
          <OrderOverviewTab
            {...commonTabProps}
            emptyOrder={emptyOrder}
            steps={steps}
            stockSummary={stockSummary}
            stockDebited={stockDebited}
            stockRestored={stockRestored}
            canReplaceBillingItems={canReplaceBillingItems}
            replacementProducts={replacementProducts}
            replacingItemId={replacingItemId}
            saving={saving}
            onReplaceBillingItem={doReplaceBillingItem}
          />
        )}

        {activeTab === "workflow" && (
          <RequirePermission
            permission={Permission.PREORDER_READ}
            fallback={
              <AccessDeniedPanel message="Accès refusé à l’onglet workflow." />
            }
          >
            <OrderWorkflowTab {...commonTabProps} />
          </RequirePermission>
        )}

        {activeTab === "billing" && (
          <RequirePermission
            permission={Permission.INVOICE_CREATE}
            fallback={
              <AccessDeniedPanel message="Accès refusé à la facturation." />
            }
          >
            <OrderBillingTab
              {...commonTabProps}
              saving={saving || waveLoading}
              canInvoice={canInvoice}
              canEnqueueAs400Request={canEnqueueAs400Request}
              canCorrectAs400Invoice={canCorrectAs400Invoice}
              canRelaunchPayment={canRelaunchPayment}
              canProof={canProof}
              canVerify={canVerify}
              canCashPay={canCashPay}
              invoiceRef={invoiceRef}
              setInvoiceRef={setInvoiceRef}
              invoiceWaTo={invoiceWaTo}
              setInvoiceWaTo={setInvoiceWaTo}
              invoiceEmail={invoiceEmail}
              setInvoiceEmail={setInvoiceEmail}
              invoiceGrade={invoiceGrade}
              setInvoiceGrade={setInvoiceGrade}
              invoiceAmountFcfa={invoiceAmountFcfa}
              setInvoiceAmountFcfa={setInvoiceAmountFcfa}
              invoicePreview={invoicePreview}
              invoicePreviewLoading={invoicePreviewLoading}
              paymentLink={paymentLink}
              setPaymentLink={setPaymentLink}
              invoiceNote={invoiceNote}
              setInvoiceNote={setInvoiceNote}
              relaunchPaymentMinutes={relaunchPaymentMinutes}
              setRelaunchPaymentMinutes={setRelaunchPaymentMinutes}
              relaunchPaymentNote={relaunchPaymentNote}
              setRelaunchPaymentNote={setRelaunchPaymentNote}
              relaunchPaymentAsCash={relaunchPaymentAsCash}
              setRelaunchPaymentAsCash={setRelaunchPaymentAsCash}
              canRelaunchPaymentAsCash={isGlobalAdmin}
              proofUrl={proofUrl}
              setProofUrl={setProofUrl}
              proofRef={proofRef}
              setProofRef={setProofRef}
              proofNote={proofNote}
              setProofNote={setProofNote}
              verifyNote={verifyNote}
              setVerifyNote={setVerifyNote}
              cashNote={cashNote}
              setCashNote={setCashNote}
              cashReceiptNumber={cashReceiptNumber}
              setCashReceiptNumber={setCashReceiptNumber}
              cashDeskLabel={cashDeskLabel}
              setCashDeskLabel={setCashDeskLabel}
              cashAmountReceivedFcfa={cashAmountReceivedFcfa}
              setCashAmountReceivedFcfa={setCashAmountReceivedFcfa}
              onInvoice={doInvoice}
              onEnqueueAs400Request={doEnqueueAs400Request}
              onCorrectAs400Invoice={doCorrectAs400Invoice}
              onRelaunchPayment={doRelaunchPayment}
              onCopyWhatsApp={copyWhatsApp}
              onProof={doProof}
              onUploadBankProof={doUploadBankProof}
              onVerify={doVerifyPayment}
              onCashPay={doCashPay}
              billingMessage={billingMessage}
              billingNotificationState={billingNotificationState}
              onSaveNotificationContacts={handleSaveNotificationContacts}
              onResendInvoiceNotification={handleResendInvoiceNotification}
              canResendInvoiceNotification={Boolean(
                order?.factureReference ||
                  order?.invoicedAt ||
                  ["INVOICED", "PAYMENT_PENDING", "PAYMENT_PROOF_RECEIVED", "PAID", "READY", "FULFILLED"].includes(
                    String(order?.status || "").toUpperCase(),
                  ),
              )}
              onInitiateWave={doInitiateWave}
              onRefreshWaveStatus={doSyncWave}
              onSyncWave={doSyncWave}
              onSimulateWave={doSimulateWave}
              waveLoading={waveLoading}
              showWaveDevTools={true}
              showReinvoiceHint={showReinvoiceHint}
              canSwitchToManualPayment={canSwitchPaymentToCash}
              onSwitchToManualPayment={doSwitchPaymentToManual}
              canSwitchToWavePayment={canSwitchPaymentToWave}
              onSwitchToWavePayment={doSwitchPaymentToWave}
              canReplaceBillingItems={canReplaceBillingItems}
              replacementProducts={replacementProducts}
              replacementQuery={replacementQuery}
              setReplacementQuery={setReplacementQuery}
              replacementLoading={replacementLoading}
              replacingItemId={replacingItemId}
              onReplaceBillingItem={doReplaceBillingItem}
              reload={load}
            />
          </RequirePermission>
        )}

        {activeTab === "payment" && (
          <RequirePermission
            permission={Permission.PAYMENT_VALIDATE}
            fallback={<AccessDeniedPanel message="Accès refusé au paiement." />}
          >
            <OrderPaymentTab
              {...commonTabProps}
              saving={saving || waveLoading}
              canProof={canProof}
              canVerify={canVerify}
              canCashPay={canCashPay}
              proofUrl={proofUrl}
              setProofUrl={setProofUrl}
              proofRef={proofRef}
              setProofRef={setProofRef}
              proofNote={proofNote}
              setProofNote={setProofNote}
              verifyNote={verifyNote}
              setVerifyNote={setVerifyNote}
              cashNote={cashNote}
              setCashNote={setCashNote}
              cashReceiptNumber={cashReceiptNumber}
              setCashReceiptNumber={setCashReceiptNumber}
              cashDeskLabel={cashDeskLabel}
              setCashDeskLabel={setCashDeskLabel}
              cashAmountReceivedFcfa={cashAmountReceivedFcfa}
              setCashAmountReceivedFcfa={setCashAmountReceivedFcfa}
              onProof={doProof}
              onUploadBankProof={doUploadBankProof}
              onVerify={doVerifyPayment} // ✅ FIX
              onCashPay={doCashPay}
              onInitiateWave={doInitiateWave}
              onSyncWave={doSyncWave} // ✅ FIX
              reload={load} // ✅ FIX IMPORTANT
            />
          </RequirePermission>
        )}

        {activeTab === "preparation" && (
          <RequirePermission
            permission={Permission.PREPARATION_UPDATE}
            fallback={
              <AccessDeniedPanel message="Accès refusé à la préparation." />
            }
          >
            <OrderPreparationTab
              {...commonTabProps}
              saving={saving}
              canPrepare={canPrepare}
              packingNote={packingNote}
              setPackingNote={setPackingNote}
              onPrepare={doPrepare}
              onToggleChecklistItem={doUpdatePreparationChecklistItem}
              onBulkChecklist={doBulkUpdatePreparationChecklist}
              onCreateAnomaly={doCreatePreparationAnomaly}
              onResolveAnomaly={doResolvePreparationAnomaly}
              onGoToFulfillment={() => setTab("fulfillment")}
              stockSummary={stockSummary}
            />
          </RequirePermission>
        )}

        {activeTab === "fulfillment" && (
          <RequirePermission
            permission={Permission.PREPARATION_UPDATE}
            fallback={
              <AccessDeniedPanel message="Accès refusé au fulfillment." />
            }
          >
            <OrderFulfillmentTab
              {...commonTabProps}
              saving={saving}
              canFulfill={canFulfill}
              deliveryTracking={deliveryTracking}
              setDeliveryTracking={setDeliveryTracking}
              pickupCode={pickupCode}
              setPickupCode={setPickupCode}
              pickupPointLabel={pickupPointLabel}
              setPickupPointLabel={setPickupPointLabel}
              deliveryCarrier={deliveryCarrier}
              setDeliveryCarrier={setDeliveryCarrier}
              fulfillmentMode={fulfillmentMode}
              setFulfillmentMode={setFulfillmentMode}
              fulfillNote={fulfillNote}
              setFulfillNote={setFulfillNote}
              pickupRecipientType={pickupRecipientType}
              setPickupRecipientType={setPickupRecipientType}
              pickupRecipientName={pickupRecipientName}
              setPickupRecipientName={setPickupRecipientName}
              pickupRecipientPhone={pickupRecipientPhone}
              setPickupRecipientPhone={setPickupRecipientPhone}
              pickupConfirmationNote={pickupConfirmationNote}
              setPickupConfirmationNote={setPickupConfirmationNote}
              notificationPhone={invoiceWaTo}
              setNotificationPhone={setInvoiceWaTo}
              notificationEmail={invoiceEmail}
              setNotificationEmail={setInvoiceEmail}
              onFulfill={doFulfill}
              onFulfillNoNotification={doFulfillNoNotification}
              canFulfillNoNotification={canFulfillNoNotification}
              onDownloadDeliveryNote={doDownloadDeliveryNote}
              onResendConfirmationSms={doResendConfirmationSms}
              canResendConfirmationSms={isGlobalAdmin}
            />
          </RequirePermission>
        )}

        {activeTab === "history" && (
          <RequirePermission
            permission={Permission.PREORDER_READ}
            fallback={
              <AccessDeniedPanel message="Accès refusé à l’historique." />
            }
          >
            <OrderHistoryTab
              {...commonTabProps}
              messages={messages}
              logs={order?.logs}
              as400Requests={as400Requests}
              role={role}
            />
          </RequirePermission>
        )}

        {activeTab === "cancel" && (
          <RequirePermission
            permission={Permission.PREORDER_UPDATE_STATUS}
            fallback={
              <AccessDeniedPanel message="Accès refusé à l’annulation." />
            }
          >
            <OrderCancelPanel
              {...commonTabProps}
              saving={saving}
              canCancel={canCancel}
              cancelReason={cancelReason}
              setCancelReason={setCancelReason}
              onCancel={doCancel}
            />
          </RequirePermission>
        )}
      </div>
    </RequirePermission>
  );
}
