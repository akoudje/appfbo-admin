// src/components/orders/detail/OrderBillingPaymentTab.jsx
import React from "react";
import RequirePermission from "../../auth/RequirePermission";
import { Permission } from "../../../auth/permissions";
import OrderItemsTable from "./OrderItemsTable";
import { InfoDialog } from "../../ui/Dialogs";
import { ordersService } from "../../../services/ordersService";

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
// COMPOSANTS UTILITAIRES
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildWaveReceiptHtml({
  preorderNumber,
  factureReference,
  customerName,
  fboNumero,
  paymentProvider,
  paymentTxnId,
  payerPhone,
  paidAt,
  amountPaid,
}) {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reçu paiement Wave</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 24px; color: #111827; }
      h1 { font-size: 20px; margin: 0 0 14px; }
      .box { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
      .row { display: flex; justify-content: space-between; gap: 14px; padding: 6px 0; border-bottom: 1px solid #f3f4f6; }
      .row:last-child { border-bottom: 0; }
      .label { color: #6b7280; font-size: 13px; }
      .value { font-weight: 600; text-align: right; }
      .amount { font-size: 18px; }
      @media print { body { margin: 10mm; } }
    </style>
  </head>
  <body>
    <h1>Reçu de paiement Wave</h1>
    <div class="box">
      <div class="row"><div class="label">Précommande</div><div class="value">${escapeHtml(preorderNumber || "—")}</div></div>
      <div class="row"><div class="label">Référence facture</div><div class="value">${escapeHtml(factureReference || "—")}</div></div>
      <div class="row"><div class="label">Client</div><div class="value">${escapeHtml(customerName || "—")}</div></div>
      <div class="row"><div class="label">Numéro FBO</div><div class="value">${escapeHtml(fboNumero || "—")}</div></div>
      <div class="row"><div class="label">Provider</div><div class="value">${escapeHtml(paymentProvider || "WAVE")}</div></div>
      <div class="row"><div class="label">Transaction</div><div class="value">${escapeHtml(paymentTxnId || "—")}</div></div>
      <div class="row"><div class="label">Numéro payeur</div><div class="value">${escapeHtml(payerPhone || "—")}</div></div>
      <div class="row"><div class="label">Date paiement</div><div class="value">${escapeHtml(paidAt || "—")}</div></div>
      <div class="row"><div class="label">Montant payé</div><div class="value amount">${escapeHtml(amountPaid || "—")}</div></div>
    </div>
    <script>
      window.addEventListener("load", function () {
        setTimeout(function () { window.print(); }, 250);
      });
      window.addEventListener("afterprint", function () {
        setTimeout(function () { window.close(); }, 120);
      });
    </script>
  </body>
</html>`;
}

function resolveAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const defaultApi =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:4000/api"
      : "https://appfbo-backend.onrender.com/api";
  const apiBase = import.meta.env.VITE_API_BASE_URL || defaultApi;
  const origin = String(apiBase || "").replace(/\/api\/?$/, "");

  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw}`;
}

function isImageProof(url = "") {
  return /\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(String(url || ""));
}

function isPdfProof(url = "") {
  return /\.pdf(\?|#|$)/i.test(String(url || ""));
}

function printProof(url) {
  if (!url || typeof window === "undefined") return;

  const popup = window.open("", "_blank", "width=980,height=800");
  if (!popup) return;

  const safeUrl = String(url).replace(/"/g, "&quot;");
  const isPdf = isPdfProof(url);
  const content = isPdf
    ? `<iframe src="${safeUrl}" style="width:100%;height:100%;border:0;"></iframe>`
    : `<img src="${safeUrl}" alt="Preuve paiement" style="max-width:100%;max-height:100%;object-fit:contain;" />`;

  popup.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Preuve de paiement</title>
    <style>
      html, body { margin: 0; height: 100%; background: #111; display:flex; align-items:center; justify-content:center; }
    </style>
  </head>
  <body>${content}</body>
</html>`);
  popup.document.close();
  popup.focus();
  popup.addEventListener("load", () => {
    setTimeout(() => {
      try {
        popup.print();
      } catch {
        // noop
      }
    }, 500);
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

function getLatestAttempt(order) {
  const attempts = order?.activePayment?.attempts;
  if (Array.isArray(attempts) && attempts.length > 0) return attempts[0];
  return null;
}

// ============================================
// COMPOSANT DE FACTURATION
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
  invoicePreview,
  invoicePreviewLoading,
  onInvoice,
  canSwitchToManualPayment = false,
  onSwitchToManualPayment = null,
  onResendInvoiceNotification = null,
  resolvedPaymentLink,
  order,
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
        {/* Informations de commande (compact) */}
        <div className="grid grid-cols-3 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
          <div>
            <div className="text-xs text-gray-500">Commande</div>
            <div className="font-semibold text-gray-900">{order?.preorderNumber || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Montant total</div>
            <div className="font-semibold text-gray-900">{formatFcfa(order?.totalFcfa || 0)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Paiement</div>
            <div className="font-medium text-gray-700">{humanizeEnum(order?.preorderPaymentMode)}</div>
          </div>
        </div>

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

          <Field label="Numéro du destinataire" optional>
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
                </div>
              ) : (
                <p className="text-sm text-blue-600 text-center py-4">
                  Sélectionnez un grade pour voir l'aperçu
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
              !canInvoice || saving || !invoiceGrade || !invoiceRef
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-indigo-800"
            }`}
            onClick={onInvoice}
            disabled={
              !canInvoice || saving || !invoiceGrade || !invoiceRef
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
              title="Basculer ce règlement distant vers un encaissement à la caisse"
            >
              Basculer en caisse
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
            {resolvedPaymentLink ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={onResendInvoiceNotification}
                  disabled={saving || typeof onResendInvoiceNotification !== "function"}
                  className="px-3 py-2 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                >
                  Renvoyer le lien par SMS / email
                </button>
              </div>
            ) : null}
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <span className="text-blue-600 text-lg">🌊</span>
          <h4 className="font-semibold text-gray-900">Paiement Wave</h4>
          {isPaymentSucceeded && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
              ✓ Payé
            </span>
          )}
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        {!canUseWave ? (
          <Alert tone="gray" title="Paiement manuel" className="text-sm">
            Cette commande n'utilise pas de lien de paiement automatique.
          </Alert>
        ) : (
          <>
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
          </>
        )}
      </div>
    </div>
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <span className="text-amber-600 text-lg">💵</span>
          <h4 className="font-semibold text-gray-900">Paiement Espèces</h4>
          {isPaid && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full border border-green-200">
              ✓ Encaissé
            </span>
          )}
        </div>
      </div>
      
      <div className="p-5 space-y-4">
        <Alert tone="amber" className="text-xs">
          Paiement manuel au bureau. L'admin encaisse et valide.
        </Alert>
        
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
    </div>
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
  const latestBankProof = Array.isArray(order?.bankPaymentProofs)
    ? order.bankPaymentProofs[0]
    : null;
  const [proofBlobUrl, setProofBlobUrl] = React.useState("");
  const [proofBlobMimeType, setProofBlobMimeType] = React.useState("");
  const [proofBlobLoading, setProofBlobLoading] = React.useState(false);
  const [proofBlobError, setProofBlobError] = React.useState("");

  const legacyProofUrl = resolveAssetUrl(
    order?.manualPaymentProofUrl || order?.paymentProofUrl || "",
  );
  const effectiveProofUrl = proofBlobUrl || legacyProofUrl;
  const effectiveProofRef =
    latestBankProof?.reference ||
    order?.manualPaymentReference ||
    order?.paymentRef ||
    "—";
  const effectiveProofNote =
    latestBankProof?.note ||
    order?.manualPaymentProofNote ||
    order?.paymentProofNote ||
    "";
  const proofSubmittedAt =
    latestBankProof?.submittedAt ||
    order?.manualPaymentReceivedAt ||
    order?.proofReceivedAt ||
    null;
  const showPdfPreview = proofBlobUrl
    ? String(proofBlobMimeType || "").toLowerCase().includes("pdf")
    : isPdfProof(effectiveProofUrl);
  const showImagePreview = proofBlobUrl
    ? String(proofBlobMimeType || "").toLowerCase().startsWith("image/")
    : isImageProof(effectiveProofUrl);

  React.useEffect(() => {
    let objectUrl = "";
    let active = true;

    async function loadProofBlob() {
      if (!order?.id || (!latestBankProof?.id && !order?.manualPaymentProofUrl)) {
        setProofBlobUrl("");
        setProofBlobMimeType("");
        setProofBlobError("");
        setProofBlobLoading(false);
        return;
      }

      try {
        setProofBlobLoading(true);
        setProofBlobError("");

        const response = latestBankProof?.id
          ? await ordersService.downloadBankProofFile(order.id, latestBankProof.id)
          : await ordersService.downloadLegacyManualProofFile(order.id);

        const mimeType = String(
          response?.headers?.["content-type"] ||
            latestBankProof?.fileMimeType ||
            "application/octet-stream",
        );
        const blob = new Blob([response.data], { type: mimeType });
        objectUrl = URL.createObjectURL(blob);
        if (!active) return;
        setProofBlobUrl(objectUrl);
        setProofBlobMimeType(mimeType);
      } catch (e) {
        if (!active) return;
        setProofBlobUrl("");
        setProofBlobMimeType("");
        setProofBlobError(
          e?.response?.data?.message ||
            "Impossible de charger la preuve sécurisée.",
        );
      } finally {
        if (active) setProofBlobLoading(false);
      }
    }

    loadProofBlob();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [
    latestBankProof?.fileMimeType,
    latestBankProof?.id,
    order?.id,
    order?.manualPaymentProofUrl,
  ]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2">
          <span className="text-gray-600 text-lg">📎</span>
          <h4 className="font-semibold text-gray-900">Paiement Manuel</h4>
        </div>
      </div>
      
      <div className="p-5 space-y-5">
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
                placeholder="Capture reçue par SMS/WhatsApp..."
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
        {(latestBankProof?.id ||
          order?.manualPaymentProofUrl ||
          order?.paymentProofUrl ||
          order?.manualPaymentReference ||
          order?.paymentRef) && (
          <div className="pt-3 border-t border-gray-100">
            <h5 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <span>📋</span>
              Preuve enregistrée
            </h5>
            {proofBlobLoading ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-4 text-sm text-gray-500">
                Chargement sécurisé de la preuve...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Row label="Référence" value={effectiveProofRef} copyable />
                  <Row label="Déposée le" value={formatDateTime(proofSubmittedAt)} />
                </div>

                {effectiveProofNote ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                    {effectiveProofNote}
                  </div>
                ) : null}

                {effectiveProofUrl ? (
                  <>
                    {showPdfPreview ? (
                      <div className="h-80 overflow-hidden rounded-lg border border-gray-200 bg-white">
                        <iframe
                          title="Aperçu preuve PDF"
                          src={effectiveProofUrl}
                          className="h-full w-full border-0"
                        />
                      </div>
                    ) : showImagePreview ? (
                      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
                        <img
                          src={effectiveProofUrl}
                          alt="Preuve de paiement"
                          className="max-h-80 w-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        Aperçu non disponible pour ce format. Ouvrez le fichier pour vérification.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={effectiveProofUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Ouvrir la preuve
                      </a>
                      <button
                        type="button"
                        onClick={() => printProof(effectiveProofUrl)}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Imprimer la preuve
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    Aucune URL de preuve disponible pour cette commande.
                  </div>
                )}

                {proofBlobError ? (
                  <div className="text-xs text-red-600">{proofBlobError}</div>
                ) : null}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
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
  invoicePreview,
  invoicePreviewLoading,
  paymentLink,
  onInvoice,
  isCash,
  isAutoPayment,
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
  onResendInvoiceNotification = null,
  canReplaceBillingItems = false,
  replacementProducts = [],
  replacementQuery = "",
  setReplacementQuery = null,
  replacementLoading = false,
  replacingItemId = "",
  onReplaceBillingItem = null,
}) {
  const [printPopupBlockedDialogOpen, setPrintPopupBlockedDialogOpen] = React.useState(false);
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
    paymentLink ||
    order?.paymentLinkTarget ||
    order?.trackedPaymentLink ||
    latestAttempt?.providerLaunchUrl ||
    latestAttempt?.checkoutUrl ||
    order?.paymentLink ||
    "";

  const normalizedPaymentStatus = String(paymentStatus || "").toUpperCase();
  const isPaymentPending = ["PAYMENT_PENDING", "PENDING_CUSTOMER_ACTION", "PROCESSING"].includes(normalizedPaymentStatus);
  const isPaymentSucceeded = ["SUCCEEDED", "PAID"].includes(normalizedPaymentStatus);
  const isPaymentExpired = normalizedPaymentStatus === "EXPIRED";
  const isPaymentCancelled = normalizedPaymentStatus === "CANCELLED";
  const isPaymentFailed = normalizedPaymentStatus === "FAILED";
  const syncWaveHandler = onRefreshWaveStatus || onSyncWave;

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

  const handlePrintWaveReceipt = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const popup = window.open("", "_blank", "width=460,height=760");
    if (!popup) {
      setPrintPopupBlockedDialogOpen(true);
      return;
    }
    const html = buildWaveReceiptHtml({
      preorderNumber: order?.preorderNumber || order?.id || "—",
      factureReference: order?.factureReference || "—",
      customerName: order?.fboNomComplet || "—",
      fboNumero: order?.fboNumero || "—",
      paymentProvider: paymentProvider || "WAVE",
      paymentTxnId,
      payerPhone,
      paidAt: formatDateTime(paidAtValue),
      amountPaid: formatFcfa(amountPaidValue),
    });
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
  }, [
    amountPaidValue,
    order?.factureReference,
    order?.fboNomComplet,
    order?.fboNumero,
    order?.id,
    order?.preorderNumber,
    paidAtValue,
    payerPhone,
    paymentProvider,
    paymentTxnId,
  ]);

  return (
    <div className="space-y-6">
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

      {/* Grille principale : Items à gauche, Facturation à droite */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colonne gauche : Items */}
        <div>
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
        </div>

        {/* Colonne droite : Facturation */}
        <div>
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
            invoicePreview={invoicePreview}
            invoicePreviewLoading={invoicePreviewLoading}
            onInvoice={onInvoice}
            canSwitchToManualPayment={canSwitchToManualPayment}
            onSwitchToManualPayment={onSwitchToManualPayment}
            onResendInvoiceNotification={onResendInvoiceNotification}
            resolvedPaymentLink={resolvedPaymentLink}
            order={order}
          />
        </div>
      </div>

      {/* Section Paiement Wave */}
      {!isCash && isWaveFlow && (
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
          onPrintReceipt={handlePrintWaveReceipt}
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

      <InfoDialog
        open={printPopupBlockedDialogOpen}
        title="Impression bloquée"
        message="L'ouverture de la fenêtre d'impression a été bloquée. Autorise les pop-ups puis réessaie."
        onClose={() => setPrintPopupBlockedDialogOpen(false)}
      />
    </div>
  );
}
