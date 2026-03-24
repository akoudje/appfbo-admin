//src/components/orders/detail/OrderBillingTab.jsx
// Ce composant est optimisé pour une lecture rapide et une action efficace, avec des éléments visuels clairs et des interactions simplifiées.
// Il est conçu pour permettre aux agents de service client de comprendre rapidement le statut de la commande, d'identifier les actions nécessaires et de les
import React from "react";

// ============================================================================
// Sous-composants optimisés
// ============================================================================

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

function WhatsAppStatusBadge({ status }) {
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

// ============================================================================
// Utilitaires
// ============================================================================

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

function buildThermalReceiptHtml({
  preorderNumber,
  factureReference,
  customerName,
  fboNumero,
  clientRef,
  provider,
  payerPhone,
  transactionRef,
  paidAt,
  amountPaid,
}) {
  const line = (label, value) => `
    <div class="row">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value || "—")}</div>
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
    body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #111;
      font-family: "Courier New", Courier, monospace;
    }
    .ticket {
      width: 80mm;
      margin: 0 auto;
      padding: 8mm 6mm;
    }
    .title {
      text-align: center;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .badge {
      border: 1px solid #111;
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      padding: 6px 8px;
      margin-bottom: 10px;
    }
    .divider {
      border-top: 1px dashed #111;
      margin: 10px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
      font-size: 12px;
      line-height: 1.45;
      margin-bottom: 4px;
    }
    .label {
      flex: 0 0 34%;
      font-weight: 700;
    }
    .value {
      flex: 1;
      text-align: right;
      word-break: break-word;
    }
    .footer {
      text-align: center;
      font-size: 11px;
      margin-top: 12px;
    }
    @page {
      size: 80mm auto;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="title">REÇU DE PAIEMENT</div>
    <div class="badge">PAIEMENT CONFIRMÉ</div>
    ${line("Précommande", preorderNumber)}
    ${line("Facture", factureReference)}
    ${line("Client", customerName)}
    ${line("N° FBO", fboNumero)}
    ${line("Client Ref", clientRef)}
    ${line("Provider", provider)}
    ${line("Numéro payeur", payerPhone)}
    ${line("Transaction", transactionRef)}
    ${line("Date paiement", paidAt)}
    <div class="divider"></div>
    ${line("Montant payé", amountPaid)}
    <div class="footer">FOREVER BUSINESS OFFICE</div>
  </div>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 150);
    });
    window.addEventListener("afterprint", () => {
      setTimeout(() => window.close(), 150);
    });
  </script>
</body>
</html>`;
}

function getLatestAttempt(order) {
  const attempts = order?.activePayment?.attempts;
  if (Array.isArray(attempts) && attempts.length > 0) return attempts[0];
  return null;
}

// ============================================================================
// Composant principal optimisé
// ============================================================================

export default function OrderBillingTab({
  order,
  saving,
  canInvoice,
  invoiceRef,
  setInvoiceRef,
  invoiceWaTo,
  setInvoiceWaTo,
  paymentLink,
  setPaymentLink,
  invoiceNote,
  setInvoiceNote,
  onInvoice,
  onCopyWhatsApp,
  isCash,
  isAutoPayment,
  billingMessage = null,
  onResendWhatsApp,
  onInitiateWave,
  onRefreshWaveStatus,
  onSimulateWave,
  waveLoading = false,
  showWaveDevTools = false,
}) {
  const status = order?.status;
  const latestAttempt = getLatestAttempt(order);
  const payment = order?.activePayment || null;

  const hasInvoice = ["INVOICED", "PAYMENT_PROOF_RECEIVED", "PAID", "READY", "FULFILLED", "PAYMENT_PENDING"].includes(status);

  const paymentStatus = payment?.status || order?.paymentStatus || null;
  const paymentProvider = payment?.provider || order?.paymentProvider || null;
  const paymentSessionId = latestAttempt?.providerSessionId || payment?.providerReference || "—";
  const paymentTxnId = payment?.providerTxnId || latestAttempt?.providerTransactionId || "—";
  const visibleClientRef =
    order?.preorderNumber ||
    payment?.clientReference ||
    latestAttempt?.clientReference ||
    order?.id ||
    "";
  const payerPhone =
    latestAttempt?.providerPayerPhone ||
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
    latestAttempt?.amountPaidFcfa ||
    order?.totalFcfa ||
    0;

  const resolvedPaymentLink = paymentLink || latestAttempt?.providerLaunchUrl || latestAttempt?.checkoutUrl || order?.paymentLink || "";

  const resolvedWhatsappStatus = billingMessage?.status || order?.lastWhatsappStatus || null;
  const hasWhatsappMessage = Boolean(order?.whatsappMessage);
  const canUseWave = !isCash && isAutoPayment;

  const normalizedPaymentStatus = String(paymentStatus || "").toUpperCase();
  const isPaymentPending = ["PAYMENT_PENDING", "PENDING_CUSTOMER_ACTION", "PROCESSING"].includes(normalizedPaymentStatus);
  const isPaymentSucceeded = ["SUCCEEDED", "PAID"].includes(normalizedPaymentStatus);
  const isPaymentExpired = normalizedPaymentStatus === "EXPIRED";
  const isPaymentCancelled = normalizedPaymentStatus === "CANCELLED";
  const isPaymentFailed = normalizedPaymentStatus === "FAILED";

  const showWaveActions = canUseWave && (resolvedPaymentLink || !isPaymentSucceeded);
  const canPrintReceipt = canUseWave && isPaymentSucceeded;

  const handlePrintReceipt = () => {
    if (!canPrintReceipt || typeof window === "undefined") return;

    const receiptWindow = window.open("", "_blank", "width=420,height=720");
    if (!receiptWindow) return;

    receiptWindow.document.open();
    receiptWindow.document.write(
      buildThermalReceiptHtml({
        preorderNumber: order?.preorderNumber || "—",
        factureReference: order?.factureReference || "—",
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

  // Message de statut condensé
  const getStatusMessage = () => {
    if (isCash) return { tone: "amber", text: "Paiement espèces - retrait au bureau" };
    if (isPaymentSucceeded) return { tone: "emerald", text: "Paiement confirmé" };
    if (isPaymentPending) return { tone: "blue", text: "En attente de paiement" };
    if (isPaymentExpired) return { tone: "amber", text: "Lien expiré - réinitier" };
    if (isPaymentCancelled || isPaymentFailed) return { tone: "red", text: "Paiement échoué" };
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="space-y-4">
      {/* Ligne 1: Cartes de statut compactes */}
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
          value={isCash ? "Espèces" : canUseWave ? "Wave" : "Manuel"}
          tone={isCash ? "amber" : canUseWave ? "blue" : "gray"}
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

      {/* Ligne 2: Message de statut + Actions principales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Colonne gauche: Message de statut (si présent) */}
        {statusMessage && (
          <div className="lg:col-span-1">
            <Alert tone={statusMessage.tone} className="h-full">
              {statusMessage.text}
            </Alert>
          </div>
        )}

        {/* Colonne droite: Actions principales */}
        <div className={statusMessage ? "lg:col-span-2" : "lg:col-span-3"}>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 min-w-0">
                <Field label="Référence facture" optional className="mb-2">
                  <input
                    className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 text-sm"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    placeholder="PF-2026-00012"
                    disabled={!canInvoice || saving}
                  />
                </Field>
                <Field label="WhatsApp destinataire" optional>
                  <input
                    className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 text-sm"
                    value={invoiceWaTo}
                    onChange={(e) => setInvoiceWaTo(e.target.value)}
                    placeholder="+225 01 23 45 67"
                    disabled={!canInvoice || saving}
                  />
                </Field>
              </div>

              <div className="flex flex-col justify-end gap-2">
                <button
                  className={`px-5 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                    !canInvoice || saving
                      ? "opacity-50 cursor-not-allowed bg-gray-400"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  }`}
                  onClick={onInvoice}
                  disabled={!canInvoice || saving}
                  type="button"
                >
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⚪</span>
                      Traitement...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {isCash ? "💵 Facturer & envoyer" : "💳 Facturer + Paiement"}
                    </span>
                  )}
                </button>
                <div className="text-xs text-gray-500 text-center">
                  <span className={`inline-block w-2 h-2 rounded-full ${canInvoice ? "bg-green-400" : "bg-gray-400"}`} />
                  {canInvoice ? "Prêt à facturer" : "Statut SUBMITTED requis"}
                </div>
              </div>
            </div>

            {/* Lien de paiement (condensé) */}
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
        </div>
      </div>

      {/* Ligne 3: Wave + WhatsApp en colonnes côte à côte */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Colonne Wave */}
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

              {(showWaveActions || canPrintReceipt || showWaveDevTools) && (
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
                        onClick={onRefreshWaveStatus}
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
                          🔗 Ouvrir
                        </a>
                      )}
                    </>
                  )}
                  {canPrintReceipt && (
                    <button
                      className="btn inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-sm"
                      onClick={handlePrintReceipt}
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

        {/* Colonne WhatsApp */}
        <CompactInfoCard title="📱 WhatsApp & Suivi">
          <div className="space-y-3">
            {/* Message */}
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <div className="text-xs text-gray-500 uppercase mb-1">Message envoyé</div>
              {hasWhatsappMessage ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {order.whatsappMessage}
                </div>
              ) : (
                <div className="text-sm text-gray-400 text-center py-2">Aucun message généré</div>
              )}
            </div>

            {/* Actions WhatsApp */}
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

            {/* Statuts de suivi (condensés) */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
              <Row label="Statut" value={<WhatsAppStatusBadge status={resolvedWhatsappStatus} />} />
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
      </div>

      {/* Ligne 4: Informations complémentaires (condensées, affichées seulement si nécessaires) */}
      {(order?.factureReference || order?.invoicedAt) && (
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-3">
              {order?.factureReference && (
                <span className="text-gray-600">
                  📄 <span className="font-medium">{order.factureReference}</span>
                </span>
              )}
              {order?.invoicedAt && (
                <span className="text-gray-500 text-xs">
                  Facturée le {formatDateTime(order.invoicedAt)}
                  {order?.invoicedBy && ` par ${order.invoicedBy}`}
                </span>
              )}
            </div>
            {order?.paymentLinkClickedAt && (
              <span className="text-emerald-600 text-xs flex items-center gap-1">
                ✅ Lien cliqué le {formatDateTime(order.paymentLinkClickedAt)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
