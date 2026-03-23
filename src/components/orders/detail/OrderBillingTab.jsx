import React from "react";

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
          {title && <div className="font-semibold text-sm mb-1">{title}</div>}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight = false, copyable = false }) {
  const handleCopy = async () => {
    if (!value || value === "—") return;
    if (typeof value !== "string") return;

    try {
      await navigator.clipboard?.writeText(value);
    } catch {
      // noop
    }
  };

  const isReactNode =
    typeof value === "object" && value !== null && !Array.isArray(value);

  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0">
      <div className="text-gray-500">{label}</div>
      <div
        className={`font-medium text-right flex items-center gap-2 ${
          highlight ? "text-indigo-600" : ""
        }`}
      >
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

function PaymentStatusBadge({ status }) {
  const value = String(status || "").toUpperCase();

  const config = {
    PENDING_CUSTOMER_ACTION: {
      label: "En attente client",
      cls: "bg-amber-100 text-amber-700 border-amber-200",
    },
    PAYMENT_PENDING: {
      label: "Paiement en attente",
      cls: "bg-amber-100 text-amber-700 border-amber-200",
    },
    PROCESSING: {
      label: "En cours",
      cls: "bg-blue-100 text-blue-700 border-blue-200",
    },
    SUCCEEDED: {
      label: "Payé",
      cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    PAID: {
      label: "Payé",
      cls: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    EXPIRED: {
      label: "Expiré",
      cls: "bg-orange-100 text-orange-700 border-orange-200",
    },
    CANCELLED: {
      label: "Annulé",
      cls: "bg-red-100 text-red-700 border-red-200",
    },
    FAILED: {
      label: "Échec",
      cls: "bg-red-100 text-red-700 border-red-200",
    },
  };

  const item = config[value] || {
    label: status || "—",
    cls: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${item.cls}`}
    >
      {item.label}
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

function getLatestAttempt(order) {
  const attempts = order?.activePayment?.attempts;
  if (Array.isArray(attempts) && attempts.length > 0) return attempts[0];
  return null;
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

  // ✅ props Wave
  onInitiateWave,
  onRefreshWaveStatus,
  onSimulateWave,
  waveLoading = false,
  showWaveDevTools = false,
}) {
  const status = order?.status;
  const latestAttempt = getLatestAttempt(order);
  const payment = order?.activePayment || null;

  const hasInvoice = [
    "INVOICED",
    "PAYMENT_PROOF_RECEIVED",
    "PAID",
    "READY",
    "FULFILLED",
    "PAYMENT_PENDING",
  ].includes(status);

  const paymentStatus = payment?.status || order?.paymentStatus || null;
  const paymentProvider = payment?.provider || order?.paymentProvider || null;
  const paymentSessionId =
    latestAttempt?.providerSessionId || payment?.providerReference || "—";
  const paymentTxnId =
    payment?.providerTxnId || latestAttempt?.providerTransactionId || "—";

  const resolvedPaymentLink =
    paymentLink ||
    latestAttempt?.providerLaunchUrl ||
    latestAttempt?.checkoutUrl ||
    order?.paymentLink ||
    "";

  const resolvedWhatsappStatus =
    billingMessage?.status || order?.lastWhatsappStatus || null;

  const hasWhatsappMessage = Boolean(order?.whatsappMessage);
  const hasBillingInfo = Boolean(
    order?.factureReference ||
      order?.factureWhatsappTo ||
      resolvedPaymentLink ||
      paymentSessionId !== "—" ||
      paymentTxnId !== "—"
  );

  const canUseWave = !isCash && isAutoPayment;

  const normalizedPaymentStatus = String(paymentStatus || "").toUpperCase();
  const isPaymentPending = [
    "PAYMENT_PENDING",
    "PENDING_CUSTOMER_ACTION",
    "PROCESSING",
  ].includes(normalizedPaymentStatus);

  const isPaymentSucceeded = ["SUCCEEDED", "PAID"].includes(
    normalizedPaymentStatus
  );

  const isPaymentExpired = normalizedPaymentStatus === "EXPIRED";
  const isPaymentCancelled = normalizedPaymentStatus === "CANCELLED";
  const isPaymentFailed = normalizedPaymentStatus === "FAILED";

  const renderPaymentAlert = () => {
    if (isCash) {
      return (
        <Alert tone="amber" title="Paiement espèces">
          <p>
            Cette commande est en paiement <strong>espèces</strong>.
          </p>
          <p className="mt-1">
            Aucun lien de paiement ne sera généré. Le message WhatsApp invitera
            le client à se présenter au bureau.
          </p>
        </Alert>
      );
    }

    if (canUseWave) {
      return (
        <Alert tone="blue" title="Paiement Wave / Mobile Money">
          <p>
            Cette commande utilise un <strong>checkout Wave</strong>.
          </p>
          <p className="mt-1">
            Après facturation, vous pouvez initier le lien de paiement, l’envoyer
            au client puis synchroniser le statut si nécessaire.
          </p>
        </Alert>
      );
    }

    return (
      <Alert tone="gray" title="Paiement manuel">
        <p>
          Cette commande n’utilise pas de lien de paiement automatique.
        </p>
        <p className="mt-1">
          Le paiement sera traité manuellement après réception d’une preuve.
        </p>
      </Alert>
    );
  };

  return (
    <div className="space-y-6">
      <InfoSection title="Facturation">
        <p className="text-sm text-gray-600">
          Génération de la préfacture, envoi WhatsApp et gestion du lien de
          paiement.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Statut commande"
            value={status || "—"}
            subvalue={hasInvoice ? "Facturée / en suivi" : "En attente de facturation"}
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
            value={
              order?.preorderPaymentMode ||
              order?.paymentMode ||
              paymentProvider ||
              "—"
            }
            subvalue={isCash ? "Espèces" : canUseWave ? "Wave" : "Manuel"}
            tone={isCash ? "amber" : canUseWave ? "blue" : "gray"}
            icon={isCash ? "💵" : "💳"}
          />
          <StatCard
            label="Référence facture"
            value={order?.factureReference || "—"}
            subvalue={hasInvoice ? "Préfacture générée" : "À générer"}
            tone={hasInvoice ? "emerald" : "gray"}
            icon="📄"
          />
        </div>
      </InfoSection>

      {renderPaymentAlert()}

      <InfoSection title="Générer la préfacture">
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
            value={
              resolvedPaymentLink ||
              (isCash
                ? "Pas de lien pour les espèces"
                : "Généré après initiation du paiement")
            }
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
                : "Préfacture prête. Le client recevra un lien de paiement Wave."
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
            type="button"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⚪</span>
                Traitement en cours...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                {isCash
                  ? "💵 Facturer et envoyer"
                  : "💳 Facturer + initier paiement + envoyer"}
              </span>
            )}
          </button>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                canInvoice ? "bg-green-400" : "bg-gray-400"
              }`}
            />
            {canInvoice ? "Prêt à facturer" : "Statut SUBMITTED requis"}
          </div>
        </div>
      </InfoSection>

      <InfoSection title="Paiement Wave">
        {!canUseWave ? (
          <Alert tone="gray" title="Paiement non concerné">
            Cette commande n’utilise pas le paiement Wave. Aucun lien de paiement
            ne sera généré.
          </Alert>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Row label="Provider" value={paymentProvider || "WAVE"} />
              <Row
                label="Statut paiement"
                value={<PaymentStatusBadge status={paymentStatus} />}
              />
              <Row
                label="Session Wave"
                value={paymentSessionId}
                copyable={paymentSessionId !== "—"}
              />
              <Row
                label="Transaction Wave"
                value={paymentTxnId}
                copyable={paymentTxnId !== "—"}
              />
              <Row
                label="Lien de paiement"
                value={
                  resolvedPaymentLink ? (
                    <a
                      href={resolvedPaymentLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                    >
                      🔗 Ouvrir le lien
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Dernière synchronisation utile"
                value={formatDateTime(
                  payment?.updatedAt ||
                    latestAttempt?.updatedAt ||
                    order?.billingLastActivityAt
                )}
              />
              <Row
                label="Payé le"
                value={formatDateTime(payment?.paidAt || order?.paidAt)}
                highlight={isPaymentSucceeded}
              />
              <Row
                label="Montant payé"
                value={formatFcfa(payment?.amountPaidFcfa || 0)}
                highlight={isPaymentSucceeded}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={onInitiateWave}
                disabled={!canUseWave || saving || waveLoading}
                type="button"
              >
                💳 {resolvedPaymentLink ? "Réinitier le paiement" : "Initier le paiement"}
              </button>

              <button
                className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
                onClick={onRefreshWaveStatus}
                disabled={!canUseWave || saving || waveLoading || paymentSessionId === "—"}
                type="button"
              >
                🔄 Vérifier / synchroniser
              </button>

              {resolvedPaymentLink && (
                <>
                  <button
                    className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    onClick={() => navigator.clipboard?.writeText(resolvedPaymentLink)}
                    type="button"
                  >
                    📋 Copier le lien
                  </button>

                  <a
                    className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    href={resolvedPaymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🔗 Ouvrir le lien
                  </a>
                </>
              )}
            </div>

            {showWaveDevTools && typeof onSimulateWave === "function" && (
              <div className="pt-3 border-t border-dashed border-gray-200">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-3">
                  Dev tools Wave
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
                    onClick={() => onSimulateWave("processing")}
                    disabled={waveLoading || saving}
                    type="button"
                  >
                    Simuler processing
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    onClick={() => onSimulateWave("succeeded")}
                    disabled={waveLoading || saving}
                    type="button"
                  >
                    Simuler succeeded
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100"
                    onClick={() => onSimulateWave("expired")}
                    disabled={waveLoading || saving}
                    type="button"
                  >
                    Simuler expired
                  </button>
                  <button
                    className="px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                    onClick={() => onSimulateWave("cancelled")}
                    disabled={waveLoading || saving}
                    type="button"
                  >
                    Simuler cancelled
                  </button>
                </div>
              </div>
            )}

            {isPaymentPending && (
              <Alert tone="blue" title="Paiement en attente">
                Le lien a été initié. Le client doit encore finaliser le paiement.
              </Alert>
            )}

            {isPaymentSucceeded && (
              <Alert tone="emerald" title="Paiement confirmé">
                Le paiement a été validé avec succès. La commande peut poursuivre
                son workflow.
              </Alert>
            )}

            {isPaymentExpired && (
              <Alert tone="amber" title="Lien expiré">
                Le lien Wave a expiré. Vous pouvez réinitier un nouveau paiement
                puis renvoyer le message WhatsApp.
              </Alert>
            )}

            {isPaymentCancelled && (
              <Alert tone="red" title="Paiement annulé">
                Le client a annulé le paiement. Vous pouvez réinitier un nouveau
                lien si nécessaire.
              </Alert>
            )}

            {isPaymentFailed && (
              <Alert tone="red" title="Paiement échoué">
                Le paiement Wave a échoué. Vérifiez le détail puis réinitiez une
                nouvelle session si nécessaire.
              </Alert>
            )}
          </div>
        )}
      </InfoSection>

      <InfoSection title="Message WhatsApp">
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
            type="button"
          >
            📋 Copier le message
          </button>

          {resolvedPaymentLink && (
            <a
              className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              href={resolvedPaymentLink}
              target="_blank"
              rel="noreferrer"
            >
              🔗 Ouvrir le lien de paiement
            </a>
          )}
        </div>
      </InfoSection>

      <InfoSection title="Suivi WhatsApp">
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
            <div className="font-medium">
              {billingMessage?.purpose || "Facturation"}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Statut</div>
            <WhatsAppStatusBadge status={resolvedWhatsappStatus} />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Dernière mise à jour</div>
            <div className="font-medium">
              {formatDateTime(
                billingMessage?.lastStatusAt || order?.lastWhatsappStatusAt
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Envoyé le</div>
            <div className="font-medium">
              {formatDateTime(billingMessage?.sentAt)}
            </div>
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
              ) : (
                "Non"
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-gray-500">Nombre de clics</div>
            <div className="font-medium">{order?.paymentLinkClickCount || 0}</div>
          </div>
        </div>

        {billingMessage?.errorMessage && (
          <Alert tone="red" title="Erreur d'envoi">
            {billingMessage.errorMessage}
          </Alert>
        )}

        {typeof onResendWhatsApp === "function" && (
          <div className="pt-2">
            <button
              className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              onClick={onResendWhatsApp}
              disabled={!billingMessage?.id || saving}
              type="button"
            >
              🔄 Renvoyer le message
            </button>
          </div>
        )}
      </InfoSection>

      {hasBillingInfo && (
        <InfoSection title="Informations de facturation">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row label="Référence facture" value={order?.factureReference} copyable />
            <Row
              label="WhatsApp destinataire"
              value={order?.factureWhatsappTo}
              copyable
            />
            <Row
              label="Session Wave"
              value={paymentSessionId}
              copyable={paymentSessionId !== "—"}
            />
            <Row
              label="Transaction Wave"
              value={paymentTxnId}
              copyable={paymentTxnId !== "—"}
            />
            <Row
              label="Lien de paiement"
              value={
                resolvedPaymentLink ? (
                  <a
                    className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                    href={resolvedPaymentLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🔗 Ouvrir
                  </a>
                ) : (
                  "—"
                )
              }
            />
            <Row
              label="Payé le"
              value={formatDateTime(payment?.paidAt || order?.paidAt)}
            />
          </div>

          {order?.invoicedAt && (
            <div className="mt-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
              <span className="flex items-center gap-1 flex-wrap">
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