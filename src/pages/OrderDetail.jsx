// src/pages/OrderDetail.jsx
// Page de détail d'une commande (Admin) — Workflow Facturier -> Préparateur -> Fulfillment

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

  // ---------- permissions / buttons ----------
  const status = order?.status;

  const canInvoice = status === "SUBMITTED";
  const canProof = status === "INVOICED";
  const canVerify = status === "PAYMENT_PROOF_RECEIVED";
  const canPrepare = status === "PAID";
  const canFulfill = status === "READY";
  const canCancel = status && !["FULFILLED", "CANCELLED"].includes(status);

  const isCash = order?.paymentMode === "ESPECES";
  const canCashPay =
    isCash && ["SUBMITTED", "INVOICED"].includes(status) && !saving;

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

      const body = {
        note: normalizeStr(verifyNote) || undefined,
      };

      await ordersService.verifyPayment(id, body);
      await load();
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

      // Encaissement espèces (endpoint /pay)
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
    const msg = order?.whatsappMessage
      ? encodeURIComponent(order.whatsappMessage)
      : "";
    return `https://wa.me/?text=${msg}`;
  }, [order?.whatsappMessage]);

  // ---------- timeline (cash flow vs electronic flow) ----------
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
  }, [order, status]);

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
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">{order.id}</div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={load} disabled={saving}>
            Rafraîchir
          </button>

          {canCancel && (
            <button
              className="btn"
              onClick={() =>
                document
                  .getElementById("cancel_box")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              disabled={saving}
            >
              Annuler
            </button>
          )}
        </div>
      </div>

      {/* Error banner (ne casse pas la page) */}
      {error && (
        <div className="card p-3 border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Timeline */}
      <div className="card p-4">
        <div className="font-semibold mb-3">Traitement</div>
        <div
          className={`grid grid-cols-1 gap-2 ${
            steps.length === 5 ? "md:grid-cols-5" : "md:grid-cols-6"
          }`}
        >
          {steps.map((st) => (
            <div
              key={st.key}
              className={`rounded-xl border p-3 text-sm ${
                st.done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-medium">{st.label}</div>
                <div
                  className={`text-xs ${
                    st.done ? "text-emerald-700" : "text-gray-500"
                  }`}
                >
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
              Motif :{" "}
              <span className="font-medium">{order.cancelReason || "—"}</span>
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

          <Row
            label="Numéro FBO"
            value={<span className="font-mono">{order.fboNumero}</span>}
          />
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

          <Row
            label="PaymentMode"
            value={<PaymentModeBadge mode={order.paymentMode} />}
          />
          <Row label="DeliveryMode" value={order.deliveryMode} />

          <div className="pt-2 border-t" />

          <div className="font-semibold">Préfacture</div>
          <Row label="Référence" value={order.factureReference || "—"} />
          <Row label="WhatsApp To" value={order.factureWhatsappTo || "—"} />
          <Row
            label="Lien paiement"
            value={
              order.paymentLink ? (
                <a
                  className="underline"
                  href={order.paymentLink}
                  target="_blank"
                  rel="noreferrer"
                >
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
            <button
              className="btn"
              onClick={copyWhatsApp}
              disabled={!order.whatsappMessage || saving}
              title="Copier le message WhatsApp"
            >
              Copier WhatsApp
            </button>

            <a
              className={`btn ${
                !order.whatsappMessage || saving
                  ? "pointer-events-none opacity-50"
                  : ""
              }`}
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
            <div className="text-sm text-gray-500">
              Aucun message WhatsApp généré
            </div>
          )}
        </div>

        {/* Col 3 */}
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Totaux</div>

          <Row label="Produits" value={formatFcfa(order.totalProduitsFcfa)} />
          <Row label="Livraison" value={formatFcfa(order.fraisLivraisonFcfa)} />
          <Row
            label={<span className="font-semibold">Total</span>}
            value={
              <span className="text-lg font-semibold">
                {formatFcfa(order.totalFcfa)}
              </span>
            }
          />

          <div className="pt-2 border-t" />

          <Row label="Total CC" value={String(order.totalCc)} />
          <Row label="Total poids (Kg)" value={String(order.totalPoidsKg)} />
        </div>
      </div>

      {/* WORKFLOW ACTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Facturation */}
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Facturation (Facturier)</div>

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
                ? "Lien de paiement (optionnel — paiement espèces)"
                : "Lien de paiement (Wave/OM/autre)"
            }
          >
            <input
              className="input"
              value={paymentLink}
              onChange={(e) => setPaymentLink(e.target.value)}
              placeholder="https://..."
              disabled={!canInvoice || saving}
            />
          </Field>

          <Field label="Note (optionnel)">
            <textarea
              className="input min-h-[90px]"
              value={invoiceNote}
              onChange={(e) => setInvoiceNote(e.target.value)}
              placeholder="Préfacture envoyée au FBO..."
              disabled={!canInvoice || saving}
            />
          </Field>

          <div className="flex gap-2 flex-wrap">
            <button
              className="btn-primary"
              onClick={doInvoice}
              disabled={!canInvoice || saving}
              title="SUBMITTED → INVOICED"
            >
              {saving ? "..." : "Facturer / Envoyer lien"}
            </button>

            <span className="text-xs text-gray-500 self-center">
              Actif uniquement si statut = SUBMITTED
            </span>
          </div>
        </div>

        {/* Paiement */}
        <div className="card p-4 space-y-4">
          <div className="font-semibold">Paiement (Facturier)</div>

          {/* Paiement espèces */}
          {isCash && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="text-sm font-semibold text-amber-800">
                Paiement espèces
              </div>
              <div className="text-xs text-amber-700 mt-1">
                Vous pouvez encaisser directement au bureau (SUBMITTED ou
                INVOICED → PAID).
              </div>

              <div className="mt-3">
                <button
                  className="btn-primary"
                  onClick={doCashPay}
                  disabled={!canCashPay}
                  title="Encaissement espèces (SUBMITTED/INVOICED → PAID)"
                >
                  {saving ? "..." : "Encaisser espèces"}
                </button>
              </div>
            </div>
          )}

          {/* Paiement électronique (preuve + validation) */}
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
                  <button
                    className="btn"
                    onClick={doProof}
                    disabled={!canProof || saving}
                    title="INVOICED → PAYMENT_PROOF_RECEIVED"
                  >
                    {saving ? "..." : "Marquer preuve reçue"}
                  </button>

                  <span className="text-xs text-gray-500">
                    Actif si statut = INVOICED
                  </span>
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
                  <button
                    className="btn-primary"
                    onClick={doVerifyPayment}
                    disabled={!canVerify || saving}
                    title="PAYMENT_PROOF_RECEIVED → PAID"
                  >
                    {saving ? "..." : "Valider paiement"}
                  </button>

                  <span className="text-xs text-gray-500">
                    Actif si statut = PAYMENT_PROOF_RECEIVED
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Preuve enregistrée (affichage) */}
          {(order.paymentProofUrl || order.paymentRef || order.paymentProofNote) && (
            <div className="rounded-xl border p-3 bg-gray-50">
              <div className="text-sm font-semibold">
                Infos preuve (enregistrées)
              </div>
              <div className="text-sm text-gray-700 mt-1 space-y-1">
                <div>
                  URL :{" "}
                  {order.paymentProofUrl ? (
                    <a
                      className="underline"
                      href={order.paymentProofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
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
      </div>

      {/* Préparation / Fulfillment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Préparation (Préparateur)</div>

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
            <button
              className="btn-primary"
              onClick={doPrepare}
              disabled={!canPrepare || saving}
              title="PAID → READY"
            >
              {saving ? "..." : "Marquer colis prêt"}
            </button>
            <span className="text-xs text-gray-500 self-center">
              Actif si statut = PAID
            </span>
          </div>
        </div>

        <div className="card p-4 space-y-3">
          <div className="font-semibold">Clôture (Retrait/Livraison)</div>

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
            <button
              className="btn-primary"
              onClick={doFulfill}
              disabled={!canFulfill || saving}
              title="READY → FULFILLED"
            >
              {saving ? "..." : "Clôturer (retiré/livré)"}
            </button>
            <span className="text-xs text-gray-500 self-center">
              Actif si statut = READY
            </span>
          </div>
        </div>
      </div>

      {/* Cancel */}
      {canCancel && (
        <div
          id="cancel_box"
          className="card p-4 space-y-3 border border-red-200"
        >
          <div className="font-semibold text-red-700">Annulation</div>

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
            <button className="btn" onClick={doCancel} disabled={saving}>
              Annuler la commande
            </button>
            <span className="text-xs text-gray-500 self-center">
              Possible tant que la commande n’est pas clôturée/annulée.
            </span>
          </div>
        </div>
      )}

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Items</div>
          <div className="text-sm text-gray-500">
            {order.items?.length || 0} ligne(s)
          </div>
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
                    <td className="p-3 font-mono whitespace-nowrap">
                      {it.product?.sku}
                    </td>
                    <td className="p-3">{it.product?.nom}</td>
                    <td className="p-3 whitespace-nowrap">{it.qty}</td>
                    <td className="p-3 whitespace-nowrap">
                      {formatFcfa(it.prixUnitaireFcfa)}
                    </td>
                    <td className="p-3 font-semibold whitespace-nowrap">
                      {formatFcfa(it.lineTotalFcfa)}
                    </td>
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

      {/* Logs (optional) */}
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
                      <div className="text-xs text-gray-500">
                        {formatDateTime(l.createdAt)}
                      </div>
                    </div>
                    {l.note && (
                      <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {l.note}
                      </div>
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
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
        isCash ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
      }`}
    >
      {isCash ? "💵 Paiement espèces" : "💳 Paiement électronique"}
    </span>
  );
}