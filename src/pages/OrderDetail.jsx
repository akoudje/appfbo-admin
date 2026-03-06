// src/pages/OrderDetail.jsx
// Page de détail d'une commande (Admin) — Workflow Facturier -> Préparateur -> Fulfillment
// ✅ Action du moment (CTA unique)
// ✅ Sections repliables
// ✅ Warning commande vide
// ✅ Header enrichi (paiement + livraison)

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ordersService } from "../services/ordersService";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatFcfa } from "../lib/format";

const STATUSES = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumise",
  INVOICED: "Préfacturée",
  PAYMENT_PROOF_RECEIVED: "Preuve reçue",
  PAID: "Payée (vérifiée)",
  READY: "Colis prêt",
  FULFILLED: "Clôturée",
  CANCELLED: "Annulée",
};

function normalizeStr(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/* =========================================================
   UI helpers
   ========================================================= */
function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    red: "bg-red-100 text-red-700 border-red-200",
    violet: "bg-violet-100 text-violet-700 border-violet-200",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border",
        tones[tone] || tones.gray
      )}
    >
      {children}
    </span>
  );
}

function PrimaryButton({ className = "", ...props }) {
  return (
    <button
      {...props}
      className={cx(
        "btn-primary",
        "inline-flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

function SecondaryButton({ className = "", ...props }) {
  return (
    <button
      {...props}
      className={cx(
        "btn",
        "inline-flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    />
  );
}

function Alert({ tone = "amber", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };
  return (
    <div className={cx("card p-3 border", tones[tone] || tones.amber)}>
      {title && <div className="font-semibold text-sm mb-1">{title}</div>}
      <div className="text-sm">{children}</div>
    </div>
  );
}

function AccordionSection({
  id,
  title,
  subtitle,
  defaultOpen = false,
  children,
  right,
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));

  useEffect(() => {
    // reset open when id changes (navigating orders)
    setOpen(Boolean(defaultOpen));
  }, [id, defaultOpen]);

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 border-b bg-white hover:bg-gray-50 transition"
      >
        <div className="min-w-0 text-left">
          <div className="font-semibold">{title}</div>
          {subtitle ? (
            <div className="text-xs text-gray-500 mt-0.5">{subtitle}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {right}
          <span
            className={cx(
              "inline-flex items-center justify-center w-8 h-8 rounded-lg border",
              open ? "bg-emerald-50 border-emerald-200" : "bg-white border-gray-200"
            )}
            aria-hidden="true"
          >
            <svg
              className={cx(
                "w-4 h-4 text-gray-700 transition-transform",
                open ? "rotate-180" : ""
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </button>

      {open ? <div className="p-4">{children}</div> : null}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function PaymentModeBadge({ mode }) {
  if (!mode) return null;
  const isCash = mode === "ESPECES";
  return (
    <Badge tone={isCash ? "amber" : "blue"}>
      {isCash ? "💵 Espèces" : "💳 Mobile money"}
      <span className="opacity-70">{mode}</span>
    </Badge>
  );
}

function DeliveryModeBadge({ mode }) {
  if (!mode) return null;
  const isPickup = mode === "RETRAIT_SITE_FLP";
  return (
    <Badge tone={isPickup ? "violet" : "gray"}>
      {isPickup ? "🏢 Retrait FLP" : "🚚 Livraison"}
      <span className="opacity-70">{mode}</span>
    </Badge>
  );
}

export default function OrderDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  // ---- Forms state ----
  const [invoiceRef, setInvoiceRef] = useState("");
  const [invoiceWaTo, setInvoiceWaTo] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [invoiceNote, setInvoiceNote] = useState("");

  const [proofUrl, setProofUrl] = useState("");
  const [proofRef, setProofRef] = useState("");
  const [proofNote, setProofNote] = useState("");

  const [verifyNote, setVerifyNote] = useState("");
  const [packingNote, setPackingNote] = useState("");

  const [deliveryTracking, setDeliveryTracking] = useState("");
  const [fulfillNote, setFulfillNote] = useState("");

  const [cancelReason, setCancelReason] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await ordersService.getById(id);
      setOrder(data);

      // hydrate forms from order (si déjà rempli)
      setInvoiceRef(data?.factureReference || "");
      setInvoiceWaTo(data?.factureWhatsappTo || "");
      setPaymentLink(data?.paymentLink || "");

      setProofUrl(data?.paymentProofUrl || "");
      setProofRef(data?.paymentRef || "");
      setProofNote(data?.paymentProofNote || "");

      setPackingNote(data?.packingNote || "");
      setDeliveryTracking(data?.deliveryTracking || "");

      // notes “action”
      setFulfillNote("");
      setVerifyNote("");
      setInvoiceNote("");
      setCancelReason("");
    } catch {
      setError("Impossible de charger la commande");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const status = order?.status;
  const isCash = order?.paymentMode === "ESPECES";

  const canInvoice = status === "SUBMITTED";
  const canProof = status === "INVOICED" && !isCash;
  const canVerify = status === "PAYMENT_PROOF_RECEIVED" && !isCash;
  const canPrepare = status === "PAID";
  const canFulfill = status === "READY";
  const canCancel = status && !["FULFILLED", "CANCELLED"].includes(status);

  const canCashPay = isCash && ["SUBMITTED", "INVOICED"].includes(status) && !saving;

  // ---------- actions ----------
  const doInvoice = async () => {
    try {
      setSaving(true);
      setError("");

      const body = {
        factureReference: normalizeStr(invoiceRef) || undefined,
        paymentLink: normalizeStr(paymentLink) || undefined,
        whatsappTo: normalizeStr(invoiceWaTo) || undefined,
        note: normalizeStr(invoiceNote) || undefined,
      };

      await ordersService.invoice(id, body);
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

      const body = {
        paymentProofUrl: normalizeStr(proofUrl) || undefined,
        paymentRef: normalizeStr(proofRef) || undefined,
        note: normalizeStr(proofNote) || undefined,
      };

      await ordersService.proof(id, body);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'enregistrer la preuve");
    } finally {
      setSaving(false);
    }
  };

  const doVerifyPayment = async () => {
    try {
      setSaving(true);
      setError("");

      const body = {
        note: normalizeStr(verifyNote) || undefined,
      };

      await ordersService.verifyPayment(id, body);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de valider le paiement");
    } finally {
      setSaving(false);
    }
  };

  const doCashPay = async () => {
    try {
      setSaving(true);
      setError("");

      await ordersService.pay(id);
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible d'encaisser le paiement espèces"
      );
    } finally {
      setSaving(false);
    }
  };

  const doPrepare = async () => {
    try {
      setSaving(true);
      setError("");

      const body = {
        packingNote: normalizeStr(packingNote) || undefined,
      };

      await ordersService.prepare(id, body);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de marquer le colis prêt");
    } finally {
      setSaving(false);
    }
  };

  const doFulfill = async () => {
    try {
      setSaving(true);
      setError("");

      const body = {
        deliveryTracking: normalizeStr(deliveryTracking) || undefined,
        note: normalizeStr(fulfillNote) || undefined,
      };

      await ordersService.fulfill(id, body);
      await load();
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

      await ordersService.cancel(id, { reason: normalizeStr(cancelReason) });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'annuler");
    } finally {
      setSaving(false);
    }
  };

  // ---------- WhatsApp helpers ----------
  const copyWhatsApp = async () => {
    const text = order?.whatsappMessage || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const waLink = useMemo(() => {
    const msg = order?.whatsappMessage ? encodeURIComponent(order.whatsappMessage) : "";
    return `https://wa.me/?text=${msg}`;
  }, [order?.whatsappMessage]);

  // ---------- timeline ----------
  const steps = useMemo(() => {
    const s = status;
    const cash = order?.paymentMode === "ESPECES";

    const flow = cash
      ? ["SUBMITTED", "INVOICED", "PAID", "READY", "FULFILLED"]
      : ["SUBMITTED", "INVOICED", "PAYMENT_PROOF_RECEIVED", "PAID", "READY", "FULFILLED"];

    const done = (name) => {
      const idx = flow.indexOf(name);
      const cur = flow.indexOf(s);
      return cur >= idx && cur !== -1;
    };

    const base = [
      { key: "SUBMITTED", label: "Soumise", at: order?.submittedAt },
      { key: "INVOICED", label: "Préfacture", at: order?.invoicedAt },
    ];

    const proof = cash
      ? []
      : [{ key: "PAYMENT_PROOF_RECEIVED", label: "Preuve reçue", at: order?.proofReceivedAt }];

    const tail = [
      { key: "PAID", label: "Paiement OK", at: order?.paidAt },
      { key: "READY", label: "Colis prêt", at: order?.preparedAt },
      { key: "FULFILLED", label: "Clôturée", at: order?.fulfilledAt },
    ];

    return [...base, ...proof, ...tail].map((st) => ({ ...st, done: done(st.key) }));
  }, [order, status]);

  // ---------- Warning commande vide ----------
  const emptyOrder = useMemo(() => {
    const itemCount = Array.isArray(order?.items) ? order.items.length : 0;
    const total = Number(order?.totalFcfa || 0);
    // commande “vide” = aucune ligne OU total = 0 (selon tes besoins)
    return itemCount === 0 || total === 0;
  }, [order]);

  // ---------- Action du moment (CTA unique) ----------
  const nextAction = useMemo(() => {
    const s = status;
    const cash = isCash;

    if (!s) return null;
    if (s === "CANCELLED") {
      return {
        tone: "red",
        title: "Commande annulée",
        desc: "Aucune action requise.",
        primaryLabel: null,
        primaryAction: null,
        enabled: false,
      };
    }
    if (s === "FULFILLED") {
      return {
        tone: "emerald",
        title: "Commande clôturée",
        desc: "Aucune action requise.",
        primaryLabel: null,
        primaryAction: null,
        enabled: false,
      };
    }

    // Bloque si commande vide (pour éviter de guider l’opérateur vers facturation inutile)
    if (emptyOrder && ["SUBMITTED", "INVOICED"].includes(s)) {
      return {
        tone: "amber",
        title: "Commande incomplète",
        desc: "Aucun item / total à 0. Recommandation : annuler (ou demander au FBO de refaire).",
        primaryLabel: canCancel ? "Aller à l'annulation" : null,
        primaryAction: () =>
          document.getElementById("cancel_box")?.scrollIntoView({ behavior: "smooth" }),
        enabled: canCancel && !saving,
      };
    }

    if (s === "SUBMITTED") {
      return {
        tone: "blue",
        title: "Action du moment : Facturer",
        desc: cash
          ? "Créez la préfacture, puis envoyez la référence au FBO (paiement au bureau)."
          : "Créez la préfacture et envoyez le lien de paiement (Wave/OM) au FBO.",
        primaryLabel: "Facturer / Envoyer",
        primaryAction: doInvoice,
        enabled: canInvoice && !saving,
      };
    }

    if (s === "INVOICED") {
      if (cash) {
        return {
          tone: "amber",
          title: "Action du moment : Encaisser espèces",
          desc: "Encaissez au bureau puis marquez la commande payée.",
          primaryLabel: "Encaisser espèces",
          primaryAction: doCashPay,
          enabled: canCashPay && !saving,
        };
      }
      return {
        tone: "blue",
        title: "Action du moment : Preuve de paiement",
        desc: "Quand la preuve est reçue (WhatsApp/capture), marquez-la reçue.",
        primaryLabel: "Marquer preuve reçue",
        primaryAction: doProof,
        enabled: canProof && !saving,
      };
    }

    if (s === "PAYMENT_PROOF_RECEIVED") {
      return {
        tone: "blue",
        title: "Action du moment : Valider paiement",
        desc: "Après vérification (Wave/OM), validez le paiement.",
        primaryLabel: "Valider paiement",
        primaryAction: doVerifyPayment,
        enabled: canVerify && !saving,
      };
    }

    if (s === "PAID") {
      return {
        tone: "emerald",
        title: "Action du moment : Préparer le colis",
        desc: "Préparez le colis puis marquez-le prêt.",
        primaryLabel: "Marquer colis prêt",
        primaryAction: doPrepare,
        enabled: canPrepare && !saving,
      };
    }

    if (s === "READY") {
      return {
        tone: "emerald",
        title: "Action du moment : Clôturer",
        desc: "Quand le FBO a retiré / la livraison est faite, clôturez la commande.",
        primaryLabel: "Clôturer",
        primaryAction: doFulfill,
        enabled: canFulfill && !saving,
      };
    }

    // fallback
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
    isCash,
    saving,
    canInvoice,
    canProof,
    canVerify,
    canPrepare,
    canFulfill,
    canCancel,
    canCashPay,
    emptyOrder,
  ]);

  // ---------- Open defaults for accordion ----------
  const openFacturation = status === "SUBMITTED";
  const openPaiement =
    (status === "INVOICED" && !isCash) ||
    (status === "PAYMENT_PROOF_RECEIVED" && !isCash) ||
    (status === "INVOICED" && isCash) ||
    (status === "SUBMITTED" && isCash);

  const openPreparation = status === "PAID";
  const openCloture = status === "READY";
  const openCancel = canCancel && (emptyOrder || status === "SUBMITTED" || status === "INVOICED");

  if (loading) return <div className="text-sm text-gray-500">Chargement…</div>;
  if (!order) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/orders" className="text-sm text-gray-600 underline">
            ← Retour commandes
          </Link>

          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">Détail commande</h1>
            <StatusBadge status={order.status} />
            <span className="text-xs text-gray-500">
              ({STATUSES[order.status] || order.status})
            </span>

            {/* ✅ Header enrichi */}
            <PaymentModeBadge mode={order.paymentMode} />
            <DeliveryModeBadge mode={order.deliveryMode} />
          </div>

          <div className="text-xs text-gray-500 font-mono mt-1">{order.id}</div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <SecondaryButton className="btn" onClick={load} disabled={saving}>
            Rafraîchir
          </SecondaryButton>

          {canCancel && (
            <SecondaryButton
              className="btn"
              onClick={() =>
                document.getElementById("cancel_box")?.scrollIntoView({ behavior: "smooth" })
              }
              disabled={saving}
            >
              Annuler
            </SecondaryButton>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Alert tone="red" title="Erreur">
          {error}
        </Alert>
      )}

      {/* ✅ Warning commande vide */}
      {emptyOrder && (
        <Alert
          tone="amber"
          title="Commande potentiellement incomplète"
        >
          Cette commande contient <b>{order.items?.length || 0} item(s)</b> et un total{" "}
          <b>{formatFcfa(order.totalFcfa || 0)}</b>. Si c’est une sortie “abandonnée” côté FBO,
          recommande : <b>annuler</b> ou contacter le FBO pour qu’il recommence.
        </Alert>
      )}

      {/* ✅ Action du moment */}
      {nextAction && (
        <div className="card p-4 border border-gray-200">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold">{nextAction.title}</div>
                <Badge tone={nextAction.tone || "gray"}>
                  {order.status}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 mt-1">{nextAction.desc}</div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {nextAction.primaryLabel ? (
                <PrimaryButton
                  className="btn-primary"
                  onClick={nextAction.primaryAction}
                  disabled={!nextAction.enabled}
                >
                  {saving ? "..." : nextAction.primaryLabel}
                </PrimaryButton>
              ) : (
                <SecondaryButton className="btn" disabled>
                  Aucune action
                </SecondaryButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="card p-4">
        <div className="font-semibold mb-3">Traitement</div>
        <div
          className={cx(
            "grid grid-cols-1 gap-2",
            steps.length === 5 ? "md:grid-cols-5" : "md:grid-cols-6"
          )}
        >
          {steps.map((st) => (
            <div
              key={st.key}
              className={cx(
                "rounded-xl border p-3 text-sm",
                st.done ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{st.label}</div>
                <div className={cx("text-xs", st.done ? "text-emerald-700" : "text-gray-500")}>
                  {st.done ? "OK" : "—"}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {st.at ? formatDateTime(st.at) : "—"}
              </div>
            </div>
          ))}
        </div>

        {order.status === "CANCELLED" && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
            <div className="font-semibold text-red-700">Commande annulée</div>
            <div className="text-red-700 mt-1">
              Motif : <span className="font-medium">{order.cancelReason || "—"}</span>
            </div>
            <div className="text-xs text-red-700 mt-1">
              {order.cancelledAt ? formatDateTime(order.cancelledAt) : ""}
            </div>
          </div>
        )}
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Col 1 */}
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Client FBO</div>

          <Row label="Numéro FBO" value={<span className="font-mono">{order.fboNumero}</span>} />
          <Row label="Nom" value={order.fboNomComplet} />
          <Row label="Grade" value={order.fboGrade} />
          <Row label="Point de vente" value={order.pointDeVente} />

          <div className="pt-2 border-t" />

          <Row label="Créée" value={formatDateTime(order.createdAt)} />
          <Row label="Soumise" value={formatDateTime(order.submittedAt)} />
          <Row label="Payée (OK)" value={formatDateTime(order.paidAt)} />
        </div>

        {/* Col 2 */}
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Paiement & Livraison</div>

          <Row label="PaymentMode" value={<PaymentModeBadge mode={order.paymentMode} />} />
          <Row label="DeliveryMode" value={<DeliveryModeBadge mode={order.deliveryMode} />} />

          <div className="pt-2 border-t" />

          <div className="font-semibold">Préfacture</div>
          <Row label="Référence" value={order.factureReference || "—"} />
          <Row label="WhatsApp To" value={order.factureWhatsappTo || "—"} />
          <Row
            label="Lien paiement"
            value={
              order.paymentLink ? (
                <a className="underline" href={order.paymentLink} target="_blank" rel="noreferrer">
                  Ouvrir
                </a>
              ) : (
                "—"
              )
            }
          />

          <div className="pt-2 border-t" />

          <div className="font-semibold">WhatsApp (soumission FBO)</div>
          <div className="flex gap-2 flex-wrap">
            <SecondaryButton
              className="btn"
              onClick={copyWhatsApp}
              disabled={!order.whatsappMessage || saving}
              title="Copier le message WhatsApp"
            >
              Copier WhatsApp
            </SecondaryButton>

            <a
              className={cx(
                "btn",
                (!order.whatsappMessage || saving) && "pointer-events-none opacity-50"
              )}
              href={waLink}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir WhatsApp
            </a>
          </div>

          {order.whatsappMessage ? (
            <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap border rounded-xl p-3 bg-gray-50 max-h-44 overflow-auto">
              {order.whatsappMessage}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Aucun message WhatsApp généré</div>
          )}
        </div>

        {/* Col 3 */}
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Totaux</div>

          <Row label="Produits" value={formatFcfa(order.totalProduitsFcfa)} />
          <Row label="Livraison" value={formatFcfa(order.fraisLivraisonFcfa)} />
          <Row
            label={<span className="font-semibold">Total</span>}
            value={<span className="text-lg font-semibold">{formatFcfa(order.totalFcfa)}</span>}
          />

          <div className="pt-2 border-t" />

          <Row label="Total CC" value={String(order.totalCc)} />
          <Row label="Total poids (Kg)" value={String(order.totalPoidsKg)} />
        </div>
      </div>

      {/* ✅ Sections repliables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Facturation */}
        <AccordionSection
          id={id}
          title="Facturation (Facturier)"
          subtitle="SUBMITTED → INVOICED"
          defaultOpen={openFacturation}
          right={<Badge tone={canInvoice ? "blue" : "gray"}>{canInvoice ? "Action" : "—"}</Badge>}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Field label="Référence préfacture (optionnel)">
                <input
                  className="input"
                  value={invoiceRef}
                  onChange={(e) => setInvoiceRef(e.target.value)}
                  placeholder="PF-2026-00012"
                  disabled={!canInvoice || saving}
                />
              </Field>

              <Field label="WhatsApp To (optionnel)">
                <input
                  className="input"
                  value={invoiceWaTo}
                  onChange={(e) => setInvoiceWaTo(e.target.value)}
                  placeholder="+225..."
                  disabled={!canInvoice || saving}
                />
              </Field>
            </div>

            <Field
              label={
                isCash
                  ? "Lien de paiement (désactivé si espèces)"
                  : "Lien de paiement (Wave/OM/autre)"
              }
            >
              <input
                className="input"
                value={paymentLink}
                onChange={(e) => setPaymentLink(e.target.value)}
                placeholder={isCash ? "Paiement espèces : pas de lien" : "https://..."}
                disabled={!canInvoice || saving || isCash}
              />
            </Field>

            <Field label="Note (optionnel)">
              <textarea
                className="input min-h-[90px]"
                value={invoiceNote}
                onChange={(e) => setInvoiceNote(e.target.value)}
                placeholder={
                  isCash
                    ? "Préfacture prête. Envoyer la référence au FBO pour paiement au bureau."
                    : "Préfacture envoyée au FBO + lien de paiement..."
                }
                disabled={!canInvoice || saving}
              />
            </Field>

            <div className="flex gap-2 flex-wrap">
              <PrimaryButton
                className="btn-primary"
                onClick={doInvoice}
                disabled={!canInvoice || saving}
                title="SUBMITTED → INVOICED"
              >
                {saving ? "..." : "Facturer / Envoyer"}
              </PrimaryButton>

              <span className="text-xs text-gray-500 self-center">
                Actif uniquement si statut = SUBMITTED
              </span>
            </div>
          </div>
        </AccordionSection>

        {/* Paiement */}
        <AccordionSection
          id={id}
          title="Paiement (Facturier)"
          subtitle={isCash ? "Espèces : encaissement direct" : "Mobile money : preuve + validation"}
          defaultOpen={openPaiement}
          right={
            <Badge tone={isCash ? "amber" : "blue"}>
              {isCash ? "Cash" : "MM"}
            </Badge>
          }
        >
          <div className="space-y-4">
            {/* Paiement espèces */}
            {isCash && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-semibold text-amber-800">Paiement espèces</div>
                <div className="text-xs text-amber-700 mt-1">
                  Encaissez au bureau puis marquez la commande payée (SUBMITTED/INVOICED → PAID).
                </div>

                <div className="mt-3">
                  <PrimaryButton
                    className="btn-primary"
                    onClick={doCashPay}
                    disabled={!canCashPay}
                    title="Encaissement espèces (SUBMITTED/INVOICED → PAID)"
                  >
                    {saving ? "..." : "Encaisser espèces"}
                  </PrimaryButton>
                </div>
              </div>
            )}

            {/* Paiement électronique */}
            {!isCash && (
              <>
                <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                  <div className="text-sm font-semibold">Preuve de paiement</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <Field label="Preuve URL (optionnel)">
                      <input
                        className="input"
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        placeholder="https://..."
                        disabled={!canProof || saving}
                      />
                    </Field>

                    <Field label="Référence transaction (optionnel)">
                      <input
                        className="input"
                        value={proofRef}
                        onChange={(e) => setProofRef(e.target.value)}
                        placeholder="WAVE-XXXX / OM-XXXX"
                        disabled={!canProof || saving}
                      />
                    </Field>
                  </div>

                  <Field label="Note preuve (optionnel)">
                    <textarea
                      className="input min-h-[90px]"
                      value={proofNote}
                      onChange={(e) => setProofNote(e.target.value)}
                      placeholder="Capture reçue par WhatsApp..."
                      disabled={!canProof || saving}
                    />
                  </Field>

                  <div className="flex gap-2 flex-wrap items-center">
                    <SecondaryButton
                      className="btn"
                      onClick={doProof}
                      disabled={!canProof || saving}
                      title="INVOICED → PAYMENT_PROOF_RECEIVED"
                    >
                      {saving ? "..." : "Marquer preuve reçue"}
                    </SecondaryButton>

                    <span className="text-xs text-gray-500">Actif si statut = INVOICED</span>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
                  <div className="text-sm font-semibold">Validation paiement</div>

                  <Field label="Note validation (optionnel)">
                    <input
                      className="input"
                      value={verifyNote}
                      onChange={(e) => setVerifyNote(e.target.value)}
                      placeholder="Paiement vérifié sur Wave..."
                      disabled={!canVerify || saving}
                    />
                  </Field>

                  <div className="flex gap-2 flex-wrap items-center">
                    <PrimaryButton
                      className="btn-primary"
                      onClick={doVerifyPayment}
                      disabled={!canVerify || saving}
                      title="PAYMENT_PROOF_RECEIVED → PAID"
                    >
                      {saving ? "..." : "Valider paiement"}
                    </PrimaryButton>

                    <span className="text-xs text-gray-500">
                      Actif si statut = PAYMENT_PROOF_RECEIVED
                    </span>
                  </div>
                </div>
              </>
            )}

            {/* Preuve enregistrée */}
            {(order.paymentProofUrl || order.paymentRef || order.paymentProofNote) && (
              <div className="rounded-xl border p-3 bg-gray-50">
                <div className="text-sm font-semibold">Infos preuve (enregistrées)</div>
                <div className="text-sm text-gray-700 mt-1 space-y-1">
                  <div>
                    URL :{" "}
                    {order.paymentProofUrl ? (
                      <a className="underline" href={order.paymentProofUrl} target="_blank" rel="noreferrer">
                        Ouvrir
                      </a>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div>Réf : {order.paymentRef || "—"}</div>
                  <div className="text-xs text-gray-600 whitespace-pre-wrap">
                    {order.paymentProofNote || ""}
                  </div>
                </div>
              </div>
            )}
          </div>
        </AccordionSection>
      </div>

      {/* Préparation / Fulfillment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <AccordionSection
          id={id}
          title="Préparation (Préparateur)"
          subtitle="PAID → READY"
          defaultOpen={openPreparation}
          right={<Badge tone={canPrepare ? "emerald" : "gray"}>{canPrepare ? "Action" : "—"}</Badge>}
        >
          <div className="space-y-3">
            <Field label="Note colis (optionnel)">
              <textarea
                className="input min-h-[90px]"
                value={packingNote}
                onChange={(e) => setPackingNote(e.target.value)}
                placeholder="1 carton + 1 sachet..."
                disabled={!canPrepare || saving}
              />
            </Field>

            <div className="flex gap-2 flex-wrap">
              <PrimaryButton
                className="btn-primary"
                onClick={doPrepare}
                disabled={!canPrepare || saving}
                title="PAID → READY"
              >
                {saving ? "..." : "Marquer colis prêt"}
              </PrimaryButton>
              <span className="text-xs text-gray-500 self-center">Actif si statut = PAID</span>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          id={id}
          title="Clôture (Retrait/Livraison)"
          subtitle="READY → FULFILLED"
          defaultOpen={openCloture}
          right={<Badge tone={canFulfill ? "emerald" : "gray"}>{canFulfill ? "Action" : "—"}</Badge>}
        >
          <div className="space-y-3">
            <Field label="Tracking livraison (optionnel)">
              <input
                className="input"
                value={deliveryTracking}
                onChange={(e) => setDeliveryTracking(e.target.value)}
                placeholder="TRACK123..."
                disabled={!canFulfill || saving}
              />
            </Field>

            <Field label="Note (optionnel)">
              <textarea
                className="input min-h-[90px]"
                value={fulfillNote}
                onChange={(e) => setFulfillNote(e.target.value)}
                placeholder="Retiré sur site / livré..."
                disabled={!canFulfill || saving}
              />
            </Field>

            <div className="flex gap-2 flex-wrap">
              <PrimaryButton
                className="btn-primary"
                onClick={doFulfill}
                disabled={!canFulfill || saving}
                title="READY → FULFILLED"
              >
                {saving ? "..." : "Clôturer (retiré/livré)"}
              </PrimaryButton>
              <span className="text-xs text-gray-500 self-center">Actif si statut = READY</span>
            </div>
          </div>
        </AccordionSection>
      </div>

      {/* Cancel (repliable aussi) */}
      {canCancel && (
        <div id="cancel_box">
          <AccordionSection
            id={id}
            title="Annulation"
            subtitle="Possible tant que la commande n’est pas clôturée / annulée"
            defaultOpen={openCancel}
            right={<Badge tone="red">Danger</Badge>}
          >
            <div className="space-y-3">
              <Alert tone="red" title="Attention">
                L’annulation est irréversible. Indique un motif clair (rupture stock, paiement non reçu, erreur, etc.).
              </Alert>

              <Field label="Motif (obligatoire)">
                <textarea
                  className="input min-h-[90px]"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Paiement non reçu / erreur / rupture stock..."
                  disabled={saving}
                />
              </Field>

              <div className="flex gap-2 flex-wrap">
                <SecondaryButton className="btn" onClick={doCancel} disabled={saving}>
                  Annuler la commande
                </SecondaryButton>
              </div>
            </div>
          </AccordionSection>
        </div>
      )}

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Items</div>
          <div className="text-sm text-gray-500">{order.items?.length || 0} ligne(s)</div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr className="text-left">
                <th className="p-3">SKU</th>
                <th className="p-3">Produit</th>
                <th className="p-3">Qty</th>
                <th className="p-3">PU</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>

            <tbody>
              {order.items?.length ? (
                order.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-3 font-mono whitespace-nowrap">{it.product?.sku}</td>
                    <td className="p-3">{it.product?.nom}</td>
                    <td className="p-3 whitespace-nowrap">{it.qty}</td>
                    <td className="p-3 whitespace-nowrap">{formatFcfa(it.prixUnitaireFcfa)}</td>
                    <td className="p-3 font-semibold whitespace-nowrap">{formatFcfa(it.lineTotalFcfa)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3" colSpan={5}>
                    Aucun item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex justify-end text-sm">
          <span className="text-gray-600 mr-2">Total :</span>
          <span className="font-semibold">{formatFcfa(order.totalFcfa)}</span>
        </div>
      </div>

      {/* Logs */}
      {Array.isArray(order.logs) && (
        <div className="card p-4">
          <div className="font-semibold mb-2">Historique</div>
          <div className="space-y-2">
            {order.logs.length ? (
              order.logs
                .slice()
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .map((l) => (
                  <div key={l.id} className="rounded-xl border p-3 bg-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{l.action}</div>
                      <div className="text-xs text-gray-500">{formatDateTime(l.createdAt)}</div>
                    </div>
                    {l.note && (
                      <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{l.note}</div>
                    )}
                  </div>
                ))
            ) : (
              <div className="text-sm text-gray-500">Aucun log</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}