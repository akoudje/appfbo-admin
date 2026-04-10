// src/components/orders/detail/OrderBillingPaymentTab.jsx
// src/components/orders/OrderBillingPaymentTab.jsx
import React from "react";
import RequirePermission from "../../auth/RequirePermission";
import { Permission } from "../../../auth/permissions";
import PaymentTimeline from "./PaymentTimeline";
import OrderItemsTable from "./OrderItemsTable";

// ============================================
// CONSTANTES
// ============================================

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

// ============================================
// COMPOSANTS UTILITAIRES AMÉLIORÉS
// ============================================

function Field({ label, children, optional = false, className = "", hint = "" }) {
  const id = React.useId();
  
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
          {label}
        </label>
        {optional && (
          <span className="text-[10px] text-gray-400 font-medium px-1.5 py-0.5 bg-gray-100 rounded-full">
            Optionnel
          </span>
        )}
      </div>
      {React.isValidElement(children) 
        ? React.cloneElement(children, { id, className: `${children.props.className || ''} transition-all duration-200` })
        : children}
      {hint && (
        <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>
      )}
    </div>
  );
}

function Alert({ tone = "blue", title, children, className = "", dismissible = false }) {
  const [isVisible, setIsVisible] = React.useState(true);
  
  const tones = {
    amber: { border: "border-l-4 border-l-amber-500", bg: "bg-amber-50", text: "text-amber-800", icon: "⚠️" },
    red: { border: "border-l-4 border-l-red-500", bg: "bg-red-50", text: "text-red-800", icon: "❌" },
    blue: { border: "border-l-4 border-l-blue-500", bg: "bg-blue-50", text: "text-blue-800", icon: "ℹ️" },
    emerald: { border: "border-l-4 border-l-emerald-500", bg: "bg-emerald-50", text: "text-emerald-800", icon: "✅" },
    gray: { border: "border-l-4 border-l-gray-400", bg: "bg-gray-50", text: "text-gray-700", icon: "📌" },
  };

  const config = tones[tone] || tones.blue;
  
  if (!isVisible) return null;

  return (
    <div className={`rounded-lg ${config.border} ${config.bg} p-3 ${className}`}>
      <div className="flex gap-3">
        <span className="text-lg leading-none" role="img" aria-hidden="true">
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-semibold text-sm mb-1">{title}</div>
          )}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
        {dismissible && (
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
            aria-label="Fermer"
            type="button"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, highlight = false, copyable = false, className = "" }) {
  const [copied, setCopied] = React.useState(false);
  
  const handleCopy = async () => {
    if (!value || value === "—") return;
    try {
      await navigator.clipboard?.writeText(String(value));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  const displayValue = React.isValidElement(value) ? value : (
    <span className={`break-all ${highlight ? "font-semibold text-indigo-600" : "text-gray-900"}`}>
      {value ?? "—"}
    </span>
  );

  return (
    <div className={`flex items-start justify-between gap-3 py-2 px-1 hover:bg-gray-50/50 rounded-lg transition-colors ${className}`}>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide flex-shrink-0">
        {label}
      </dt>
      <dd className="flex items-center gap-1.5 text-sm text-right">
        {displayValue}
        {copyable && value && value !== "—" && (
          <button
            onClick={handleCopy}
            className={`ml-1 p-1 rounded-md transition-all ${
              copied 
                ? "text-green-600 bg-green-50" 
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title={copied ? "Copié !" : "Copier"}
            type="button"
          >
            {copied ? "✓" : "📋"}
          </button>
        )}
      </dd>
    </div>
  );
}

function StatCard({ label, value, subvalue, tone = "gray", icon, className = "" }) {
  const tones = {
    gray: "bg-gradient-to-br from-gray-50 to-white border-gray-200",
    amber: "bg-gradient-to-br from-amber-50 to-white border-amber-200",
    emerald: "bg-gradient-to-br from-emerald-50 to-white border-emerald-200",
    blue: "bg-gradient-to-br from-blue-50 to-white border-blue-200",
    red: "bg-gradient-to-br from-red-50 to-white border-red-200",
  };

  return (
    <div className={`rounded-xl border ${tones[tone]} p-4 shadow-sm hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <span className="text-xl" role="img" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900">
        {value}
      </div>
      {subvalue && (
        <div className="mt-1">
          <span className="text-xs text-gray-500">{subvalue}</span>
        </div>
      )}
    </div>
  );
}

function CompactInfoCard({ title, children, className = "", collapsible = false }) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  
  const headerContent = (
    <div className="bg-gradient-to-r from-gray-50 to-white px-5 py-3 border-b border-gray-200">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        {title}
        {collapsible && (
          <span className="ml-auto text-gray-400">
            {isExpanded ? '▼' : '▶'}
          </span>
        )}
      </h4>
    </div>
  );

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full text-left hover:bg-gray-50 transition-colors"
        >
          {headerContent}
        </button>
      ) : (
        headerContent
      )}
      {isExpanded && (
        <div className="p-5">
          {children}
        </div>
      )}
    </div>
  );
}

function StepIndicator({ number, title, active = false, completed = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
          completed
            ? "bg-emerald-500 text-white shadow-md shadow-emerald-200"
            : active
              ? "bg-indigo-500 text-white shadow-md shadow-indigo-200"
              : "bg-gray-200 text-gray-500"
        }`}
      >
        {completed ? "✓" : number}
      </div>
      <div>
        <div className={`font-medium text-sm ${completed ? "text-gray-900" : active ? "text-indigo-700" : "text-gray-500"}`}>
          {title}
        </div>
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.cls}`}>
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${tones[tone]}`}>
      <span>{icon}</span>
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${item.cls}`}>
      {item.label}
    </span>
  );
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

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

function humanizeEnum(value) {
  if (!value) return "—";
  return String(value)
    .trim()
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (m) => m.toUpperCase());
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

function buildPrintAssetUrl(assetPath) {
  const normalizedPath = String(assetPath || "").trim();
  if (!normalizedPath) return "";
  if (/^https?:\/\//i.test(normalizedPath)) return normalizedPath;

  if (typeof window !== "undefined" && window.location?.origin) {
    return new URL(normalizedPath, window.location.origin).toString();
  }

  return normalizedPath;
}

function resolveReceiptCountryLabel(order) {
  const explicitName = String(
    order?.country?.name || order?.countryName || "",
  ).trim();
  if (explicitName) return explicitName;

  const explicitCode = String(
    order?.country?.code || order?.countryCode || "",
  )
    .trim()
    .toUpperCase();

  if (explicitCode === "CIV") return "Côte d'Ivoire";
  if (explicitCode) return explicitCode;

  try {
    const storageCode = String(localStorage.getItem("countryCode") || "")
      .trim()
      .toUpperCase();
    if (storageCode === "CIV") return "Côte d'Ivoire";
    if (storageCode) return storageCode;
  } catch {}

  return "—";
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
  const logoUrl = buildPrintAssetUrl("/forever-corporate-logo-black.png");
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
    .ticket { width: 80mm; margin: 0 auto; padding: 6mm 4mm 8mm; }
    .brand { text-align: center; margin-bottom: 12px; }
    .brand img { display: block; width: 58mm; max-width: 100%; height: auto; margin: 0 auto; }
    .title { text-align: center; font-size: 19px; font-weight: 900; letter-spacing: 0.08em; margin-bottom: 8px; color: #000; }
    .receipt-no { border: 2px solid #000; text-align: center; font-size: 14px; font-weight: 900; padding: 8px 8px; margin-bottom: 12px; color: #000; }
    .divider { border-top: 1px dashed #111; margin: 10px 0; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.45; margin-bottom: 5px; color: #000; font-weight: 800; }
    .label { flex: 0 0 38%; font-weight: 900; }
    .value { flex: 1; text-align: right; word-break: break-word; font-weight: 900; }
    .payment-box { border: 2px solid #000; padding: 9px 8px; margin: 12px 0; }
    .payment-heading { text-align: center; font-size: 14px; font-weight: 900; margin-bottom: 8px; letter-spacing: 0.05em; }
    .payment-row { margin-bottom: 7px; }
    .payment-row:last-child { margin-bottom: 0; }
    .payment-label { font-size: 12px; font-weight: 900; margin-bottom: 2px; color: #000; }
    .payment-value { font-size: 16px; font-weight: 900; line-height: 1.25; color: #000; word-break: break-word; }
    .payment-value.amount { font-size: 20px; }
    .qr { text-align: center; margin-top: 12px; }
    .qr img { width: 28mm; height: 28mm; object-fit: contain; display: inline-block; }
    @page { size: 80mm auto; margin: 0; }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="brand">
      <img src="${escapeHtml(logoUrl)}" alt="Forever" />
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
    function waitForImages() {
      const images = Array.from(document.images || []);
      if (!images.length) return Promise.resolve();

      return Promise.all(
        images.map((img) => {
          if (img.complete && img.naturalWidth > 0) return Promise.resolve();
          return new Promise((resolve) => {
            const done = () => resolve();
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            setTimeout(done, 1500);
          });
        }),
      );
    }

    window.addEventListener("load", () => {
      waitForImages().finally(() => {
        setTimeout(() => window.print(), 350);
      });
    });
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

// ============================================
// COMPOSANTS DE SECTION AMÉLIORÉS
// ============================================

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
  invoiceAmountFcfa,
  setInvoiceAmountFcfa,
  invoiceAdjustmentReason,
  setInvoiceAdjustmentReason,
  invoicePreview,
  invoicePreviewLoading,
  onInvoice,
  canSwitchToManualPayment = false,
  onSwitchToManualPayment = null,
  resolvedPaymentLink,
}) {
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* En-tête avec indicateur d'état */}
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              canInvoice ? 'bg-green-500 shadow-sm shadow-green-300' : 'bg-gray-400'
            }`} />
            <h4 className="font-semibold text-gray-900">
              Facturation {isCash ? '(Espèces)' : '(Wave)'}
            </h4>
          </div>
          {canInvoice && (
            <span className="text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              ✓ Prêt à facturer
            </span>
          )}
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        {/* Champs principaux */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Référence AS400" hint="Référence de préfacture">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">#</span>
              <input
                className="w-full pl-8 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all disabled:opacity-60 text-sm"
                value={invoiceRef || ""}
                onChange={(e) => setInvoiceRef?.(e.target.value)}
                placeholder="AS400-REF-001"
                disabled={!canInvoice || saving}
              />
            </div>
          </Field>
          
          <Field label="Grade de facturation">
            <select
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all disabled:opacity-60 text-sm"
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
        </div>
        
        {/* Bouton options avancées */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            Options avancées
          </span>
          <span className="text-gray-400 transition-transform duration-200" style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none' }}>
            ▼
          </span>
        </button>
        
        {/* Options avancées */}
        {showAdvanced && (
          <div className="space-y-4 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="WhatsApp destinataire" optional>
                <input
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 text-sm"
                  value={invoiceWaTo || ""}
                  onChange={(e) => setInvoiceWaTo?.(e.target.value)}
                  placeholder="+225 07 01 02 03 04"
                  disabled={!canInvoice || saving}
                />
              </Field>
              
              <Field label="Montant AS400 (FCFA)">
                <div className="relative">
                  <input
                    className="w-full pl-3 pr-12 py-2.5 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 text-sm"
                    value={invoiceAmountFcfa || ""}
                    onChange={(e) => setInvoiceAmountFcfa?.(e.target.value)}
                    placeholder="0"
                    inputMode="numeric"
                    disabled={!canInvoice || saving}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    FCFA
                  </span>
                </div>
              </Field>
            </div>
            
            <Field label="Motif d'ajustement" optional>
              <textarea
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 disabled:opacity-60 text-sm resize-none"
                value={invoiceAdjustmentReason || ""}
                onChange={(e) => setInvoiceAdjustmentReason?.(e.target.value)}
                placeholder="Obligatoire si le grade ou le montant diffère du calcul automatique"
                rows={2}
                disabled={!canInvoice || saving}
              />
            </Field>
          </div>
        )}
        
        {/* Aperçu facture */}
        <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-blue-600 text-lg">📊</span>
            <h5 className="text-sm font-semibold text-blue-900">Aperçu facture</h5>
          </div>
          
          {invoicePreviewLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
              <span className="ml-2 text-sm text-blue-700">Calcul en cours...</span>
            </div>
          ) : invoicePreview ? (
            <div className="grid gap-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-blue-700">Grade initial :</div>
                <div className="font-medium text-blue-900">
                  {GRADE_LABELS[invoicePreview.previousGrade] || invoicePreview.previousGrade || "—"}
                </div>
                
                <div className="text-blue-700">Grade retenu :</div>
                <div className="font-medium text-blue-900">
                  {GRADE_LABELS[invoicePreview.effectiveGrade] || invoicePreview.effectiveGrade || "—"}
                </div>
                
                <div className="text-blue-700">Remise :</div>
                <div className="font-medium text-blue-900">
                  {Number(invoicePreview.discountPercent || 0).toFixed(2)}%
                </div>
              </div>
              
              <div className="border-t border-blue-200 my-2" />
              
              <div className="grid grid-cols-2 gap-2">
                <div className="text-blue-700">Montant calculé :</div>
                <div className="font-medium text-blue-900">
                  {formatFcfa(invoicePreview.pricingTotals?.totalFcfa || 0)}
                </div>
                
                <div className="text-blue-700">Montant AS400 :</div>
                <div className="font-medium text-blue-900">
                  {formatFcfa(invoicePreview.effectiveInvoiceTotalFcfa || 0)}
                </div>
                
                <div className="text-blue-700">Frais opérateur :</div>
                <div className="font-medium text-blue-900">
                  {formatFcfa(invoicePreview.payment?.paymentServiceFeeFcfa || 0)}
                </div>
              </div>
              
              <div className="border-t border-blue-200 my-2" />
              
              <div className="flex items-center justify-between bg-blue-100 rounded-lg p-3">
                <span className="font-semibold text-blue-900">Total à payer :</span>
                <span className="text-lg font-bold text-blue-900">
                  {formatFcfa(invoicePreview.payment?.amountToPayFcfa || 0)}
                </span>
              </div>
              
              {invoicePreview.requiresAdjustmentReason && (
                <Alert tone="amber" className="mt-2 text-xs">
                  Un motif d'ajustement est requis avant facturation
                </Alert>
              )}
            </div>
          ) : (
            <p className="text-sm text-blue-600 text-center py-4">
              Sélectionnez un grade pour voir l'aperçu
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              !canInvoice || saving || !invoiceGrade || !invoiceRef ||
              (invoicePreview?.requiresAdjustmentReason && !invoiceAdjustmentReason?.trim())
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800"
            }`}
            onClick={onInvoice}
            disabled={
              !canInvoice || saving || !invoiceGrade || !invoiceRef ||
              (invoicePreview?.requiresAdjustmentReason && !invoiceAdjustmentReason?.trim())
            }
            type="button"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Traitement...
              </span>
            ) : isCash ? (
              <>
                <span className="mr-1">💵</span>
                Facturer & envoyer
              </>
            ) : (
              <>
                <span className="mr-1">💳</span>
                Facturer + Paiement
              </>
            )}
          </button>
          
          {canSwitchToManualPayment && (
            <button
              type="button"
              onClick={onSwitchToManualPayment}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-sm font-medium hover:bg-amber-100 disabled:opacity-50 whitespace-nowrap transition-colors"
            >
              Paiement caisse
            </button>
          )}
        </div>
        
        {/* Lien de paiement */}
        {!isCash && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase">Lien de paiement</span>
              {resolvedPaymentLink ? (
                <div className="flex items-center gap-2">
                  <a
                    href={resolvedPaymentLink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-mono truncate max-w-[200px] transition-colors"
                  >
                    {resolvedPaymentLink.substring(0, 30)}...
                  </a>
                  <button
                    onClick={() => navigator.clipboard?.writeText(resolvedPaymentLink)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                    type="button"
                    title="Copier le lien"
                  >
                    📋
                  </button>
                </div>
              ) : (
                <span className="text-sm text-gray-400">Généré après facturation</span>
              )}
            </div>
          </div>
        )}
      </div>
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
  const [showDetails, setShowDetails] = React.useState(false);
  const showWaveActions = canUseWave && (resolvedPaymentLink || !isPaymentSucceeded);
  const canPrintReceipt = canUseWave && isPaymentSucceeded;

  return (
    <CompactInfoCard 
      title={
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-lg">🌊</span>
          <span>Paiement Wave</span>
          {isPaymentSucceeded && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
              ✓ Payé
            </span>
          )}
        </div>
      }
    >
      {!canUseWave ? (
        <Alert tone="gray" title="Paiement manuel" className="text-sm">
          Cette commande n'utilise pas de lien de paiement automatique.
        </Alert>
      ) : (
        <div className="space-y-4">
          {/* Résumé rapide */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Statut</div>
              <PaymentStatusBadge status={paymentStatus} />
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Montant</div>
              <div className="font-semibold text-gray-900">
                {formatFcfa(amountPaidValue)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Numéro</div>
              <div className="text-sm font-mono text-gray-700 truncate" title={payerPhone}>
                {payerPhone || "—"}
              </div>
            </div>
          </div>
          
          {/* Bouton détails */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <span>Détails de la transaction</span>
            <span className="text-gray-400 transition-transform duration-200" style={{ transform: showDetails ? 'rotate(180deg)' : 'none' }}>
              ▼
            </span>
          </button>
          
          {/* Détails */}
          {showDetails && (
            <div className="space-y-1 pt-2 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
              <Row label="Client Ref" value={visibleClientRef || "—"} copyable={Boolean(visibleClientRef)} />
              <Row label="Provider" value={paymentProvider || "WAVE"} />
              <Row label="Session" value={paymentSessionId} copyable={paymentSessionId !== "—"} />
              <Row label="Transaction" value={paymentTxnId} copyable={paymentTxnId !== "—"} />
              <Row label="Payé le" value={formatDateTime(paidAtValue)} highlight={isPaymentSucceeded} />
            </div>
          )}
          
          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
            {showWaveActions && (
              <>
                <button
                  onClick={onInitiateWave}
                  disabled={!canUseWave || saving || waveLoading}
                  className="flex-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {resolvedPaymentLink ? "🔄 Réinitialiser" : "💳 Initier paiement"}
                </button>
                <button
                  onClick={syncWaveHandler}
                  disabled={!canUseWave || saving || waveLoading || paymentSessionId === "—"}
                  className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  title="Synchroniser le statut"
                >
                  🔄
                </button>
              </>
            )}
            
            {resolvedPaymentLink && (
              <a
                href={resolvedPaymentLink}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 transition-colors"
              >
                🔗 Ouvrir
              </a>
            )}
            
            {canPrintReceipt && (
              <button
                onClick={onPrintReceipt}
                className="flex-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors shadow-sm"
              >
                🖨️ Imprimer reçu
              </button>
            )}
            
            {typeof reload === "function" && (
              <button
                onClick={reload}
                disabled={saving || waveLoading}
                className="px-3 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Rafraîchir"
              >
                🔄
              </button>
            )}
          </div>
          
          {/* Messages d'état */}
          {isPaymentPending && (
            <Alert tone="blue" className="text-xs">
              ⏳ En attente de paiement client
            </Alert>
          )}
          {isPaymentExpired && (
            <Alert tone="amber" className="text-xs">
              ⏰ Lien expiré - veuillez réinitialiser le paiement
            </Alert>
          )}
          {(isPaymentCancelled || isPaymentFailed) && (
            <Alert tone="red" className="text-xs">
              ❌ Paiement échoué - veuillez réessayer
            </Alert>
          )}
          
          {/* Dev tools */}
          {showWaveDevTools && onSimulateWave && (
            <div className="pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2">🛠️ Dev Tools</div>
              <div className="flex gap-2">
                <button
                  onClick={() => onSimulateWave("succeeded")}
                  className="flex-1 px-2 py-1.5 text-xs bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                >
                  ✅ Success
                </button>
                <button
                  onClick={() => onSimulateWave("expired")}
                  className="flex-1 px-2 py-1.5 text-xs bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors"
                >
                  ⏰ Expired
                </button>
                <button
                  onClick={() => onSimulateWave("failed")}
                  className="flex-1 px-2 py-1.5 text-xs bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  ❌ Failed
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </CompactInfoCard>
  );
}

function CashPaymentCard({
  canCashPay,
  saving,
  status,
  cashNote,
  setCashNote,
  cashReceiptNumber,
  setCashReceiptNumber,
  cashDeskLabel,
  setCashDeskLabel,
  cashAmountReceivedFcfa,
  setCashAmountReceivedFcfa,
  onCashPay,
}) {
  const isPaid = status === "PAID";

  return (
    <CompactInfoCard 
      title={
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-lg">💵</span>
          <span>Paiement Espèces</span>
          {isPaid && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
              ✓ Encaissé
            </span>
          )}
        </div>
      }
    >
      <Alert tone="amber" className="mb-4 text-xs">
        Paiement manuel au bureau. L'admin encaisse et valide.
      </Alert>
      
      <div className="space-y-4">
        <Field label="Note d'encaissement" optional>
          <textarea
            className="w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm min-h-[80px] resize-none disabled:bg-gray-50 disabled:opacity-60 transition-all"
            value={cashNote || ""}
            onChange={(e) => setCashNote?.(e.target.value)}
            disabled={!canCashPay || saving || isPaid}
            placeholder="Ex: Paiement reçu au comptoir..."
          />
        </Field>
        
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="N° reçu caisse">
            <input
              className="w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm disabled:bg-gray-50 disabled:opacity-60 transition-all"
              value={cashReceiptNumber || ""}
              onChange={(e) => setCashReceiptNumber?.(e.target.value)}
              disabled={!canCashPay || saving || isPaid}
              placeholder="RC-CAISSE-0001"
            />
          </Field>
          
          <Field label="Poste de caisse" optional>
            <input
              className="w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm disabled:bg-gray-50 disabled:opacity-60 transition-all"
              value={cashDeskLabel || ""}
              onChange={(e) => setCashDeskLabel?.(e.target.value)}
              disabled={!canCashPay || saving || isPaid}
              placeholder="Caisse principale"
            />
          </Field>
        </div>
        
        <Field label="Montant reçu (FCFA)">
          <div className="relative">
            <input
              className="w-full pl-3 pr-12 py-2.5 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm disabled:bg-gray-50 disabled:opacity-60 transition-all"
              value={cashAmountReceivedFcfa || ""}
              onChange={(e) => setCashAmountReceivedFcfa?.(e.target.value)}
              disabled={!canCashPay || saving || isPaid}
              placeholder="Montant encaissé"
              inputMode="numeric"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              FCFA
            </span>
          </div>
        </Field>
        
        <div className="flex items-center gap-3 pt-2">
          <button
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              !canCashPay ||
              saving ||
              isPaid ||
              !String(cashReceiptNumber || "").trim() ||
              !String(cashAmountReceivedFcfa || "").trim()
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-md hover:shadow-lg hover:from-amber-700 hover:to-amber-800"
            }`}
            onClick={onCashPay}
            disabled={
              !canCashPay ||
              saving ||
              isPaid ||
              !String(cashReceiptNumber || "").trim() ||
              !String(cashAmountReceivedFcfa || "").trim()
            }
            type="button"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Traitement...
              </span>
            ) : (
              <>
                <span className="mr-1">💰</span>
                Marquer encaissé
              </>
            )}
          </button>
          <span className="text-xs text-gray-500">
            {isPaid ? "✓ Payé" : canCashPay ? "Prêt" : "Non disponible"}
          </span>
        </div>
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
    <CompactInfoCard 
      title={
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-lg">📎</span>
          <span>Paiement Manuel</span>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Indicateurs d'étapes */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <StepIndicator number={1} title="Preuve" active={!step1Completed && isInvoiced} completed={step1Completed} />
          <StepIndicator number={2} title="Validation" active={step1Completed && !step2Completed} completed={step2Completed} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {/* Étape 1 - Preuve */}
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>📸</span>
              Étape 1 - Preuve de paiement
            </h5>
            
            <Field label="URL preuve" optional>
              <input
                className="w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm disabled:bg-gray-50 disabled:opacity-60 transition-all"
                value={proofUrl || ""}
                onChange={(e) => setProofUrl?.(e.target.value)}
                disabled={!canProof || saving || step1Completed}
                placeholder="https://..."
              />
            </Field>
            
            <Field label="Référence transaction" optional>
              <input
                className="w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm disabled:bg-gray-50 disabled:opacity-60 transition-all"
                value={proofRef || ""}
                onChange={(e) => setProofRef?.(e.target.value)}
                disabled={!canProof || saving || step1Completed}
                placeholder="WAVE-XXXX / OM-XXXX"
              />
            </Field>
            
            <Field label="Note" optional>
              <textarea
                className="w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm min-h-[70px] resize-none disabled:bg-gray-50 disabled:opacity-60 transition-all"
                value={proofNote || ""}
                onChange={(e) => setProofNote?.(e.target.value)}
                disabled={!canProof || saving || step1Completed}
                placeholder="Capture recue par SMS/WhatsApp..."
              />
            </Field>
            
            <div className="flex items-center justify-between gap-3">
              <button
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  !canProof || saving || step1Completed
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                }`}
                onClick={onProof}
                disabled={!canProof || saving || step1Completed}
                type="button"
              >
                {saving ? "..." : "📸 Enregistrer la preuve"}
              </button>
              <span className="text-xs text-gray-500">
                {step1Completed ? "✓ Reçue" : "INVOICED requis"}
              </span>
            </div>
          </div>

          {/* Étape 2 - Validation */}
          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span>✅</span>
              Étape 2 - Validation finale
            </h5>
            
            <Field label="Note de validation" optional>
              <input
                className="w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 text-sm disabled:bg-gray-50 disabled:opacity-60 transition-all"
                value={verifyNote || ""}
                onChange={(e) => setVerifyNote?.(e.target.value)}
                disabled={!canVerify || saving || step2Completed}
                placeholder="Paiement vérifié..."
              />
            </Field>
            
            <div className="flex items-center justify-between gap-3">
              <button
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  !canVerify || saving || step2Completed
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                }`}
                onClick={onVerify}
                disabled={!canVerify || saving || step2Completed}
                type="button"
              >
                {saving ? "..." : "✅ Valider le paiement"}
              </button>
              <span className="text-xs text-gray-500">
                {step2Completed ? "✓ Validé" : "PAYMENT_PENDING requis"}
              </span>
            </div>
          </div>
        </div>

        {/* Preuve enregistrée */}
        {(order?.manualPaymentProofUrl || order?.paymentProofUrl || order?.manualPaymentReference) && (
          <div className="pt-3 border-t border-gray-100">
            <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📋</span>
              Preuve enregistrée
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Row
                label="URL"
                value={
                  order?.manualPaymentProofUrl || order?.paymentProofUrl ? (
                    <a 
                      href={order?.manualPaymentProofUrl || order?.paymentProofUrl} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="text-indigo-600 hover:text-indigo-800 text-sm transition-colors"
                    >
                      🔗 Voir la preuve
                    </a>
                  ) : "—"
                }
              />
              <Row label="Référence" value={order?.manualPaymentReference || order?.paymentRef || "—"} copyable />
            </div>
            {(order?.manualPaymentProofNote || order?.paymentProofNote) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-700">
                {order?.manualPaymentProofNote || order?.paymentProofNote}
              </div>
            )}
          </div>
        )}
      </div>
    </CompactInfoCard>
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
    <CompactInfoCard 
      title={
        <div className="flex items-center gap-2">
          <span className="text-green-600 text-lg">📱</span>
          <span>SMS & Suivi client</span>
        </div>
      }
      collapsible
    >
      <div className="space-y-4">
        {/* Message envoyé */}
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
          <div className="text-xs text-gray-500 uppercase mb-2">Message envoyé</div>
          {hasWhatsappMessage ? (
            <div className="text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-y-auto font-mono">
              {order?.whatsappMessage}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-4">
              Aucun message généré
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <button
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm disabled:opacity-50 transition-colors"
            onClick={onCopyWhatsApp}
            disabled={!hasWhatsappMessage}
            type="button"
          >
            📋 Copier
          </button>
          {typeof onResendWhatsApp === "function" && (
            <button
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm disabled:opacity-50 transition-colors"
              onClick={onResendWhatsApp}
              disabled={
                saving ||
                !String(billingMessage?.toPhone || order?.factureWhatsappTo || "").trim()
              }
              type="button"
            >
              🔄 Renvoyer
            </button>
          )}
          {resolvedPaymentLink && (
            <a
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm transition-colors"
              href={resolvedPaymentLink}
              target="_blank"
              rel="noreferrer"
            >
              🔗 Lien paiement
            </a>
          )}
        </div>

        {/* Détails */}
        <div className="space-y-1 pt-2 border-t border-gray-100">
          <Row label="Statut" value={<MessageStatusBadge status={resolvedWhatsappStatus} />} />
          <Row label="Destinataire" value={billingMessage?.toPhone || order?.factureWhatsappTo || "—"} />
          <Row label="Envoyé le" value={formatDateTime(billingMessage?.sentAt)} />
          <Row 
            label="Lien cliqué" 
            value={order?.paymentLinkClickedAt ? `✅ ${formatDateTime(order.paymentLinkClickedAt)}` : "Non"} 
          />
          <Row label="Clics" value={order?.paymentLinkClickCount || 0} />
          <Row label="Dernière MAJ" value={formatDateTime(billingMessage?.lastStatusAt || order?.lastWhatsappStatusAt)} />
        </div>

        {billingMessage?.errorMessage && (
          <Alert tone="red" className="text-xs">
            ⚠️ {billingMessage.errorMessage}
          </Alert>
        )}
      </div>
    </CompactInfoCard>
  );
}

function TraceabilityCard({ order, status, paymentProvider, paymentSessionId, paymentTxnId, paidAtValue, amountPaidValue }) {
  return (
    <CompactInfoCard 
      title={
        <div className="flex items-center gap-2">
          <span className="text-purple-600 text-lg">🧾</span>
          <span>Traçabilité</span>
        </div>
      }
    >
      <div className="space-y-1">
        <Row label="Commande" value={status || "—"} />
        <Row label="Provider" value={paymentProvider || "—"} />
        <Row label="Facture" value={order?.factureReference || "—"} />
        <Row label="Précommande" value={order?.preorderNumber || "—"} />
        <Row label="Session" value={paymentSessionId} copyable={paymentSessionId !== "—"} />
        <Row label="Transaction" value={paymentTxnId} copyable={paymentTxnId !== "—"} />
        <Row label="Payé le" value={formatDateTime(paidAtValue)} />
        <Row label="Montant payé" value={formatFcfa(amountPaidValue)} highlight />
      </div>
    </CompactInfoCard>
  );
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

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
  invoiceAmountFcfa,
  setInvoiceAmountFcfa,
  invoiceAdjustmentReason,
  setInvoiceAdjustmentReason,
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
  cashReceiptNumber,
  setCashReceiptNumber,
  cashDeskLabel,
  setCashDeskLabel,
  cashAmountReceivedFcfa,
  setCashAmountReceivedFcfa,
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
  showReinvoiceHint = false,
  canSwitchToManualPayment = false,
  onSwitchToManualPayment = null,
  variant = "billing",
  canReplaceBillingItems = false,
  replacementProducts = [],
  replacementQuery = "",
  setReplacementQuery = null,
  replacementLoading = false,
  replacingItemId = "",
  onReplaceBillingItem = null,
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

  const billingStatusAt = billingMessage?.lastStatusAt
    ? new Date(billingMessage.lastStatusAt).getTime()
    : 0;
  const orderStatusAt = order?.lastWhatsappStatusAt
    ? new Date(order.lastWhatsappStatusAt).getTime()
    : 0;
  const resolvedWhatsappStatus =
    orderStatusAt >= billingStatusAt
      ? order?.lastWhatsappStatus || billingMessage?.status || null
      : billingMessage?.status || order?.lastWhatsappStatus || null;
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
  const showSummaryCards = variant === "payment" || variant === "billing";
  const showTraceability = false;
  const showTimeline = false;
  const syncWaveHandler = onRefreshWaveStatus || onSyncWave;
  
  const [activeSection, setActiveSection] = React.useState(
    variant === "billing" ? "billing" : variant === "payment" ? "payment" : "messages"
  );

  const handlePrintReceipt = () => {
    if (!isWaveFlow || !isPaymentSucceeded || typeof window === "undefined") return;

    const receiptWindow = window.open("", "_blank", "width=420,height=720");
    if (!receiptWindow) return;

    receiptWindow.document.open();
    receiptWindow.document.write(
      buildThermalReceiptHtml({
        preorderNumber: order?.preorderNumber || "—",
        factureReference: order?.factureReference || "—",
        countryName: resolveReceiptCountryLabel(order),
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
    if (isPaymentSucceeded) return { tone: "emerald", text: "✅ Paiement confirmé" };
    if (isWaveFlow && isPaymentPending) return { tone: "blue", text: "Paiement Wave en attente de finalisation client" };
    if (isManualFlow && status === "PAYMENT_PENDING" && !isPaymentSucceeded) {
      return { tone: "amber", text: "Preuve reçue - validation finale attendue" };
    }
    if (isPaymentExpired) return { tone: "amber", text: "Lien expiré - réinitialiser le paiement" };
    if (isPaymentCancelled || isPaymentFailed) return { tone: "red", text: "Paiement échoué - réessayer" };
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <div className="space-y-6">
      {/* Navigation par onglets pour mobile (uniquement pour variant full) */}
      {variant !== "billing" && variant !== "payment" && (
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl sm:hidden">
          <button
            onClick={() => setActiveSection("billing")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeSection === "billing"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Facturation
          </button>
          <button
            onClick={() => setActiveSection("payment")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeSection === "payment"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Paiement
          </button>
          <button
            onClick={() => setActiveSection("messages")}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
              activeSection === "messages"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Messages
          </button>
        </div>
      )}
      
      {/* Cartes de résumé */}
      {showSummaryCards && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="État"
            value={<PaymentStatusBadge status={paymentStatus || status} />}
            subvalue={hasInvoice ? "Facturée" : "À facturer"}
            tone={hasInvoice ? "emerald" : "gray"}
            icon="📊"
          />
          <StatCard
            label="Montant"
            value={formatFcfa(order?.activePayment?.amountExpectedFcfa || order?.totalFcfa)}
            subvalue="Total à régler"
            tone="blue"
            icon="💰"
          />
          <StatCard
            label="Mode"
            value={<PaymentMethodBadge isCash={isCash} isWaveFlow={isWaveFlow} />}
            subvalue={paymentProvider || order?.paymentMode || order?.preorderPaymentMode || "—"}
            tone={isCash ? "amber" : isWaveFlow ? "blue" : "gray"}
            icon={isCash ? "💵" : "💳"}
          />
          {variant !== "payment" && (
            <StatCard
              label="Facture"
              value={order?.factureReference || "—"}
              subvalue={hasInvoice ? "Générée" : "En attente"}
              tone={hasInvoice ? "emerald" : "gray"}
              icon="📄"
            />
          )}
        </div>
      )}

      {/* Message d'état global */}
      {statusMessage && (
        <Alert tone={statusMessage.tone} dismissible>
          {statusMessage.text}
        </Alert>
      )}

      {/* Alerte de refacturation */}
      {showReinvoiceHint && (
        <Alert tone="amber" dismissible>
          Produit remplacé après facturation : refacturez cette commande puis renvoyez le SMS client.
        </Alert>
      )}

      {/* Section Facturation */}
      {(activeSection === "billing" || variant === "billing") && showBillingSection && (
        <div className={variant !== "billing" ? "sm:block" : ""}>
          {variant === "billing" ? (
            <div className="grid gap-6 lg:grid-cols-12">
              <CompactInfoCard 
                title={
                  <div className="flex items-center gap-2">
                    <span>👤</span>
                    Informations client
                  </div>
                }
                className="lg:col-span-4"
              >
                <div className="space-y-1">
                  <Row label="Client" value={order?.fboNomComplet || "—"} />
                  <Row label="N° FBO" value={order?.fboNumero || "—"} copyable />
                  <Row label="Précommande" value={order?.preorderNumber || "—"} copyable />
                  <Row label="Paiement" value={humanizeEnum(order?.preorderPaymentMode || order?.paymentMode)} />
                  <Row label="Livraison" value={humanizeEnum(order?.deliveryMode)} />
                  <Row 
                    label="Montant actuel" 
                    value={formatFcfa(order?.as400InvoiceTotalFcfa || order?.totalFcfa || 0)} 
                    highlight 
                  />
                </div>
              </CompactInfoCard>
              
              <div className="lg:col-span-8">
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
                  invoiceAmountFcfa={invoiceAmountFcfa}
                  setInvoiceAmountFcfa={setInvoiceAmountFcfa}
                  invoiceAdjustmentReason={invoiceAdjustmentReason}
                  setInvoiceAdjustmentReason={setInvoiceAdjustmentReason}
                  invoicePreview={invoicePreview}
                  invoicePreviewLoading={invoicePreviewLoading}
                  onInvoice={onInvoice}
                  canSwitchToManualPayment={canSwitchToManualPayment}
                  onSwitchToManualPayment={onSwitchToManualPayment}
                  resolvedPaymentLink={resolvedPaymentLink}
                />
              </div>
            </div>
          ) : (
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
              invoiceAmountFcfa={invoiceAmountFcfa}
              setInvoiceAmountFcfa={setInvoiceAmountFcfa}
              invoiceAdjustmentReason={invoiceAdjustmentReason}
              setInvoiceAdjustmentReason={setInvoiceAdjustmentReason}
              invoicePreview={invoicePreview}
              invoicePreviewLoading={invoicePreviewLoading}
              onInvoice={onInvoice}
              canSwitchToManualPayment={canSwitchToManualPayment}
              onSwitchToManualPayment={onSwitchToManualPayment}
              resolvedPaymentLink={resolvedPaymentLink}
            />
          )}
        </div>
      )}

      {/* Section Paiement Wave */}
      {(activeSection === "payment" || variant === "payment") && !isCash && (
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
      )}

      {/* Section Paiement Espèces */}
      {isCash && (
        <RequirePermission permission={Permission.PAYMENT_VALIDATE}>
          <CashPaymentCard
            canCashPay={canCashPay}
            saving={saving}
            status={status}
            cashNote={cashNote}
            setCashNote={setCashNote}
            cashReceiptNumber={cashReceiptNumber}
            setCashReceiptNumber={setCashReceiptNumber}
            cashDeskLabel={cashDeskLabel}
            setCashDeskLabel={setCashDeskLabel}
            cashAmountReceivedFcfa={cashAmountReceivedFcfa}
            setCashAmountReceivedFcfa={setCashAmountReceivedFcfa}
            onCashPay={onCashPay}
          />
        </RequirePermission>
      )}

      {/* Section Paiement Manuel */}
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

      {/* Section Messages */}
      {(activeSection === "messages" || showMessageSection) && (
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

      {/* Section Traçabilité (optionnelle) */}
      {showTraceability && (
        <TraceabilityCard
          order={order}
          status={status}
          paymentProvider={paymentProvider}
          paymentSessionId={paymentSessionId}
          paymentTxnId={paymentTxnId}
          paidAtValue={paidAtValue}
          amountPaidValue={amountPaidValue}
        />
      )}

      {/* Timeline des paiements */}
      {showTimeline && <PaymentTimeline items={paymentTimelineItems} />}

      {/* Table des articles pour la facturation */}
      {variant === "billing" && (
        <OrderItemsTable
          items={order?.items || []}
          totalFcfa={order?.as400InvoiceTotalFcfa || order?.totalFcfa || 0}
          canReplace={canReplaceBillingItems}
          replacementProducts={replacementProducts}
          replacementQuery={replacementQuery}
          onReplacementQueryChange={setReplacementQuery}
          replacementLoading={replacementLoading}
          replacingItemId={replacingItemId}
          saving={saving}
          onReplaceItem={onReplaceBillingItem}
        />
      )}
    </div>
  );
}