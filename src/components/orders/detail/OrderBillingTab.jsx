// src/components/orders/detail/OrderBillingTab.jsx

// ============================================================================
// Sous-composants
// ============================================================================

function Field({ label, children, optional = false }) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </span>
        {optional && (
          <span className="text-xs text-gray-400">(optionnel)</span>
        )}
      </div>
      {children}
    </label>
  );
}

function Alert({ tone = "blue", title, children }) {
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
    <div className={`rounded-lg border p-4 ${tones[tone] || tones.blue}`}>
      <div className="flex gap-3">
        <span className="text-lg" role="img" aria-hidden="true">
          {icons[tone] || icons.blue}
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

function Row({ label, value, highlight = false, copyable = false }) {
  const handleCopy = () => {
    if (value && value !== "—") {
      navigator.clipboard?.writeText(value.toString());
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0">
      <div className="text-gray-500">{label}</div>
      <div className={`font-medium text-right flex items-center gap-2 ${highlight ? 'text-indigo-600' : ''}`}>
        <span className="break-all">{value ?? "—"}</span>
        {copyable && value && value !== "—" && (
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Copier"
          >
                            📋
          </button>
        )}
      </div>
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
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        tones[tone]
      }`}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
}

function StatCard({ label, value, subvalue, tone = "gray", icon }) {
  const tones = {
    gray: "bg-gray-50 border-gray-200",
    amber: "bg-amber-50 border-amber-200",
    emerald: "bg-emerald-50 border-emerald-200",
    blue: "bg-blue-50 border-blue-200",
    red: "bg-red-50 border-red-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
        {icon && <span>{icon}</span>}
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {subvalue && <div className="text-xs text-gray-500 mt-1">{subvalue}</div>}
    </div>
  );
}

function InfoSection({ title, children, className = "" }) {
  return (
    <div className={`card p-6 space-y-4 ${className}`}>
      <h4 className="font-semibold text-gray-900">{title}</h4>
      {children}
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

// ============================================================================
// Composant principal
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
}) {
  // États dérivés
  const status = order?.status;
  const isSubmitted = status === "SUBMITTED";
  const hasInvoice = ["INVOICED", "PAYMENT_PROOF_RECEIVED", "PAID", "READY", "FULFILLED"].includes(status);
  const resolvedPaymentLink = paymentLink || order?.paymentLink || "";
  const resolvedWhatsappStatus = billingMessage?.status || order?.lastWhatsappStatus || null;
  const hasWhatsappMessage = Boolean(order?.whatsappMessage);
  const hasBillingInfo = Boolean(order?.factureReference || order?.factureWhatsappTo || order?.paymentLink);

  // Rendu conditionnel des alertes
  const renderPaymentAlert = () => {
    if (isCash) {
      return (
        <Alert tone="amber" title="💵 Paiement espèces">
          <p>Cette commande est en paiement <strong>espèces</strong>.</p>
          <p className="mt-1">Aucun lien de paiement ne sera généré. Le message WhatsApp invitera le client à se présenter au bureau.</p>
        </Alert>
      );
    }

    if (isAutoPayment && hasInvoice) {
      return (
        <Alert tone="blue" title="🔗 Paiement en ligne automatique">
          <p>Un lien <strong>PayDunya</strong> sera généré automatiquement à la facturation.</p>
          <p className="mt-1">Le message WhatsApp contiendra ce lien de paiement.</p>
        </Alert>
      );
    }

    if (!isCash && !isAutoPayment) {
      return (
        <Alert tone="gray" title="📎 Mode manuel">
          <p>Cette commande n'utilise pas de lien de paiement automatique.</p>
          <p className="mt-1">Le paiement sera traité manuellement après réception d'une preuve.</p>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec stats */}
      <InfoSection title="Facturation">
        <p className="text-sm text-gray-600">
          Génération de la préfacture, envoi WhatsApp et gestion du lien de paiement.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Statut"
            value={status}
            subvalue={isSubmitted ? "En attente de facturation" : "Facturé"}
            tone={hasInvoice ? "emerald" : "gray"}
            icon={hasInvoice ? "✅" : "⏳"}
          />
          <StatCard
            label="Montant"
            value={formatFcfa(order?.totalFcfa)}
            subvalue="Total TTC"
            tone="blue"
            icon="💰"
          />
          <StatCard
            label="Mode de paiement"
            value={order?.paymentMode || "—"}
            subvalue={isCash ? "Espèces" : isAutoPayment ? "Auto" : "Manuel"}
            tone={isCash ? "amber" : "gray"}
            icon={isCash ? "💵" : "💳"}
          />
          <StatCard
            label="Référence"
            value={order?.factureReference || "—"}
            subvalue={hasInvoice ? "Facture générée" : "Préfacture"}
            tone={hasInvoice ? "emerald" : "gray"}
            icon="📄"
          />
        </div>
      </InfoSection>

      {/* Alertes contextuelles */}
      {renderPaymentAlert()}

      {/* Formulaire de facturation */}
      <InfoSection title="📋 Générer la préfacture">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Référence préfacture" optional>
            <input
              className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="Ex: PF-2026-00012"
              disabled={!canInvoice || saving}
            />
          </Field>

          <Field label="WhatsApp destinataire" optional>
            <input
              className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
              value={invoiceWaTo}
              onChange={(e) => setInvoiceWaTo(e.target.value)}
              placeholder="Ex: +225 01 23 45 67"
              disabled={!canInvoice || saving}
            />
          </Field>
        </div>

        <Field 
          label={isCash ? "Lien de paiement (non applicable)" : "Lien de paiement"}
          optional={isCash}
        >
          <input
            className="input w-full rounded-lg border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
            value={resolvedPaymentLink || (isCash ? "Pas de lien pour les espèces" : "Généré automatiquement")}
            onChange={(e) => setPaymentLink?.(e.target.value)}
            disabled
          />
        </Field>

        <Field label="Note de facturation" optional>
          <textarea
            className="input w-full min-h-[100px] rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
            value={invoiceNote}
            onChange={(e) => setInvoiceNote(e.target.value)}
            placeholder={
              isCash
                ? "Préfacture prête. Paiement à effectuer au bureau."
                : "Préfacture prête avec lien de paiement."
            }
            disabled={!canInvoice || saving}
          />
        </Field>

        <div className="flex items-center gap-4 pt-2">
          <button
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              !canInvoice || saving
                ? "opacity-50 cursor-not-allowed bg-gray-400"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow"
            }`}
            onClick={onInvoice}
            disabled={!canInvoice || saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⚪</span>
                Facturation en cours...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                🚀 Facturer et envoyer ===xxxx===
              </span>
            )}
          </button>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span className={`inline-block w-2 h-2 rounded-full ${canInvoice ? 'bg-green-400' : 'bg-gray-400'}`} />
            {canInvoice ? "Prêt à facturer" : "Statut SUBMITTED requis"}
          </div>
        </div>
      </InfoSection>

      {/* Message WhatsApp */}
      <InfoSection title="💬 Message WhatsApp">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          {hasWhatsappMessage ? (
            <div className="space-y-2">
              <div className="text-xs text-gray-500 uppercase tracking-wide">
                Message envoyé au client
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-3 rounded-lg border border-gray-100">
                {order.whatsappMessage}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">
              Aucun message WhatsApp généré pour le moment.
            </div>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <button
            className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={onCopyWhatsApp}
            disabled={!hasWhatsappMessage}
          >
            📋 Copier le message
          </button>

          {order?.paymentLink && (
            <a
              className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              href={order.paymentLink}
              target="_blank"
              rel="noreferrer"
            >
              🔗 Ouvrir le lien de paiement
            </a>
          )}
        </div>
      </InfoSection>

      {/* Suivi WhatsApp */}
      <InfoSection title="📊 Suivi WhatsApp">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="text-xs text-gray-500">Canal</div>
            <div className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <span className="font-medium">WhatsApp Business</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Destinataire</div>
            <div className="font-medium">
              {billingMessage?.toPhone || order?.factureWhatsappTo || "—"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Type de message</div>
            <div className="font-medium">{billingMessage?.purpose || "Facturation"}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Statut</div>
            <WhatsAppStatusBadge status={resolvedWhatsappStatus} />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Dernière mise à jour</div>
            <div className="font-medium">
              {formatDateTime(billingMessage?.lastStatusAt || order?.lastWhatsappStatusAt)}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Envoyé le</div>
            <div className="font-medium">{formatDateTime(billingMessage?.sentAt)}</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Lien cliqué</div>
            <div className="font-medium flex items-center gap-2">
              {order?.paymentLinkClickedAt ? (
                <>
                  <span className="text-emerald-600">✅ Oui</span>
                  <span className="text-xs text-gray-400">
                    ({formatDateTime(order.paymentLinkClickedAt)})
                  </span>
                </>
              ) : "Non"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Nombre de clics</div>
            <div className="font-medium">{order?.paymentLinkClickCount || 0}</div>
          </div>
        </div>

        {billingMessage?.errorMessage && (
          <Alert tone="red" title="❌ Erreur d'envoi">
            {billingMessage.errorMessage}
          </Alert>
        )}

        {typeof onResendWhatsApp === "function" && (
          <div className="pt-2">
            <button
              className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              onClick={onResendWhatsApp}
              disabled={!billingMessage?.id || saving}
            >
              🔄 Renvoyer le message
            </button>
          </div>
        )}
      </InfoSection>

      {/* Informations enregistrées */}
      {hasBillingInfo && (
        <InfoSection title="📌 Informations de facturation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row 
              label="Référence facture" 
              value={order?.factureReference} 
              copyable
            />
            <Row 
              label="WhatsApp destinataire" 
              value={order?.factureWhatsappTo}
              copyable
            />
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
              label="Référence paiement" 
              value={order?.paymentRef}
              copyable
            />
          </div>

          {order?.invoicedAt && (
            <div className="mt-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
              <span className="flex items-center gap-1">
                <span>📅 Facturée le</span>
                <span className="font-medium text-gray-700">
                  {formatDateTime(order.invoicedAt)}
                </span>
                {order?.invoicedBy && (
                  <>
                    <span>par</span>
                    <span className="font-medium text-gray-700">
                      {order.invoicedBy}
                    </span>
                  </>
                )}
              </span>
            </div>
          )}
        </InfoSection>
      )}
    </div>
  );
}