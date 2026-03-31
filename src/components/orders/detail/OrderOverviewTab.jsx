// src/components/orders/detail/OrderOverviewTab.jsx

import OrderTimeline from "./OrderTimeline";
import OrderSummaryCards from "./OrderSummaryCards";
import OrderItemsTable from "./OrderItemsTable";

// ============================================================================
// Sous-composants
// ============================================================================

function Alert({ tone = "amber", title, children }) {
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
    <div className={`rounded-lg border p-4 ${tones[tone] || tones.amber}`}>
      <div className="flex gap-3">
        <span className="text-lg" role="img" aria-hidden="true">
          {icons[tone] || icons.amber}
        </span>
        <div className="flex-1">
          {title && (
            <div className="font-semibold text-sm mb-1 flex items-center gap-2">
              {title}
            </div>
          )}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, children, className = "" }) {
  return (
    <div className={`card p-4 space-y-3 ${className}`}>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      {children}
    </div>
  );
}

function Row({ label, value, copyable = false }) {
  const isCopyable =
    copyable && typeof value === "string" && value.trim() && value !== "—";

  const handleCopy = () => {
    if (isCopyable) {
      navigator.clipboard?.writeText(value);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-500">{label}</span>
      <div className="font-medium text-right flex items-center gap-2">
        <span className="break-all">{value ?? "—"}</span>
        {isCopyable && (
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
    return d.toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
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

// ============================================================================
// Composant principal
// ============================================================================

export default function OrderOverviewTab({
  order,
  emptyOrder,
  steps,
  stockDebited,
  stockRestored,
  canReplaceBillingItems = false,
  replacementProducts = [],
  replacingItemId = "",
  saving = false,
  onReplaceBillingItem = null,
}) {
  const status = order?.status;
  const isCancelled = status === "CANCELLED";
  const isPaid = status === "PAID";
  const isReady = status === "READY";

  const renderAlert = () => {
    if (emptyOrder) {
      return (
        <Alert tone="amber" title="⚠️ Commande incomplète">
          <p>
            Cette commande contient{" "}
            <strong>{order?.items?.length || 0} article(s)</strong> pour un total de{" "}
            <strong>{formatFcfa(order?.totalFcfa)}</strong>.
          </p>
          <p className="mt-2">
            Si c'est une commande abandonnée, recommande au FBO de :
            <br />
            • <strong>Annuler</strong> la commande
            <br />
            • Ou <strong>recommencer</strong> depuis le début
          </p>
        </Alert>
      );
    }

    if (isCancelled) {
      return (
        <Alert tone="red" title="❌ Commande annulée">
          <div className="space-y-2">
            <div>
              <span className="text-gray-600">Motif :</span>{" "}
              <span className="font-medium">{order?.cancelReason || "Non spécifié"}</span>
            </div>
            {stockRestored && (
              <div className="flex items-center gap-2 text-emerald-700">
                <span>✅</span>
                <span>Le stock a été réintégré automatiquement.</span>
              </div>
            )}
          </div>
        </Alert>
      );
    }

    if (isPaid && !stockDebited) {
      return (
        <Alert tone="blue" title="💳 Commande payée">
          <p>
            Le paiement est confirmé. La prochaine étape est la{" "}
            <strong>préparation du colis</strong>.
          </p>
          <p className="mt-1">
            Le stock sera décrémenté au moment du passage en statut{" "}
            <strong>READY</strong>.
          </p>
        </Alert>
      );
    }

    if (isReady && stockDebited) {
      return (
        <Alert tone="emerald" title="📦 Commande prête">
          <p>Le colis est prêt et le stock a été décrémenté.</p>
          <p className="mt-1">La commande peut maintenant être clôturée.</p>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {renderAlert()}

      <OrderTimeline steps={steps} status={status} />

      <OrderSummaryCards order={order} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard title="Informations utiles">
          <div className="space-y-2">
            <Row label="Précommande" value={order?.preorderNumber || "—"} copyable />
            <Row label="Numéro FBO" value={order?.fboNumero || "—"} copyable />
            <Row label="Client" value={order?.fboNomComplet || "—"} />
            <Row label="Grade initial" value={humanizeEnum(order?.fboGrade)} />
            <Row label="Grade facturation" value={humanizeEnum(order?.billingGrade || order?.fboGrade)} />
            <Row label="Paiement choisi" value={humanizeEnum(order?.preorderPaymentMode || order?.paymentMode)} />
            <Row label="Livraison" value={humanizeEnum(order?.deliveryMode)} />
            <Row label="Point de vente" value={order?.pointDeVente || "—"} />
          </div>
        </InfoCard>

        <InfoCard title="Facturation utile">
          <div className="space-y-2">
            <Row label="Référence AS400" value={order?.factureReference || "—"} copyable />
            <Row label="Montant indicatif" value={formatFcfa(order?.indicativeTotalFcfa || order?.totalFcfa || 0)} />
            <Row label="Montant calculé" value={formatFcfa(order?.computedGradeTotalFcfa || order?.totalFcfa || 0)} />
            <Row label="Montant AS400" value={formatFcfa(order?.as400InvoiceTotalFcfa || order?.totalFcfa || 0)} />
            <Row label="Montant à payer" value={formatFcfa(order?.activePayment?.amountExpectedFcfa || order?.totalFcfa || 0)} />
            <Row label="Soumise le" value={formatDateTime(order?.submittedAt)} />
            <Row label="Facturée le" value={formatDateTime(order?.invoicedAt)} />
            {order?.billingAdjustmentReason ? (
              <Row label="Motif ajustement" value={order.billingAdjustmentReason} />
            ) : null}
          </div>
        </InfoCard>
      </div>

      <OrderItemsTable
        items={order?.items || []}
        totalFcfa={order?.as400InvoiceTotalFcfa || order?.totalFcfa || 0}
        canReplace={canReplaceBillingItems}
        replacementProducts={replacementProducts}
        replacingItemId={replacingItemId}
        saving={saving}
        onReplaceItem={onReplaceBillingItem}
      />
    </div>
  );
}
