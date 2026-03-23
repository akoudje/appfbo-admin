// src/components/orders/detail/OrderOverviewTab.jsx

import OrderTimeline from "./OrderTimeline";
import OrderSummaryCards from "./OrderSummaryCards";
import OrderItemsTable from "./OrderItemsTable";
import OrderStockCard from "./OrderStockCard";

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

function MovementBadge({ type }) {
  const config = {
    DEBIT: { label: "Débit", tone: "amber", icon: "⬇️" },
    CREDIT: { label: "Crédit", tone: "emerald", icon: "⬆️" },
  };

  const { label, tone, icon } = config[type] || config.DEBIT;

  const tones = {
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${tones[tone]}`}
    >
      <span>{icon}</span>
      {label}
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
  stockSummary,
  stockDebited,
  stockRestored,
}) {
  const status = order?.status;
  const isCancelled = status === "CANCELLED";
  const isPaid = status === "PAID";
  const isReady = status === "READY";
  const hasWhatsappMessage = Boolean(order?.whatsappMessage);
  const hasStockMovements =
    Array.isArray(order?.stockMovements) && order.stockMovements.length > 0;

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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <OrderItemsTable
            items={order?.items || []}
            totalFcfa={order?.totalFcfa || 0}
          />
        </div>

        <div className="space-y-6">
          <InfoCard title="🧾 Informations précommande">
            <div className="space-y-2">
              <Row
                label="N° précommande"
                value={order?.preorderNumber || "—"}
                copyable
              />
              <Row label="ID technique" value={order?.id || "—"} copyable />
              <Row label="Numéro FBO" value={order?.fboNumero || "—"} copyable />
              <Row label="Nom FBO" value={order?.fboNomComplet || "—"} />
              <Row label="Grade" value={humanizeEnum(order?.fboGrade)} />
              <Row
                label="Mode de paiement"
                value={humanizeEnum(order?.preorderPaymentMode || order?.paymentMode)}
              />
              <Row
                label="Mode de livraison"
                value={humanizeEnum(order?.deliveryMode)}
              />
              <Row
                label="Point de vente"
                value={order?.pointDeVente || "—"}
              />
            </div>
          </InfoCard>

          <OrderStockCard
            order={order}
            stockSummary={stockSummary}
            stockDebited={stockDebited}
            stockRestored={stockRestored}
          />

          <InfoCard title="💬 Message WhatsApp">
            {hasWhatsappMessage ? (
              <div className="space-y-3">
                <div className="text-xs text-gray-600 whitespace-pre-wrap border rounded-lg p-3 bg-gray-50 max-h-64 overflow-auto font-mono text-sm">
                  {order.whatsappMessage}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                  Message stocké dans la commande
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                <span className="block text-2xl mb-2">📭</span>
                Aucun message WhatsApp généré
              </div>
            )}
          </InfoCard>

          <InfoCard title="💰 Paiement & Facture">
            <div className="space-y-2">
              <Row label="Référence facture" value={order?.factureReference} copyable />
              <Row
                label="Mode de paiement précommande"
                value={humanizeEnum(order?.preorderPaymentMode || order?.paymentMode)}
              />
              <Row
                label="Provider paiement"
                value={humanizeEnum(order?.paymentProvider)}
              />
              <Row label="Référence paiement" value={order?.paymentRef} copyable />
              <Row
                label="Lien de paiement"
                value={
                  order?.paymentLink ? (
                    <a
                      className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                      href={order.paymentLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🔗 Ouvrir
                    </a>
                  ) : "—"
                }
              />
              <Row
                label="WhatsApp destinataire"
                value={order?.factureWhatsappTo}
                copyable
              />
            </div>

            {order?.paidAt && (
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span>✅ Paiement confirmé le</span>
                  <span className="font-medium text-gray-700">
                    {formatDateTime(order.paidAt)}
                  </span>
                </span>
              </div>
            )}
          </InfoCard>

          {order?.notes && (
            <InfoCard title="📝 Note client">
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {order.notes}
              </div>
            </InfoCard>
          )}
        </div>
      </div>

      {hasStockMovements && (
        <InfoCard title="📊 Mouvements de stock">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="text-sm text-gray-500">
              Historique des mouvements liés à cette commande
            </div>
            <div className="text-sm font-medium bg-gray-100 px-3 py-1 rounded-full">
              Débit: {stockSummary?.debitQty || 0} • Crédit: {stockSummary?.creditQty || 0}
            </div>
          </div>

          <div className="space-y-3">
            {order.stockMovements.map((movement) => (
              <div
                key={movement.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MovementBadge type={movement.type} />
                      <span className="font-medium text-gray-900">
                        {movement.product?.sku || "—"}
                      </span>
                      <span className="text-sm text-gray-600">
                        {movement.product?.nom || "Produit inconnu"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantité :</span>{" "}
                        <span className="font-medium">{movement.qty}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Raison :</span>{" "}
                        <span className="font-medium">{movement.reason}</span>
                      </div>
                    </div>

                    {movement.note && (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded border border-gray-100">
                        <span className="text-xs text-gray-400 block mb-1">Note :</span>
                        {movement.note}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 whitespace-nowrap">
                    {formatDateTime(movement.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </InfoCard>
      )}
    </div>
  );
}