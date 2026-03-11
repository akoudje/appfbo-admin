// src/pages/OrderDetailPage.jsx

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { ordersService } from "../services/ordersService";

//import OrderDetailHeader from "../components/orders/detail/OrderDetailHeader";
//import OrderActionPanel from "../components/orders/detail/OrderActionPanel";
import OrderDetailTabs from "../components/orders/detail/OrderDetailTabs";
import OrderOverviewTab from "../components/orders/detail/OrderOverviewTab";
import OrderBillingTab from "../components/orders/detail/OrderBillingTab";
import OrderPaymentTab from "../components/orders/detail/OrderPaymentTab";
import OrderPreparationTab from "../components/orders/detail/OrderPreparationTab";
import OrderFulfillmentTab from "../components/orders/detail/OrderFulfillmentTab";
import OrderHistoryTab from "../components/orders/detail/OrderHistoryTab";
import OrderCancelPanel from "../components/orders/detail/OrderCancelPanel";

function normalizeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function Alert({ tone = "red", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`card p-3 border ${tones[tone] || tones.red}`}>
      {title ? <div className="font-semibold text-sm mb-1">{title}</div> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [activeTab, setActiveTab] = useState(
    searchParams.get("tab") || "overview",
  );

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

      setProofUrl(data?.paymentProofUrl || "");
      setProofRef(data?.paymentRef || "");
      setProofNote(data?.paymentProofNote || "");

      setPackingNote(data?.packingNote || "");
      setDeliveryTracking(data?.deliveryTracking || "");

      setVerifyNote("");
      setCashNote("");
      setFulfillNote("");
      setInvoiceNote("");
      setCancelReason("");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de charger la commande",
      );
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
  const isCash = order?.paymentMode === "ESPECES";
  const isAutoPayment = !isCash && Boolean(order?.paymentLink);

  useEffect(() => {
    if (!order) return;
    if (!(status === "INVOICED" && isAutoPayment)) return;

    const timer = setInterval(() => {
      load();
    }, 10000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isAutoPayment, order?.id]);

  const canInvoice = status === "SUBMITTED";
  const canProof = status === "INVOICED" && !isCash && !isAutoPayment;
  const canVerify =
    status === "PAYMENT_PROOF_RECEIVED" && !isCash && !isAutoPayment;
  const canPrepare = status === "PAID";
  const canFulfill = status === "READY";
  const canCancel = !!status && !["FULFILLED", "CANCELLED"].includes(status);
  const canCashPay =
    isCash && ["SUBMITTED", "INVOICED"].includes(status) && !saving;

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
      : isAutoPayment
        ? ["SUBMITTED", "INVOICED", "PAID", "READY", "FULFILLED"]
        : [
            "SUBMITTED",
            "INVOICED",
            "PAYMENT_PROOF_RECEIVED",
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

    const proof =
      isCash || isAutoPayment
        ? []
        : [
            {
              key: "PAYMENT_PROOF_RECEIVED",
              label: "Preuve reçue",
              at: order?.proofReceivedAt,
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
  }, [order, isCash, isAutoPayment]);

  const nextAction = useMemo(() => {
    if (!status) return null;

    if (status === "CANCELLED") {
      return {
        tone: "red",
        title: "Commande annulée",
        desc: stockRestored
          ? "La commande est annulée et le stock a été réintégré."
          : "Aucune action requise.",
        primaryLabel: null,
        primaryAction: null,
        enabled: false,
      };
    }

    if (status === "FULFILLED") {
      return {
        tone: "emerald",
        title: "Commande clôturée",
        desc: "Aucune action requise.",
        primaryLabel: null,
        primaryAction: null,
        enabled: false,
      };
    }

    if (emptyOrder && ["SUBMITTED", "INVOICED"].includes(status)) {
      return {
        tone: "amber",
        title: "Commande incomplète",
        desc: "Aucun item ou total à 0. Recommandation : annuler la commande ou demander au FBO de recommencer.",
        primaryLabel: canCancel ? "Aller à l'annulation" : null,
        primaryAction: () => setTab("cancel"),
        enabled: canCancel && !saving,
      };
    }

    if (status === "SUBMITTED") {
      return {
        tone: "blue",
        title: "Action du moment : Facturer",
        desc: isCash
          ? "Créez la préfacture, puis encaissez au bureau."
          : "Créez la préfacture puis envoyez le lien ou la référence au FBO.",
        primaryLabel: "Aller à la facturation",
        primaryAction: () => setTab("billing"),
        enabled: !saving,
      };
    }

    if (status === "INVOICED") {
      if (isCash) {
        return {
          tone: "amber",
          title: "Action du moment : Encaisser espèces",
          desc: "Encaissez au bureau puis marquez la commande payée.",
          primaryLabel: "Aller au paiement",
          primaryAction: () => setTab("payment"),
          enabled: !saving,
        };
      }

      if (isAutoPayment) {
        return {
          tone: "blue",
          title: "Action du moment : Attendre la confirmation PayDunya",
          desc: "Le FBO doit finaliser le paiement via le lien envoyé. Dès confirmation, la commande passera automatiquement à PAID.",
          primaryLabel: "Rafraîchir",
          primaryAction: load,
          enabled: !saving,
        };
      }

      return {
        tone: "blue",
        title: "Action du moment : Enregistrer la preuve",
        desc: "Quand la preuve est reçue, marquez-la reçue.",
        primaryLabel: "Aller au paiement",
        primaryAction: () => setTab("payment"),
        enabled: !saving,
      };
    }

    if (status === "PAYMENT_PROOF_RECEIVED") {
      return {
        tone: "blue",
        title: "Action du moment : Valider paiement",
        desc: "Après vérification de la preuve, validez le paiement.",
        primaryLabel: "Aller au paiement",
        primaryAction: () => setTab("payment"),
        enabled: !saving,
      };
    }

    if (status === "PAID") {
      return {
        tone: "emerald",
        title: "Action du moment : Préparer le colis",
        desc: "Cette action décrémentera le stock et marquera le colis prêt.",
        primaryLabel: "Aller à la préparation",
        primaryAction: () => setTab("preparation"),
        enabled: !saving,
      };
    }

    if (status === "READY") {
      return {
        tone: "emerald",
        title: "Action du moment : Clôturer",
        desc: "Quand le retrait ou la livraison est effectué(e), clôturez la commande.",
        primaryLabel: "Aller à la clôture",
        primaryAction: () => setTab("fulfillment"),
        enabled: !saving,
      };
    }

    return {
      tone: "gray",
      title: "Action du moment",
      desc: "Aucune action disponible pour ce statut.",
      primaryLabel: null,
      primaryAction: null,
      enabled: false,
    };
  }, [
    status,
    stockRestored,
    emptyOrder,
    canCancel,
    saving,
    isCash,
    isAutoPayment,
  ]);

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

      const result = await ordersService.invoice(id, body);
      await handleActionResult(result, "Préfacture déjà créée.");
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
        paymentProofUrl: normalizeStr(proofUrl) || undefined,
        paymentRef: normalizeStr(proofRef) || undefined,
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
        e?.response?.data?.message || "Impossible de marquer le colis prêt",
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
/*     <div className="space-y-4">
      <OrderDetailHeader
        order={order}
        saving={saving}
        canCancel={canCancel}
        onRefresh={load}
        onGoCancel={() => setTab("cancel")}
      /> */

      {error && (
        <Alert tone="red" title="Erreur">
          {error}
        </Alert>
      )}

      {info && (
        <Alert tone="blue" title="Information">
          {info}
        </Alert>
      )}

      <OrderActionPanel order={order} nextAction={nextAction} saving={saving} />

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

      {activeTab === "billing" && (
        <OrderBillingTab
          {...commonTabProps}
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
        />
      )}

      {activeTab === "payment" && (
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
        />
      )}

      {activeTab === "preparation" && (
        <OrderPreparationTab
          {...commonTabProps}
          canPrepare={canPrepare}
          packingNote={packingNote}
          setPackingNote={setPackingNote}
          onPrepare={doPrepare}
          stockSummary={stockSummary}
        />
      )}

      {activeTab === "fulfillment" && (
        <OrderFulfillmentTab
          {...commonTabProps}
          canFulfill={canFulfill}
          deliveryTracking={deliveryTracking}
          setDeliveryTracking={setDeliveryTracking}
          fulfillNote={fulfillNote}
          setFulfillNote={setFulfillNote}
          onFulfill={doFulfill}
        />
      )}

      {activeTab === "history" && (
        <OrderHistoryTab
          {...commonTabProps}
          logs={Array.isArray(order.logs) ? order.logs : []}
        />
      )}

      {activeTab === "cancel" && canCancel && (
        <OrderCancelPanel
          {...commonTabProps}
          canCancel={canCancel}
          cancelReason={cancelReason}
          setCancelReason={setCancelReason}
          onCancel={doCancel}
        />
      )}
    </div>
  );
}
