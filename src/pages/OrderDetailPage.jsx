// src/pages/OrderDetailPage.jsx
// Page de détail d'une commande, affichant les informations principales de la commande,
// son statut, et proposant des onglets pour voir les détails, la facturation, le paiement,
// la préparation, le fulfillment, l'historique et le workflow de la commande.

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ordersService } from "../services/ordersService";
import RequirePermission from "../components/auth/RequirePermission";
import { Permission } from "../auth/permissions";

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
      <span className="text-right font-medium text-gray-900">{value ?? "—"}</span>
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
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [waveLoading, setWaveLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");

  const [invoiceRef, setInvoiceRef] = useState("");
  const [invoiceWaTo, setInvoiceWaTo] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");

  const [proofUrl, setProofUrl] = useState("");
  const [proofRef, setProofRef] = useState("");
  const [proofNote, setProofNote] = useState("");

  const [verifyNote, setVerifyNote] = useState("");
  const [cashNote, setCashNote] = useState("");
  const [packingNote, setPackingNote] = useState("");

  const [deliveryTracking, setDeliveryTracking] = useState("");
  const [fulfillNote, setFulfillNote] = useState("");

  const [cancelReason, setCancelReason] = useState("");

  const [messages, setMessages] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [data, messageData] = await Promise.all([
        ordersService.getById(id),
        ordersService.getMessages(id).catch(() => []),
      ]);

      setOrder(data);
      setMessages(Array.isArray(messageData) ? messageData : []);

      setInvoiceRef(data?.factureReference || "");
      setInvoiceWaTo(data?.factureWhatsappTo || "");
      setPaymentLink(data?.paymentLink || "");

      setProofUrl(data?.manualPaymentProofUrl || data?.paymentProofUrl || "");
      setProofRef(data?.manualPaymentReference || data?.paymentRef || "");
      setProofNote(data?.manualPaymentProofNote || data?.paymentProofNote || "");

      setPackingNote(data?.packingNote || "");
      setDeliveryTracking(data?.deliveryTracking || "");

      setVerifyNote("");
      setCashNote("");
      setFulfillNote("");
      setInvoiceNote("");
      setCancelReason("");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger la commande");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const next = searchParams.get("tab") || "overview";
    if (next !== activeTab) {
      setActiveTab(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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

  const paymentModeRaw = String(order?.paymentMode || "").toUpperCase();
  const paymentProviderRaw = String(order?.paymentProvider || "").toUpperCase();

  const isCash =
    paymentModeRaw === "ESPECES" ||
    paymentModeRaw === "CASH" ||
    paymentProviderRaw === "MANUAL";

  const isWave =
    paymentProviderRaw === "WAVE" ||
    paymentModeRaw === "MOBILE_MONEY" ||
    paymentModeRaw === "MOBILE MONEY";

  // Pour ton métier, "auto payment" = mobile money / wave
  const isAutoPayment = !isCash && isWave;

  useEffect(() => {
    if (!order) return;
    if (!["INVOICED", "PAYMENT_PENDING"].includes(status)) return;
    if (!isWave) return;

    const timer = setInterval(() => {
      load();
    }, 10000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isWave, order?.id]);

  const canInvoice = status === "SUBMITTED";
  const canProof = status === "INVOICED" && !isCash && !isWave && !isAutoPayment;
  const canVerify =
    ["PAYMENT_PENDING", "PAYMENT_PROOF_RECEIVED", "INVOICED"].includes(status) &&
    paymentStatus !== "PAID";
  const canPrepare = status === "PAID";
  const canFulfill = status === "READY";
  const canCancel = !!status && !["FULFILLED", "CANCELLED"].includes(status);
  const canCashPay =
    isCash && ["SUBMITTED", "INVOICED", "PAYMENT_PENDING"].includes(status) && !saving;

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
      : isWave
        ? ["SUBMITTED", "INVOICED", "PAYMENT_PENDING", "PAID", "READY", "FULFILLED"]
        : ["SUBMITTED", "INVOICED", "PAYMENT_PENDING", "PAID", "READY", "FULFILLED"];

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

  const handleActionResult = async (result, fallbackInfo) => {
    if (result?.alreadyDone) {
      setInfo(result?.message || fallbackInfo || "Action déjà effectuée.");
    } else {
      setInfo("");
    }
    await load();
  };

  const handleResendWhatsApp = async () => {
    setInfo("Fonction de renvoi WhatsApp bientôt disponible.");
  };

  const doInvoice = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const body = {
        factureReference: normalizeStr(invoiceRef) || undefined,
        whatsappTo: normalizeStr(invoiceWaTo) || undefined,
        note: normalizeStr(invoiceNote) || undefined,
      };

      await ordersService.invoice(id, body);

      if (!isCash && isAutoPayment) {
        const wave = await ordersService.initiateWavePayment(id);

        if (wave?.checkoutUrl) {
          setInfo("Préfacture créée et paiement Wave initié.");
        } else {
          setInfo("Préfacture créée. Paiement Wave initié.");
        }
      } else {
        setInfo("Préfacture créée et envoyée.");
      }

      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de facturer");
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
        e?.response?.data?.message || "Impossible d'enregistrer la preuve"
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
        e?.response?.data?.message || "Impossible de valider le paiement"
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
      });

      await handleActionResult(result, "Paiement espèces déjà enregistré.");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible d'encaisser le paiement espèces"
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
        e?.response?.data?.message || "Impossible d'initier le paiement Wave"
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
          "Impossible de synchroniser le paiement Wave"
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
        e?.response?.data?.message || "Impossible de simuler le paiement Wave"
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
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de marquer le colis prêt"
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
        note: normalizeStr(fulfillNote) || undefined,
      });

      await handleActionResult(result, "Commande déjà clôturée.");
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
      setInfo("Message WhatsApp copié.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setInfo("Message WhatsApp copié.");
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
      fallback={<AccessDeniedPanel message="Accès refusé au détail de commande." />}
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Commande #{order?.id?.slice?.(-8) || "—"}
                </h2>
                <StatusBadge status={order?.status} />
              </div>

              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
                <SummaryRow label="FBO" value={order?.fboNomComplet || "—"} />
                <SummaryRow label="Numéro FBO" value={order?.fboNumero || "—"} />
                <SummaryRow label="Montant" value={formatFcfa(order?.totalFcfa)} />
                <SummaryRow label="Créée le" value={formatDateTime(order?.createdAt)} />
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

        <OrderDetailTabs activeTab={activeTab} onChange={setTab} order={order} />

        {activeTab === "overview" && (
          <OrderOverviewTab
            {...commonTabProps}
            emptyOrder={emptyOrder}
            steps={steps}
            stockSummary={stockSummary}
            stockDebited={stockDebited}
            stockRestored={stockRestored}
          />
        )}

        {activeTab === "workflow" && (
          <RequirePermission
            permission={Permission.PREORDER_READ}
            fallback={<AccessDeniedPanel message="Accès refusé à l’onglet workflow." />}
          >
            <OrderWorkflowTab {...commonTabProps} />
          </RequirePermission>
        )}

        {activeTab === "billing" && (
          <RequirePermission
            permission={Permission.INVOICE_CREATE}
            fallback={<AccessDeniedPanel message="Accès refusé à la facturation." />}
          >
            <OrderBillingTab
              {...commonTabProps}
              saving={saving}
              canInvoice={canInvoice}
              invoiceRef={invoiceRef}
              setInvoiceRef={setInvoiceRef}
              invoiceWaTo={invoiceWaTo}
              setInvoiceWaTo={setInvoiceWaTo}
              paymentLink={paymentLink}
              setPaymentLink={setPaymentLink}
              invoiceNote={invoiceNote}
              setInvoiceNote={setInvoiceNote}
              onInvoice={doInvoice}
              onCopyWhatsApp={copyWhatsApp}
              billingMessage={billingMessage}
              onResendWhatsApp={handleResendWhatsApp}
              onInitiateWave={doInitiateWave}
              onRefreshWaveStatus={doSyncWave}
              onSimulateWave={doSimulateWave}
              waveLoading={waveLoading}
              showWaveDevTools={true}
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
              canCashPay={canCashPay}
              canProof={canProof}
              canVerify={canVerify}
              cashNote={cashNote}
              setCashNote={setCashNote}
              proofUrl={proofUrl}
              setProofUrl={setProofUrl}
              proofRef={proofRef}
              setProofRef={setProofRef}
              proofNote={proofNote}
              setProofNote={setProofNote}
              verifyNote={verifyNote}
              setVerifyNote={setVerifyNote}
              onCashPay={doCashPay}
              onProof={doProof}
              onVerify={doVerifyPayment}
              onInitiateWave={doInitiateWave}
              onSyncWave={doSyncWave}
            />
          </RequirePermission>
        )}

        {activeTab === "preparation" && (
          <RequirePermission
            permission={Permission.PREPARATION_UPDATE}
            fallback={<AccessDeniedPanel message="Accès refusé à la préparation." />}
          >
            <OrderPreparationTab
              {...commonTabProps}
              canPrepare={canPrepare}
              packingNote={packingNote}
              setPackingNote={setPackingNote}
              onPrepare={doPrepare}
              stockSummary={stockSummary}
            />
          </RequirePermission>
        )}

        {activeTab === "fulfillment" && (
          <RequirePermission
            permission={Permission.PREPARATION_UPDATE}
            fallback={<AccessDeniedPanel message="Accès refusé au fulfillment." />}
          >
            <OrderFulfillmentTab
              {...commonTabProps}
              canFulfill={canFulfill}
              deliveryTracking={deliveryTracking}
              setDeliveryTracking={setDeliveryTracking}
              fulfillNote={fulfillNote}
              setFulfillNote={setFulfillNote}
              onFulfill={doFulfill}
            />
          </RequirePermission>
        )}

        {activeTab === "history" && (
          <RequirePermission
            permission={Permission.PREORDER_READ}
            fallback={<AccessDeniedPanel message="Accès refusé à l’historique." />}
          >
            <OrderHistoryTab
              {...commonTabProps}
              logs={Array.isArray(order.logs) ? order.logs : []}
            />
          </RequirePermission>
        )}

        {activeTab === "cancel" && canCancel && (
          <RequirePermission
            permission={Permission.PREORDER_UPDATE_STATUS}
            fallback={<AccessDeniedPanel message="Accès refusé à l’annulation." />}
          >
            <OrderCancelPanel
              {...commonTabProps}
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