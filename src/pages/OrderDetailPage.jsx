import useOrderPermissions from "../hooks/orders/useOrderPermissions";
import useOrderActions from "../hooks/orders/useOrderActions";
// src/pages/OrderDetailPage.jsx
// Page de détail d'une commande, affichant les informations principales de la commande,
// son statut, et proposant des onglets pour voir les détails, la facturation, le paiement,
// la préparation, le fulfillment, l'historique et le workflow de la commande.

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import useOrderDetail from "../hooks/orders/useOrderDetail";
import useOrdersScope from "../hooks/orders/useOrdersScope";
import StatusBadge from "../components/StatusBadge";
import { orderNextAction } from "../lib/orders/orderPresentation";
import { ordersService } from "../services/ordersService";
import OrderDetailHeader from "../components/orders/detail/OrderDetailHeader";

import { list as listProducts } from "../services/productsService";
import RequirePermission from "../components/auth/RequirePermission";
import { AdminRole, Permission } from "../auth/permissions";
import { usePermission } from "../hooks/usePermission";
import useAdminAuth from "../hooks/useAdminAuth";
import { useConfirm } from "../hooks/useDialogs";
import {
  getDefaultOrderTabForRole,
  getOrderTabsForRole,
} from "../auth/workspaces";

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

function isLateWaveReviewOrder(order) {
  const status = String(order?.status || "")
    .trim()
    .toUpperCase();
  const paymentStatus = String(order?.paymentStatus || "")
    .trim()
    .toUpperCase();
  const billingWorkStatus = String(order?.billingWorkStatus || "")
    .trim()
    .toUpperCase();
  const paymentProvider = String(order?.paymentProvider || "")
    .trim()
    .toUpperCase();
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
  const confirm = useConfirm();

  const [saving, setSaving] = useState(false);
  const [waveLoading, setWaveLoading] = useState(false);

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

  const [replacementProducts, setReplacementProducts] = useState([]);
  const [replacementQuery, setReplacementQuery] = useState("");
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [replacingItemId, setReplacingItemId] = useState("");

  const scope = useOrdersScope();
  const historyVisible = [
    "history",
    "billing",
    "payment",
    "fulfillment",
  ].includes(activeTab);
  const billingAllowed = usePermission(Permission.INVOICE_CREATE);
  const hydrateOrderForms = (data) => {
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
    setProofNote(data?.manualPaymentProofNote || data?.paymentProofNote || "");

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
    setPickupRecipientName(
      data?.pickupRecipientName || data?.fboNomComplet || "",
    );
    setPickupRecipientPhone(data?.pickupRecipientPhone || "");
    setPickupConfirmationNote(data?.pickupConfirmationNote || "");
    setInvoiceNote("");
    setCancelReason("");
  };
  const {
    order,
    loading,
    refreshing,
    error,
    info,
    loadedAt,
    setOrder,
    setError,
    setInfo,
    messages,
    as400Requests,
    load,
    dirty,
    markDirty,
    isCurrentOrder,
    auxiliaryErrors,
    reloadAuxiliary,
  } = useOrderDetail({
    id,
    scope,
    onHydrate: hydrateOrderForms,
    loadMessages: historyVisible,
    loadAs400: billingAllowed && (historyVisible || activeTab === "workflow"),
  });

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

  const {
    status,
    paymentStatus,
    canAccessBilling,
    canAccessPayment,
    canAccessPreparation,
    canAccessCancel,
    isCash,
    isWave,
    isAutoPayment,
    isGlobalAdmin,
    canSwitchPaymentToCash,
    canSwitchPaymentToWave,
    canSwitchPaymentToBankTransfer,
    canFulfillNoNotification,
    canInvoice,
    canEnqueueAs400Request,
    canCorrectAs400Invoice,
    canReplaceBillingItems,
    canProof,
    canVerify,
    canPrepare,
    canFulfill,
    canCancel,
    canCashPay,
  } = useOrderPermissions(order, role, saving);

  useEffect(() => {
    if (!order) return;
    if (!["INVOICED", "PAYMENT_PENDING"].includes(status)) return;
    if (!isWave) return;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load({ silent: true });
    }, 10000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isWave, order?.id]);

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
  // Virement bancaire / Ecobank Pay / PI SPI ont besoin d'un délai bien plus
  // long qu'une relance mobile money classique (le client doit d'abord faire
  // l'opération auprès de sa banque) : le widget de relance bascule alors en
  // heures au lieu de minutes.
  const isBankStyleRelaunch = useMemo(() => {
    if (relaunchPaymentAsCash) return false;
    const mode = String(order?.preorderPaymentMode || "").toUpperCase();
    return ["BANK_TRANSFER", "ECOBANK_PAY", "PI_SPI"].includes(mode);
  }, [order?.preorderPaymentMode, relaunchPaymentAsCash]);

  useEffect(() => {
    if (!canRelaunchPayment) return;
    setRelaunchPaymentMinutes(isBankStyleRelaunch ? "72" : "10");
  }, [canRelaunchPayment, isBankStyleRelaunch]);
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
        log?.action === "REPRICE" && Boolean(log?.meta?.requiresReinvoice),
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
    return getOrderTabsForRole(role, canAccessCancel, order?.status).filter(
      (tab) => {
        if (tab.key === "billing") return canAccessBilling;
        if (tab.key === "payment") return canAccessPayment;
        if (tab.key === "preparation" || tab.key === "fulfillment")
          return canAccessPreparation;
        if (tab.key === "cancel") return canAccessCancel;
        return true;
      },
    );
  }, [
    role,
    canAccessBilling,
    canAccessCancel,
    canAccessPayment,
    canAccessPreparation,
    order?.status,
  ]);

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

  const {
    handleResendInvoiceNotification,
    handleSaveNotificationContacts,
    doInvoice,
    doEnqueueAs400Request,
    doCorrectAs400Invoice,
    doRelaunchPayment,
    doProof,
    doUploadBankProof,
    doVerifyPayment,
    doCashPay,
    doInitiateWave,
    doSyncWave,
    doSimulateWave,
    doSwitchPaymentToManual,
    doSwitchPaymentToWave,
    doSwitchPaymentToBankTransfer,
    doPrepare,
    doResendConfirmationSms,
    doFulfill,
    doCancel,
    copyWhatsApp,
    doFulfillNoNotification,
    doDownloadDeliveryNote,
    doUpdatePreparationChecklistItem,
    doBulkUpdatePreparationChecklist,
    doCreatePreparationAnomaly,
    doResolvePreparationAnomaly,
    doReplaceBillingItem,
  } = useOrderActions({
    Blob,
    URLSearchParams,
    cancelReason,
    cashAmountReceivedFcfa,
    cashDeskLabel,
    cashNote,
    cashReceiptNumber,
    confirm,
    deliveryCarrier,
    deliveryTracking,
    document,
    fulfillNote,
    fulfillmentMode,
    id,
    invoiceAmountFcfa,
    invoiceEmail,
    invoiceGrade,
    invoiceNote,
    invoiceRef,
    invoiceWaTo,
    isBankStyleRelaunch,
    isCurrentOrder,
    load,
    navigate,
    navigator,
    order,
    packingNote,
    pickupCode,
    pickupConfirmationNote,
    pickupPointLabel,
    pickupRecipientName,
    pickupRecipientPhone,
    pickupRecipientType,
    proofNote,
    proofRef,
    proofUrl,
    relaunchPaymentAsCash,
    relaunchPaymentMinutes,
    relaunchPaymentNote,
    searchParams,
    setError,
    setInfo,
    setInvoiceEmail,
    setInvoiceWaTo,
    setOrder,
    setReplacingItemId,
    setSaving,
    setWaveLoading,
    status,
    verifyNote,
    window,
  });

  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6"
      >
        <p className="text-sm text-gray-600">Chargement de la commande…</p>
        <div className="h-20 rounded-xl bg-gray-100 animate-pulse motion-reduce:animate-none" />
        <div className="h-40 rounded-xl bg-gray-100 animate-pulse motion-reduce:animate-none" />
      </div>
    );
  }

  if (!order)
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6">
        <h1 className="font-semibold text-gray-900">Commande indisponible</h1>
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error || "Ce dossier n’est pas disponible dans le périmètre actuel."}
        </p>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => load()} className="btn">
            Réessayer
          </button>
          <button
            type="button"
            onClick={() => navigate("/orders")}
            className="btn"
          >
            Retour aux commandes
          </button>
        </div>
      </div>
    );

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
      <div className="space-y-4" onChangeCapture={markDirty}>
        <OrderDetailHeader
          order={order}
          saving={saving || waveLoading || refreshing}
          onRefresh={() => load()}
          primaryAction={orderNextAction(order, {
            billing: canAccessBilling,
            payment: canAccessPayment,
            preparation: canAccessPreparation,
            overview: availableTabs.some((tab) => tab.key === "overview"),
          })}
          onPrimaryAction={(action) =>
            action.route ? navigate(action.route) : setTab(action.tab)
          }
          canCancel={canCancel && canAccessCancel}
          onGoCancel={() => setTab("cancel")}
          loadedAt={loadedAt}
          backHref={
            /^\/orders(?:\?|$)/.test(searchParams.get("returnTo") || "")
              ? searchParams.get("returnTo")
              : "/orders"
          }
        />
        {dirty && (
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            <span>
              Modifications en cours : vos saisies sont conservées lors d’une
              actualisation.
            </span>
            <button
              type="button"
              disabled={saving || waveLoading}
              onClick={async () => {
                if (
                  await confirm({
                    tone: "warning",
                    title: "Abandonner les saisies",
                    message:
                      "Les modifications non enregistrées seront remplacées par les données de la commande.",
                    confirmLabel: "Abandonner",
                  })
                )
                  load({ resetDrafts: true });
              }}
              className="font-semibold underline"
            >
              Abandonner les saisies
            </button>
          </div>
        )}

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
            Cette précommande a été annulée automatiquement, puis un paiement
            Wave a été confirmé après coup. Le dossier doit être vérifié
            manuellement avant toute réactivation ou remboursement.
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
            replacementQuery={replacementQuery}
            setReplacementQuery={setReplacementQuery}
            replacementLoading={replacementLoading}
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
              isBankStyleRelaunch={isBankStyleRelaunch}
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
                [
                  "INVOICED",
                  "PAYMENT_PENDING",
                  "PAYMENT_PROOF_RECEIVED",
                  "PAID",
                  "READY",
                  "FULFILLED",
                ].includes(String(order?.status || "").toUpperCase()),
              )}
              onInitiateWave={doInitiateWave}
              onRefreshWaveStatus={doSyncWave}
              onSyncWave={doSyncWave}
              onSimulateWave={doSimulateWave}
              waveLoading={waveLoading}
              showWaveDevTools={
                import.meta.env.DEV && role === AdminRole.TECH_ADMIN
              }
              showReinvoiceHint={showReinvoiceHint}
              canSwitchToManualPayment={canSwitchPaymentToCash}
              onSwitchToManualPayment={doSwitchPaymentToManual}
              canSwitchToWavePayment={canSwitchPaymentToWave}
              onSwitchToWavePayment={doSwitchPaymentToWave}
              canSwitchToBankTransferPayment={canSwitchPaymentToBankTransfer}
              onSwitchToBankTransferPayment={doSwitchPaymentToBankTransfer}
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

        {auxiliaryErrors.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {auxiliaryErrors.join(" ")}{" "}
            <button
              type="button"
              onClick={reloadAuxiliary}
              className="font-semibold underline"
            >
              Réessayer
            </button>
          </div>
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
              canReadAs400={canAccessBilling}
              notificationsUnavailable={auxiliaryErrors.some((value) =>
                value.includes("notifications"),
              )}
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
