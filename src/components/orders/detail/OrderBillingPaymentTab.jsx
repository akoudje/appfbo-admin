import React from "react";
import RequirePermission from "../../auth/RequirePermission";
import { Permission } from "../../../auth/permissions";
import PaymentTimeline from "./PaymentTimeline";

const GRADE_LABELS = {
  CLIENT_PRIVILEGIE: "Client Privilégié",
  ANIMATEUR_ADJOINT: "Animateur Adjoint",
  ANIMATEUR: "Animateur",
  MANAGER_ADJOINT: "Manager Adjoint",
  MANAGER: "Manager",
};

const BILLING_GRADE_OPTIONS = [
  "CLIENT_PRIVILEGIE",
  "ANIMATEUR_ADJOINT",
  "ANIMATEUR",
  "MANAGER_ADJOINT",
  "MANAGER",
];

function Field({ label, children, optional = false, className = "" }) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        {optional && <span className="text-xs text-gray-400">(optionnel)</span>}
      </div>
      {children}
    </label>
  );
}

function Alert({ tone = "blue", title, children, className = "" }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    gray: "border-gray-200 bg-gray-50 text-gray-700",
  };

  const icons = {
    amber: "⚠️",
    red: "❌",
    blue: "ℹ️",
    emerald: "✅",
    gray: "📌",
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone]} ${className}`}>
      <div className="flex gap-2">
        <span className="text-base" role="img" aria-hidden="true">
          {icons[tone] || icons.blue}
        </span>
        <div className="flex-1 min-w-0">
          {title && <div className="font-semibold text-sm mb-0.5">{title}</div>}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight = false, copyable = false, className = "" }) {
  const handleCopy = async () => {
    if (!value || value === "—") return;
    if (typeof value !== "string") return;
    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      // noop
    }
  };

  const isReactNode = typeof value === "object" && value !== null && !Array.isArray(value);

  return (
    <div className={`flex items-center justify-between gap-2 text-sm py-1.5 border-b border-gray-100 last:border-0 ${className}`}>
      <div className="text-gray-500 text-xs uppercase tracking-wide">{label}</div>
      <div className={`font-medium text-right flex items-center gap-1.5 ${highlight ? "text-indigo-600" : ""}`}>
        {isReactNode ? value : <span className="break-all">{value ?? "—"}</span>}
        {copyable && !isReactNode && typeof value === "string" && value && value !== "—" && (
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Copier"
            type="button"
          >
            📋
          </button>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, subvalue, tone = "gray", icon, className = "" }) {
  const tones = {
    gray: "bg-gray-50 border-gray-200",
    amber: "bg-amber-50 border-amber-200",
    emerald: "bg-emerald-50 border-emerald-200",
    blue: "bg-blue-50 border-blue-200",
    red: "bg-red-50 border-red-200",
  };

  return (
    <div className={`rounded-lg border p-3 ${tones[tone]} ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wide">
        {icon && <span className="text-sm">{icon}</span>}
        {label}
      </div>
      <div className="text-lg font-semibold mt-0.5">{value}</div>
      {subvalue && <div className="text-xs text-gray-500 mt-0.5">{subvalue}</div>}
    </div>
  );
}

function CompactInfoCard({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StepIndicator({ number, title, active = false, completed = false }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs ${
          completed
            ? "bg-emerald-100 text-emerald-700"
            : active
              ? "bg-indigo-100 text-indigo-700"
              : "bg-gray-100 text-gray-500"
        }`}
      >
        {completed ? "✓" : number}
      </div>
      <div>
        <div className="font-medium text-gray-700 text-sm">{title}</div>
        <div className="text-xs text-gray-500">
          {completed ? "Terminée" : active ? "En cours" : "À venir"}
        </div>
      </div>
    </div>
  );
}

function PaymentMethodBadge({ isCash, isWaveFlow }) {
  const config = isCash
    ? { label: "Espèces", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: "💵" }
    : isWaveFlow
      ? { label: "Wave", cls: "bg-blue-100 text-blue-700 border-blue-200", icon: "🌊" }
      : { label: "Manuel", cls: "bg-gray-100 text-gray-700 border-gray-200", icon: "📎" };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.cls}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
}

function MessageStatusBadge({ status }) {
  const config = {
    DRAFT: { tone: "gray", label: "Brouillon", icon: "📝" },
    QUEUED: { tone: "gray", label: "En attente", icon: "⏳" },
    SENT: { tone: "blue", label: "Envoyé", icon: "📤" },
    DELIVERED: { tone: "emerald", label: "Distribué", icon: "✅" },
    READ: { tone: "emerald", label: "Lu", icon: "👁️" },
    FAILED: { tone: "red", label: "Échec", icon: "❌" },
    CANCELLED: { tone: "gray", label: "Annulé", icon: "🚫" },
  };

  const { tone = "gray", label, icon } = config[status] || config.DRAFT;

  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tones[tone]}`}>
      <span className="text-xs">{icon}</span>
      {label}
    </span>
  );
}

function PaymentStatusBadge({ status }) {
  const value = String(status || "").toUpperCase();

  const config = {
    PENDING_CUSTOMER_ACTION: { label: "En attente client", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    PAYMENT_PENDING: { label: "En attente", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    PROCESSING: { label: "En cours", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    SUCCEEDED: { label: "Payé", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PAID: { label: "Payé", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    EXPIRED: { label: "Expiré", cls: "bg-orange-100 text-orange-700 border-orange-200" },
    CANCELLED: { label: "Annulé", cls: "bg-red-100 text-red-700 border-red-200" },
    FAILED: { label: "Échec", cls: "bg-red-100 text-red-700 border-red-200" },
  };

  const item = config[value] || { label: status || "—", cls: "bg-gray-100 text-gray-700 border-gray-200" };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${item.cls}`}>
      {item.label}
    </span>
  );
}

function formatFcfa(value) {
  const num = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReceiptQrUrl(payload) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    payload,
  )}`;
}

function buildReceiptNumber({ factureReference, transactionRef, paidAt }) {
  const paidDate = new Date(paidAt || Date.now());
  const y = paidDate.getFullYear();
  const m = String(paidDate.getMonth() + 1).padStart(2, "0");
  const d = String(paidDate.getDate()).padStart(2, "0");
  const factPart = String(factureReference || "REC")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-6)
    .toUpperCase();
  const txPart = String(transactionRef || "0000")
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-6)
    .toUpperCase();

  return `RC-${y}${m}${d}-${factPart}-${txPart}`;
}

function buildThermalReceiptHtml({
  preorderNumber,
  factureReference,
  countryName,
  customerName,
  fboNumero,
  clientRef,
  provider,
  payerPhone,
  transactionRef,
  paidAt,
  amountPaid,
}) {
  const receiptNumber = buildReceiptNumber({
    factureReference,
    transactionRef,
    paidAt,
  });
  const qrPayload = [
    `recu:${receiptNumber}`,
    `precommande:${preorderNumber || "-"}`,
    `facture:${factureReference || "-"}`,
    `pays:${countryName || "-"}`,
    `client:${customerName || "-"}`,
    `fbo:${fboNumero || "-"}`,
    `provider:${provider || "-"}`,
    `payer:${payerPhone || "-"}`,
    `transaction:${transactionRef || "-"}`,
    `montant:${amountPaid || "-"}`,
    `date:${paidAt || "-"}`,
  ].join("|");
  const qrUrl = buildReceiptQrUrl(qrPayload);

  const line = (label, value) => `
    <div class="row">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value || "—")}</div>
    </div>
  `;

  const paymentLine = (label, value) => `
    <div class="payment-row">
      <div class="payment-label">${escapeHtml(label)}</div>
      <div class="payment-value">${escapeHtml(value || "—")}</div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reçu de paiement</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: #fff; color: #000; font-family: "Courier New", Courier, monospace; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ticket { width: 80mm; margin: 0 auto; padding: 7mm 5mm 8mm; }
    .brand { text-align: center; margin-bottom: 10px; }
    .brand img { display: block; width: 46mm; max-width: 100%; height: auto; margin: 0 auto; filter: brightness(0) saturate(100%); }
    .title { text-align: center; font-size: 18px; font-weight: 800; letter-spacing: 0.08em; margin-bottom: 8px; color: #000; }
    .receipt-no { border: 1.5px solid #000; text-align: center; font-size: 13px; font-weight: 800; padding: 7px 8px; margin-bottom: 12px; color: #000; }
    .divider { border-top: 1px dashed #111; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; font-size: 12px; line-height: 1.45; margin-bottom: 4px; color: #000; }
    .label { flex: 0 0 34%; font-weight: 700; }
    .value { flex: 1; text-align: right; word-break: break-word; }
    .payment-box { border: 2px solid #000; padding: 8px 7px; margin: 12px 0; }
    .payment-heading { text-align: center; font-size: 13px; font-weight: 800; margin-bottom: 8px; letter-spacing: 0.05em; }
    .payment-row { margin-bottom: 6px; }
    .payment-row:last-child { margin-bottom: 0; }
    .payment-label { font-size: 11px; font-weight: 700; margin-bottom: 2px; color: #000; }
    .payment-value { font-size: 15px; font-weight: 800; line-height: 1.25; color: #000; word-break: break-word; }
    .payment-value.amount { font-size: 18px; }
    .qr { text-align: center; margin-top: 12px; }
    .qr img { width: 28mm; height: 28mm; object-fit: contain; display: inline-block; }
    @page { size: 80mm auto; margin: 0; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="brand">
      <img src="/forever-corporate-logo.png" alt="Forever" />
    </div>
    <div class="title">REÇU DE PAIEMENT</div>
    <div class="receipt-no">N° REÇU ${escapeHtml(receiptNumber)}</div>
    ${line("Pays", countryName)}
    ${line("Précommande", preorderNumber)}
    ${line("Facture", factureReference)}
    ${line("Client", customerName)}
    ${line("N° FBO", fboNumero)}
    ${line("Client Ref", clientRef)}
    <div class="payment-box">
      <div class="payment-heading">INFORMATIONS PAIEMENT</div>
      ${paymentLine("Provider", provider)}
      ${paymentLine("Numéro payeur", payerPhone)}
      ${paymentLine("Transaction", transactionRef)}
      ${paymentLine("Date paiement", paidAt)}
      <div class="divider"></div>
      <div class="payment-row">
        <div class="payment-label">Montant payé</div>
        <div class="payment-value amount">${escapeHtml(amountPaid || "—")}</div>
      </div>
    </div>
    <div class="qr">
      <img src="${escapeHtml(qrUrl)}" alt="QR Code reçu paiement" />
    </div>
  </div>
  <script>
    window.addEventListener("load", () => { setTimeout(() => window.print(), 150); });
    window.addEventListener("afterprint", () => { setTimeout(() => window.close(), 150); });
  </script>
</body>
</html>`;
}

function getLatestAttempt(order) {
  const attempts = order?.activePayment?.attempts;
  if (Array.isArray(attempts) && attempts.length > 0) return attempts[0];
  return null;
}

function BillingActionCard({
  canInvoice,
  saving,
  isCash,
  invoiceRef,
  setInvoiceRef,
  invoiceWaTo,
  setInvoiceWaTo,
  invoiceGrade,
  setInvoiceGrade,
  invoicePreview,
  invoicePreviewLoading,
  onInvoice,
  resolvedPaymentLink,
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <Field label="Référence facture" optional className="mb-2">
            <input
              className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 text-sm"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef?.(e.target.value)}
              placeholder="PF-2026-00012"
              disabled={!canInvoice || saving}
            />
          </Field>
          <Field label="Grade retenu pour la préfacture">
            <select
              className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 text-sm"
              value={invoiceGrade || ""}
              onChange={(e) => setInvoiceGrade?.(e.target.value)}
              disabled={!canInvoice || saving}
            >
              <option value="">Sélectionner un grade</option>
              {BILLING_GRADE_OPTIONS.map((grade) => (
                <option key={grade} value={grade}>
                  {GRADE_LABELS[grade] || grade}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Numero destinataire" optional className="mt-2">
            <input
              className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 text-sm"
              value={invoiceWaTo}
              onChange={(e) => setInvoiceWaTo?.(e.target.value)}
              placeholder="0701020304 ou +2250701020304"
              disabled={!canInvoice || saving}
            />
          </Field>
        </div>

        <div className="flex-1 min-w-0 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Le facturier peut corriger ici le grade effectif constate dans l'AS400.
          Le montant et la remise utilises pour la prefacture et le lien de paiement
          sont recalcules automatiquement avec ce grade.
        </div>

        <div className="flex-1 min-w-0 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Apercu facture
          </div>
          {invoicePreviewLoading ? (
            <div className="mt-2 text-sm text-blue-700">Recalcul en cours...</div>
          ) : invoicePreview ? (
            <div className="mt-2 space-y-1 text-sm text-blue-900">
              <div>
                Remise appliquee :{" "}
                <strong>{Number(invoicePreview.discountPercent || 0).toFixed(2)}%</strong>
              </div>
              <div>
                Montant commande :{" "}
                <strong>{formatFcfa(invoicePreview.totals?.totalFcfa || 0)}</strong>
              </div>
              <div>
                Frais operateur :{" "}
                <strong>{formatFcfa(invoicePreview.payment?.paymentServiceFeeFcfa || 0)}</strong>
              </div>
              <div>
                Montant final a payer :{" "}
                <strong>{formatFcfa(invoicePreview.payment?.amountToPayFcfa || 0)}</strong>
              </div>
            </div>
          ) : (
            <div className="mt-2 text-sm text-blue-700">
              Selectionne un grade pour voir le montant final.
            </div>
          )}
        </div>

        <div className="flex flex-col justify-end gap-2">
          <button
            className={`px-5 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              !canInvoice || saving || !invoiceGrade
                ? "opacity-50 cursor-not-allowed bg-gray-400"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            }`}
            onClick={onInvoice}
            disabled={!canInvoice || saving || !invoiceGrade}
            type="button"
          >
            {saving ? "Traitement..." : isCash ? "💵 Facturer & envoyer" : "💳 Facturer + Paiement"}
          </button>
          <div className="text-xs text-gray-500 text-center">
            <span className={`inline-block w-2 h-2 rounded-full ${canInvoice ? "bg-green-400" : "bg-gray-400"}`} />
            {canInvoice ? " Prêt à facturer" : " Statut SUBMITTED requis"}
          </div>
        </div>
      </div>

      {!isCash && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="text-gray-500 text-xs uppercase">Lien de paiement</span>
            {resolvedPaymentLink ? (
              <div className="flex items-center gap-2">
                <a href={resolvedPaymentLink} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 text-sm truncate max-w-[200px]">
                  🔗 {resolvedPaymentLink.substring(0, 40)}...
                </a>
                <button
                  onClick={() => navigator.clipboard?.writeText(resolvedPaymentLink)}
                  className="text-gray-400 hover:text-gray-600"
                  type="button"
                >
                  📋
                </button>
              </div>
            ) : (
              <span className="text-gray-400 text-sm">Généré après facturation</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WavePaymentCard({
  paymentStatus,
  paymentProvider,
  visibleClientRef,
  payerPhone,
  paymentSessionId,
  paymentTxnId,
  paidAtValue,
  amountPaidValue,
  canUseWave,
  isPaymentSucceeded,
  isPaymentPending,
  isPaymentExpired,
  isPaymentCancelled,
  isPaymentFailed,
  resolvedPaymentLink,
  onInitiateWave,
  syncWaveHandler,
  reload,
  onSimulateWave,
  saving,
  waveLoading,
  showWaveDevTools,
  onPrintReceipt,
}) {
  const showWaveActions = canUseWave && (resolvedPaymentLink || !isPaymentSucceeded);
  const canPrintReceipt = canUseWave && isPaymentSucceeded;

  return (
    <CompactInfoCard title={canUseWave ? "💳 Paiement Wave" : "💳 Paiement"}>
      {!canUseWave ? (
        <Alert tone="gray" title="Paiement manuel" className="p-2">
          Cette commande n'utilise pas de lien de paiement automatique.
        </Alert>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Row label="Statut" value={<PaymentStatusBadge status={paymentStatus} />} />
            <Row label="Provider" value={paymentProvider || "WAVE"} />
            <Row label="Client Ref" value={visibleClientRef || "—"} copyable={Boolean(visibleClientRef)} />
            <Row label="Numéro payeur" value={payerPhone || "—"} copyable={Boolean(payerPhone)} />
            <Row label="Session" value={paymentSessionId} copyable={paymentSessionId !== "—"} />
            <Row label="Transaction" value={paymentTxnId} copyable={paymentTxnId !== "—"} />
            <Row label="Payé le" value={formatDateTime(paidAtValue)} highlight={isPaymentSucceeded} />
            <Row label="Montant payé" value={formatFcfa(amountPaidValue)} highlight={isPaymentSucceeded} />
          </div>

          {(showWaveActions || canPrintReceipt || showWaveDevTools || typeof reload === "function") && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {showWaveActions && (
                <>
                  <button
                    className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                    onClick={onInitiateWave}
                    disabled={!canUseWave || saving || waveLoading}
                    type="button"
                  >
                    💳 {resolvedPaymentLink ? "Réinitier" : "Initier"}
                  </button>
                  <button
                    className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                    onClick={syncWaveHandler}
                    disabled={!canUseWave || saving || waveLoading || paymentSessionId === "—"}
                    type="button"
                  >
                    🔄 Synchroniser
                  </button>
                  {resolvedPaymentLink && (
                    <a
                      className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                      href={resolvedPaymentLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🔗 Ouvrir page client
                    </a>
                  )}
                </>
              )}

              {typeof reload === "function" && (
                <button
                  className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                  onClick={reload}
                  disabled={saving || waveLoading}
                  type="button"
                >
                  🔄 Rafraîchir
                </button>
              )}

              {canPrintReceipt && (
                <button
                  className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm"
                  onClick={onPrintReceipt}
                  type="button"
                >
                  🖨 Imprimer reçu
                </button>
              )}

              {showWaveDevTools && typeof onSimulateWave === "function" && (
                <>
                  <button
                    className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                    onClick={() => onSimulateWave("succeeded")}
                    disabled={saving || waveLoading}
                    type="button"
                  >
                    🧪 Succeeded
                  </button>
                  <button
                    className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
                    onClick={() => onSimulateWave("expired")}
                    disabled={saving || waveLoading}
                    type="button"
                  >
                    🧪 Expired
                  </button>
                </>
              )}
            </div>
          )}

          {isPaymentPending && <Alert tone="blue" className="p-2 text-xs">⏳ En attente de paiement client</Alert>}
          {isPaymentExpired && <Alert tone="amber" className="p-2 text-xs">⏰ Lien expiré - réinitier un paiement</Alert>}
          {(isPaymentCancelled || isPaymentFailed) && <Alert tone="red" className="p-2 text-xs">❌ Paiement échoué - réinitier</Alert>}
        </div>
      )}
    </CompactInfoCard>
  );
}

function CashPaymentCard({ canCashPay, saving, status, cashNote, setCashNote, onCashPay }) {
  const isPaid = status === "PAID";

  return (
    <CompactInfoCard title="💵 Paiement espèces">
      <Alert tone="amber" className="mb-4 p-2 text-xs">
        Paiement manuel au bureau. L'admin encaisse et valide.
      </Alert>
      <Field label="Note d'encaissement" optional>
        <textarea
          className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 text-sm min-h-[80px]"
          value={cashNote}
          onChange={(e) => setCashNote?.(e.target.value)}
          disabled={!canCashPay || saving || isPaid}
          placeholder="Ex: Paiement reçu au comptoir..."
        />
      </Field>
      <div className="flex items-center justify-between gap-3 mt-3">
        <button
          className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
            !canCashPay || saving || isPaid
              ? "opacity-50 cursor-not-allowed bg-gray-400"
              : "bg-amber-600 hover:bg-amber-700 text-white"
          }`}
          onClick={onCashPay}
          disabled={!canCashPay || saving || isPaid}
          type="button"
        >
          {saving ? "Traitement..." : "💰 Marquer encaissé"}
        </button>
        <span className="text-xs text-gray-500">
          {isPaid ? "Payé" : canCashPay ? "Prêt" : "Non disponible"}
        </span>
      </div>
    </CompactInfoCard>
  );
}

function ManualPaymentCard({
  status,
  saving,
  canProof,
  canVerify,
  proofUrl,
  setProofUrl,
  proofRef,
  setProofRef,
  proofNote,
  setProofNote,
  verifyNote,
  setVerifyNote,
  onProof,
  onVerify,
  order,
}) {
  const isPaid = status === "PAID";
  const isInvoiced = status === "INVOICED";
  const step1Completed = status === "PAYMENT_PENDING" || isPaid;
  const step2Completed = isPaid;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
        <StepIndicator number={1} title="Preuve" active={!step1Completed && isInvoiced} completed={step1Completed} />
        <StepIndicator number={2} title="Validation" active={step1Completed && !step2Completed} completed={step2Completed} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CompactInfoCard title="📸 Étape 1 - Preuve de paiement">
          <Field label="URL preuve" optional>
            <input
              className="input w-full rounded-lg border-gray-200 text-sm"
              value={proofUrl}
              onChange={(e) => setProofUrl?.(e.target.value)}
              disabled={!canProof || saving || step1Completed}
              placeholder="https://..."
            />
          </Field>
          <Field label="Référence transaction" optional className="mt-2">
            <input
              className="input w-full rounded-lg border-gray-200 text-sm"
              value={proofRef}
              onChange={(e) => setProofRef?.(e.target.value)}
              disabled={!canProof || saving || step1Completed}
              placeholder="WAVE-XXXX / OM-XXXX"
            />
          </Field>
          <Field label="Note" optional className="mt-2">
            <textarea
              className="input w-full rounded-lg border-gray-200 text-sm min-h-[70px]"
              value={proofNote}
              onChange={(e) => setProofNote?.(e.target.value)}
              disabled={!canProof || saving || step1Completed}
              placeholder="Capture recue par SMS/WhatsApp..."
            />
          </Field>
          <div className="flex items-center justify-between gap-3 mt-3">
            <button
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                !canProof || saving || step1Completed
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
              onClick={onProof}
              disabled={!canProof || saving || step1Completed}
              type="button"
            >
              {saving ? "..." : "📸 Enregistrer la preuve"}
            </button>
            <span className="text-xs text-gray-500">{step1Completed ? "✓ Reçue" : "INVOICED requis"}</span>
          </div>
        </CompactInfoCard>

        <CompactInfoCard title="✅ Étape 2 - Validation finale">
          <Field label="Note de validation" optional>
            <input
              className="input w-full rounded-lg border-gray-200 text-sm"
              value={verifyNote}
              onChange={(e) => setVerifyNote?.(e.target.value)}
              disabled={!canVerify || saving || step2Completed}
              placeholder="Paiement vérifié..."
            />
          </Field>
          <div className="flex items-center justify-between gap-3 mt-3">
            <button
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                !canVerify || saving || step2Completed
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              }`}
              onClick={onVerify}
              disabled={!canVerify || saving || step2Completed}
              type="button"
            >
              {saving ? "..." : "✅ Valider le paiement"}
            </button>
            <span className="text-xs text-gray-500">{step2Completed ? "✓ Validé" : "PAYMENT_PENDING requis"}</span>
          </div>
        </CompactInfoCard>
      </div>

      {(order?.manualPaymentProofUrl || order?.paymentProofUrl || order?.manualPaymentReference) && (
        <CompactInfoCard title="📋 Preuve enregistrée">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Row
              label="URL"
              value={
                order?.manualPaymentProofUrl || order?.paymentProofUrl ? (
                  <a href={order?.manualPaymentProofUrl || order?.paymentProofUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm">
                    🔗 Voir
                  </a>
                ) : "—"
              }
            />
            <Row label="Référence" value={order?.manualPaymentReference || order?.paymentRef || "—"} copyable />
          </div>
          {(order?.manualPaymentProofNote || order?.paymentProofNote) && (
            <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-700">
              {order?.manualPaymentProofNote || order?.paymentProofNote}
            </div>
          )}
        </CompactInfoCard>
      )}
    </div>
  );
}

function SmsMessageCard({
  order,
  billingMessage,
  resolvedWhatsappStatus,
  resolvedPaymentLink,
  hasWhatsappMessage,
  onCopyWhatsApp,
  onResendWhatsApp,
  saving,
}) {
  return (
    <CompactInfoCard title="📱 SMS & Suivi">
      <div className="space-y-3">
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500 uppercase mb-1">Message envoyé</div>
          {hasWhatsappMessage ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
              {order?.whatsappMessage}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-2">Aucun message généré</div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm disabled:opacity-50"
            onClick={onCopyWhatsApp}
            disabled={!hasWhatsappMessage}
            type="button"
          >
            📋 Copier
          </button>
          {typeof onResendWhatsApp === "function" && (
            <button
              className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm disabled:opacity-50"
              onClick={onResendWhatsApp}
              disabled={!billingMessage?.id || saving}
              type="button"
            >
              🔄 Renvoyer
            </button>
          )}
          {resolvedPaymentLink && (
            <a
              className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm"
              href={resolvedPaymentLink}
              target="_blank"
              rel="noreferrer"
            >
              🔗 Lien paiement
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
          <Row label="Statut" value={<MessageStatusBadge status={resolvedWhatsappStatus} />} />
          <Row label="Destinataire" value={billingMessage?.toPhone || order?.factureWhatsappTo || "—"} />
          <Row label="Envoyé le" value={formatDateTime(billingMessage?.sentAt)} />
          <Row label="Lien cliqué" value={order?.paymentLinkClickedAt ? `✅ ${formatDateTime(order.paymentLinkClickedAt)}` : "Non"} />
          <Row label="Clics" value={order?.paymentLinkClickCount || 0} />
          <Row label="Dernière MAJ" value={formatDateTime(billingMessage?.lastStatusAt || order?.lastWhatsappStatusAt)} />
        </div>

        {billingMessage?.errorMessage && (
          <Alert tone="red" className="p-2 text-xs">⚠️ {billingMessage.errorMessage}</Alert>
        )}
      </div>
    </CompactInfoCard>
  );
}

function TraceabilityCard({ order, status, paymentProvider, paymentSessionId, paymentTxnId, paidAtValue, amountPaidValue }) {
  return (
    <CompactInfoCard title="🧾 Traçabilité légère">
      <div className="grid grid-cols-2 gap-2">
        <Row label="Commande" value={status || "—"} />
        <Row label="Provider" value={paymentProvider || "—"} />
        <Row label="Facture" value={order?.factureReference || "—"} />
        <Row label="Précommande" value={order?.preorderNumber || "—"} />
        <Row label="Session" value={paymentSessionId} copyable={paymentSessionId !== "—"} />
        <Row label="Transaction" value={paymentTxnId} copyable={paymentTxnId !== "—"} />
        <Row label="Payé le" value={formatDateTime(paidAtValue)} />
        <Row label="Montant payé" value={formatFcfa(amountPaidValue)} />
      </div>
    </CompactInfoCard>
  );
}

export default function OrderBillingPaymentTab({
  order,
  saving,
  canInvoice,
  invoiceRef,
  setInvoiceRef,
  invoiceWaTo,
  setInvoiceWaTo,
  invoiceGrade,
  setInvoiceGrade,
  invoicePreview,
  invoicePreviewLoading,
  paymentLink,
  onInvoice,
  onCopyWhatsApp,
  isCash,
  isAutoPayment,
  billingMessage = null,
  onResendWhatsApp,
  onInitiateWave,
  onRefreshWaveStatus,
  onSyncWave,
  onSimulateWave,
  waveLoading = false,
  showWaveDevTools = false,
  canCashPay,
  canProof,
  canVerify,
  cashNote,
  setCashNote,
  proofUrl,
  setProofUrl,
  proofRef,
  setProofRef,
  proofNote,
  setProofNote,
  verifyNote,
  setVerifyNote,
  onCashPay,
  onProof,
  onVerify,
  reload,
  variant = "billing",
}) {
  const status = order?.status;
  const latestAttempt = getLatestAttempt(order);
  const payment = order?.activePayment || null;
  const paymentModeRaw = String(order?.preorderPaymentMode || order?.paymentMode || "").trim().toUpperCase();
  const paymentProviderRaw = String(order?.paymentProvider || payment?.provider || "").trim().toUpperCase();
  const isWaveFlow =
    !isCash &&
    (isAutoPayment ||
      paymentProviderRaw === "WAVE" ||
      paymentModeRaw.includes("WAVE") ||
      paymentModeRaw.includes("MOBILE") ||
      paymentModeRaw.includes("MOMO"));
  const isManualFlow = !isCash && !isWaveFlow;
  const hasInvoice = ["INVOICED", "PAYMENT_PROOF_RECEIVED", "PAID", "READY", "FULFILLED", "PAYMENT_PENDING"].includes(status);

  const paymentStatus = payment?.status || order?.paymentStatus || null;
  const paymentProvider = payment?.provider || order?.paymentProvider || null;
  const paymentSessionId = latestAttempt?.providerSessionId || payment?.providerReference || order?.paymentRef || "—";
  const paymentTxnId = payment?.providerTxnId || latestAttempt?.providerTransactionId || order?.paymentRef || "—";
  const visibleClientRef =
    order?.preorderNumber ||
    payment?.clientReference ||
    latestAttempt?.clientReference ||
    order?.id ||
    "";
  const payerPhone =
    latestAttempt?.providerPayerPhone ||
    latestAttempt?.requestPayloadJson?.restrictPayerMobile ||
    latestAttempt?.normalizedPayloadJson?.providerPayerPhone ||
    latestAttempt?.payerPhone ||
    payment?.payerPhone ||
    payment?.customerPhone ||
    latestAttempt?.rawProviderPayload?.payerPhone ||
    latestAttempt?.rawProviderPayload?.customer_msisdn ||
    latestAttempt?.rawProviderPayload?.phoneNumber ||
    payment?.providerPayerPhone ||
    "";
  const paidAtValue =
    payment?.paidAt ||
    latestAttempt?.completedAt ||
    latestAttempt?.updatedAt ||
    order?.paidAt ||
    null;
  const amountPaidValue =
    payment?.amountPaidFcfa ||
    payment?.amountExpectedFcfa ||
    latestAttempt?.amountPaidFcfa ||
    order?.totalFcfa ||
    0;
  const resolvedPaymentLink =
    billingMessage?.paymentLinkTracked ||
    billingMessage?.paymentLinkTarget ||
    paymentLink ||
    order?.paymentLinkTarget ||
    order?.trackedPaymentLink ||
    latestAttempt?.providerLaunchUrl ||
    latestAttempt?.checkoutUrl ||
    order?.paymentLink ||
    "";

  const resolvedWhatsappStatus = billingMessage?.status || order?.lastWhatsappStatus || null;
  const hasWhatsappMessage = Boolean(order?.whatsappMessage);
  const paymentTimelineItems = Array.isArray(order?.paymentTransactionLogs)
    ? order.paymentTransactionLogs
    : [];
  const normalizedPaymentStatus = String(paymentStatus || "").toUpperCase();
  const isPaymentPending = ["PAYMENT_PENDING", "PENDING_CUSTOMER_ACTION", "PROCESSING"].includes(normalizedPaymentStatus);
  const isPaymentSucceeded = ["SUCCEEDED", "PAID"].includes(normalizedPaymentStatus);
  const isPaymentExpired = normalizedPaymentStatus === "EXPIRED";
  const isPaymentCancelled = normalizedPaymentStatus === "CANCELLED";
  const isPaymentFailed = normalizedPaymentStatus === "FAILED";
  const showBillingSection = variant !== "payment";
  const showMessageSection = variant !== "payment";
  const syncWaveHandler = onRefreshWaveStatus || onSyncWave;

  const handlePrintReceipt = () => {
    if (!isWaveFlow || !isPaymentSucceeded || typeof window === "undefined") return;

    const receiptWindow = window.open("", "_blank", "width=420,height=720");
    if (!receiptWindow) return;

    receiptWindow.document.open();
    receiptWindow.document.write(
      buildThermalReceiptHtml({
        preorderNumber: order?.preorderNumber || "—",
        factureReference: order?.factureReference || "—",
        countryName: order?.country?.name || order?.country?.code || "—",
        customerName: order?.fboNomComplet || order?.fbo?.nomComplet || "—",
        fboNumero: order?.fboNumero || "—",
        clientRef: visibleClientRef || "—",
        provider: paymentProvider || "WAVE",
        payerPhone: payerPhone || "—",
        transactionRef: paymentTxnId !== "—" ? paymentTxnId : paymentSessionId,
        paidAt: formatDateTime(paidAtValue),
        amountPaid: formatFcfa(amountPaidValue),
      }),
    );
    receiptWindow.document.close();
    receiptWindow.focus();
  };

  const getStatusMessage = () => {
    if (isCash) return { tone: "amber", text: "Paiement espèces - retrait ou encaissement au bureau" };
    if (isPaymentSucceeded) return { tone: "emerald", text: "Paiement confirmé" };
    if (isWaveFlow && isPaymentPending) return { tone: "blue", text: "Paiement Wave en attente de finalisation client" };
    if (isManualFlow && status === "PAYMENT_PENDING" && !isPaymentSucceeded) {
      return { tone: "amber", text: "Preuve reçue - validation finale attendue" };
    }
    if (isPaymentExpired) return { tone: "amber", text: "Lien expiré - réinitier" };
    if (isPaymentCancelled || isPaymentFailed) return { tone: "red", text: "Paiement échoué" };
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Commande"
          value={status || "—"}
          subvalue={hasInvoice ? "Facturée" : "À facturer"}
          tone={hasInvoice ? "emerald" : "gray"}
          icon="📦"
        />
        <StatCard
          label="Montant"
          value={formatFcfa(order?.totalFcfa)}
          subvalue="Total TTC"
          tone="blue"
          icon="💰"
        />
        <StatCard
          label="Paiement"
          value={<PaymentMethodBadge isCash={isCash} isWaveFlow={isWaveFlow} />}
          subvalue={paymentProvider || order?.paymentMode || order?.preorderPaymentMode || "—"}
          tone={isCash ? "amber" : isWaveFlow ? "blue" : "gray"}
          icon={isCash ? "💵" : "💳"}
        />
        <StatCard
          label="Facture"
          value={order?.factureReference || "—"}
          subvalue={hasInvoice ? "Générée" : "À générer"}
          tone={hasInvoice ? "emerald" : "gray"}
          icon="📄"
        />
      </div>

      {statusMessage && <Alert tone={statusMessage.tone}>{statusMessage.text}</Alert>}

      {showBillingSection && (
        <BillingActionCard
          canInvoice={canInvoice}
          saving={saving}
          isCash={isCash}
          invoiceRef={invoiceRef}
          setInvoiceRef={setInvoiceRef}
          invoiceWaTo={invoiceWaTo}
          setInvoiceWaTo={setInvoiceWaTo}
          invoiceGrade={invoiceGrade}
          setInvoiceGrade={setInvoiceGrade}
          invoicePreview={invoicePreview}
          invoicePreviewLoading={invoicePreviewLoading}
          onInvoice={onInvoice}
          resolvedPaymentLink={resolvedPaymentLink}
        />
      )}

      <div className={`grid gap-4 ${showMessageSection ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        <WavePaymentCard
          paymentStatus={paymentStatus}
          paymentProvider={paymentProvider}
          visibleClientRef={visibleClientRef}
          payerPhone={payerPhone}
          paymentSessionId={paymentSessionId}
          paymentTxnId={paymentTxnId}
          paidAtValue={paidAtValue}
          amountPaidValue={amountPaidValue}
          canUseWave={isWaveFlow}
          isPaymentSucceeded={isPaymentSucceeded}
          isPaymentPending={isPaymentPending}
          isPaymentExpired={isPaymentExpired}
          isPaymentCancelled={isPaymentCancelled}
          isPaymentFailed={isPaymentFailed}
          resolvedPaymentLink={resolvedPaymentLink}
          onInitiateWave={onInitiateWave}
          syncWaveHandler={syncWaveHandler}
          reload={reload}
          onSimulateWave={onSimulateWave}
          saving={saving}
          waveLoading={waveLoading}
          showWaveDevTools={showWaveDevTools}
          onPrintReceipt={handlePrintReceipt}
        />

        {showMessageSection && (
          <SmsMessageCard
            order={order}
            billingMessage={billingMessage}
            resolvedWhatsappStatus={resolvedWhatsappStatus}
            resolvedPaymentLink={resolvedPaymentLink}
            hasWhatsappMessage={hasWhatsappMessage}
            onCopyWhatsApp={onCopyWhatsApp}
            onResendWhatsApp={onResendWhatsApp}
            saving={saving}
          />
        )}
      </div>

      {isCash && (
        <RequirePermission permission={Permission.PAYMENT_VALIDATE}>
          <CashPaymentCard
            canCashPay={canCashPay}
            saving={saving}
            status={status}
            cashNote={cashNote}
            setCashNote={setCashNote}
            onCashPay={onCashPay}
          />
        </RequirePermission>
      )}

      {isManualFlow && (
        <RequirePermission permission={Permission.PAYMENT_VALIDATE}>
          <ManualPaymentCard
            status={status}
            saving={saving}
            canProof={canProof}
            canVerify={canVerify}
            proofUrl={proofUrl}
            setProofUrl={setProofUrl}
            proofRef={proofRef}
            setProofRef={setProofRef}
            proofNote={proofNote}
            setProofNote={setProofNote}
            verifyNote={verifyNote}
            setVerifyNote={setVerifyNote}
            onProof={onProof}
            onVerify={onVerify}
            order={order}
          />
        </RequirePermission>
      )}

      <TraceabilityCard
        order={order}
        status={status}
        paymentProvider={paymentProvider}
        paymentSessionId={paymentSessionId}
        paymentTxnId={paymentTxnId}
        paidAtValue={paidAtValue}
        amountPaidValue={amountPaidValue}
      />

      <PaymentTimeline items={paymentTimelineItems} />
    </div>
  );
}
