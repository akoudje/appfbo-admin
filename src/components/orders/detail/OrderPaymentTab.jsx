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
    <div className={`rounded-lg border p-3 ${tones[tone] || tones.blue} ${className}`}>
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
    try {
      await navigator.clipboard?.writeText(String(value));
    } catch {
      // noop
    }
  };

  const isReactNode = typeof value === "object" && value !== null && !Array.isArray(value);

  return (
    <div className={`flex items-center justify-between gap-2 text-sm py-1 border-b border-gray-100 last:border-0 ${className}`}>
      <div className="text-gray-500 text-xs uppercase tracking-wide">{label}</div>
      <div className={`font-medium text-right flex items-center gap-1.5 ${highlight ? "text-indigo-600" : ""}`}>
        {isReactNode ? value : <span className="break-all">{value ?? "—"}</span>}
        {copyable && !isReactNode && value && value !== "—" && (
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
        className={`
          w-6 h-6 rounded-full flex items-center justify-center font-medium text-xs
          ${
            completed
              ? "bg-emerald-100 text-emerald-700"
              : active
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-500"
          }
        `}
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

function PaymentMethodBadge({ isCash, isWave, isAutoPayment }) {
  const config = {
    cash: { label: "Espèces", tone: "amber", icon: "💵" },
    wave: { label: "Wave", tone: "blue", icon: "🌊" },
    auto: { label: "Auto", tone: "blue", icon: "🔗" },
    manual: { label: "Manuel", tone: "gray", icon: "📎" },
  };

  let type = "manual";
  if (isCash) type = "cash";
  else if (isWave) type = "wave";
  else if (isAutoPayment) type = "auto";

  const { label, tone, icon } = config[type];
  const tones = {
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${tones[tone]}`}>
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
    return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function getLatestAttempt(order) {
  const attempts = order?.activePayment?.attempts;
  if (Array.isArray(attempts) && attempts.length > 0) return attempts[0];
  return null;
}

function getPaymentDisplayStatus(order) {
  return order?.activePayment?.status || order?.paymentStatus || order?.status || "—";
}

// ============================================================================
// Composant principal optimisé
// ============================================================================

export default function OrderPaymentTab({
  order,
  saving,
  isCash,
  isAutoPayment,
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
  onInitiateWave,
  onSyncWave,
  reload,
}) {
  const status = order?.status;
  const isPaid = status === "PAID";
  const isInvoiced = status === "INVOICED";
  const isPaymentPendingStatus = status === "PAYMENT_PENDING";
  
  const isWave = order?.paymentProvider === "WAVE" || order?.preorderPaymentMode === "WAVE" || order?.paymentMode === "WAVE";

  const activePayment = order?.activePayment || null;
  const latestAttempt = getLatestAttempt(order);

  const paymentStatus = String(activePayment?.status || order?.paymentStatus || "").toUpperCase();

  const waveCheckoutUrl = latestAttempt?.providerLaunchUrl || latestAttempt?.checkoutUrl || order?.paymentLink || "—";
  const waveSessionId = latestAttempt?.providerSessionId || activePayment?.providerReference || order?.paymentRef || "—";
  const waveTransactionId = activePayment?.providerTxnId || latestAttempt?.providerTransactionId || order?.paymentRef || "—";

  const canInitiateWave = ["INVOICED", "PAYMENT_PENDING"].includes(status) && !saving;

  const step1Completed = status === "PAYMENT_PENDING" || isPaid;
  const step2Completed = isPaid;

  // Déterminer le type de flux
  const isCashFlow = isCash;
  const isWaveFlow = !isCash && (isWave || isAutoPayment);
  const isManualFlow = !isCash && !isWave && !isAutoPayment;

  // Message de statut global
  const getStatusMessage = () => {
    if (isPaid) return { tone: "emerald", text: "Paiement confirmé - commande prête" };
    if (isCashFlow) return { tone: "amber", text: "Paiement espèces - à encaisser au bureau" };
    if (isWaveFlow && paymentStatus === "PROCESSING") return { tone: "blue", text: "Paiement Wave en cours - le client doit finaliser" };
    if (isWaveFlow && paymentStatus === "PENDING_CUSTOMER_ACTION") return { tone: "blue", text: "En attente d'action client" };
    if (isManualFlow && step1Completed && !step2Completed) return { tone: "amber", text: "Preuve reçue - à valider" };
    if (isManualFlow && !step1Completed && isInvoiced) return { tone: "blue", text: "En attente de preuve de paiement" };
    return null;
  };

  const statusMessage = getStatusMessage();

  // Rendu des cartes de statut communes
  const renderStatCards = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label="Mode"
        value={<PaymentMethodBadge isCash={isCash} isWave={isWave} isAutoPayment={isAutoPayment} />}
        subvalue={order?.preorderPaymentMode || order?.paymentMode || order?.paymentProvider || "—"}
        tone={isCash ? "amber" : isWave || isAutoPayment ? "blue" : "gray"}
      />
      <StatCard
        label="Statut"
        value={status || "—"}
        subvalue={isPaid ? "Payé" : "En attente"}
        tone={isPaid ? "emerald" : "gray"}
        icon={isPaid ? "✅" : "⏳"}
      />
      <StatCard
        label="Référence"
        value={waveTransactionId !== "—" ? waveTransactionId.substring(0, 12) + "..." : waveSessionId.substring(0, 12) + "..."}
        subvalue="Transaction / session"
        tone="blue"
        icon="🔢"
      />
      <StatCard
        label="Date"
        value={formatDateTime(order?.paidAt) || "—"}
        subvalue="paiement"
        tone="gray"
        icon="📅"
      />
    </div>
  );

  // Rendu du contenu principal selon le flux
  const renderMainContent = () => {
    // Flux Espèces
    if (isCashFlow) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Colonne gauche: Alerte + Action */}
          <CompactInfoCard title="💵 Paiement espèces">
            <Alert tone="amber" className="mb-4 p-2 text-xs">
              Paiement manuel au bureau. L'admin encaisse et valide.
            </Alert>
            <Field label="Note d'encaissement" optional>
              <textarea
                className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 text-sm min-h-[80px]"
                value={cashNote}
                onChange={(e) => setCashNote(e.target.value)}
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

          {/* Colonne droite: Traçabilité */}
          {(order?.paymentVerifiedBy || order?.paidAt) && (
            <CompactInfoCard title="📋 Traçabilité">
              <Row label="Validé par" value={order?.paymentVerifiedBy} />
              <Row label="Validé le" value={formatDateTime(order?.paidAt)} />
            </CompactInfoCard>
          )}
        </div>
      );
    }

    // Flux Wave
    if (isWaveFlow) {
      return (
        <div className="space-y-4">
          {/* Ligne 1: Stats Wave */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Statut Wave" value={<PaymentStatusBadge status={paymentStatus} />} subvalue="Paiement" tone={isPaid ? "emerald" : "blue"} />
            <StatCard label="Montant" value={formatFcfa(order?.totalFcfa)} subvalue="Attendu" tone="gray" />
            <StatCard label="Payé" value={formatFcfa(activePayment?.amountPaidFcfa || 0)} subvalue="Confirmé" tone={isPaid ? "emerald" : "gray"} />
            <StatCard label="Session" value={waveSessionId.substring(0, 12) + "..."} subvalue="ID" tone="blue" />
          </div>

          {/* Ligne 2: Infos Wave + Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompactInfoCard title="🔗 Détails Wave">
              <Row label="Session ID" value={waveSessionId} copyable />
              <Row label="Transaction ID" value={waveTransactionId} copyable />
              <Row label="Lien de paiement" value={
                waveCheckoutUrl && waveCheckoutUrl !== "—" ? (
                  <a href={waveCheckoutUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 text-sm">🔗 Ouvrir</a>
                ) : "—"
              } />
              <Row label="Dernière synchro" value={formatDateTime(activePayment?.updatedAt || latestAttempt?.updatedAt)} />
            </CompactInfoCard>

            <CompactInfoCard title="⚡ Actions Wave">
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-4 py-1.5 rounded-lg font-medium text-sm transition-all ${
                    !canInitiateWave ? "opacity-50 cursor-not-allowed bg-gray-400 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                  }`}
                  onClick={onInitiateWave}
                  disabled={!canInitiateWave}
                  type="button"
                >
                  {saving ? "..." : "💰 Initier / réinitier"}
                </button>
                <button
                  className="px-4 py-1.5 rounded-lg font-medium text-sm border border-gray-200 hover:bg-gray-50"
                  onClick={onSyncWave}
                  disabled={saving || !isWave}
                  type="button"
                >
                  🔄 Synchroniser
                </button>
                {waveCheckoutUrl && waveCheckoutUrl !== "—" && (
                  <a href={waveCheckoutUrl} target="_blank" rel="noreferrer" className="px-4 py-1.5 rounded-lg font-medium text-sm border border-blue-200 bg-blue-50 text-blue-700">
                    🔗 Wave
                  </a>
                )}
                <button
                  className="px-4 py-1.5 rounded-lg font-medium text-sm border border-gray-200 hover:bg-gray-50"
                  onClick={reload}
                  disabled={saving}
                  type="button"
                >
                  🔄 Rafraîchir
                </button>
              </div>
              <div className={`mt-3 p-2 rounded-lg text-xs ${isPaid ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"}`}>
                {isPaid ? "✅ Paiement confirmé" : "⏳ En attente de paiement"}
              </div>
            </CompactInfoCard>
          </div>

          {/* Ligne 3: Détails additionnels (si disponibles) */}
          {(activePayment || latestAttempt) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activePayment && (
                <CompactInfoCard title="💳 Détails paiement">
                  <div className="grid grid-cols-2 gap-1">
                    <Row label="Provider" value={activePayment.provider} />
                    <Row label="Status" value={<PaymentStatusBadge status={activePayment.status} />} />
                    <Row label="Montant attendu" value={formatFcfa(activePayment.amountExpectedFcfa)} />
                    <Row label="Payé" value={formatFcfa(activePayment.amountPaidFcfa)} highlight={activePayment.amountPaidFcfa > 0} />
                    <Row label="Payé le" value={formatDateTime(activePayment.paidAt)} />
                    <Row label="Client ref" value={activePayment.clientReference} copyable />
                  </div>
                </CompactInfoCard>
              )}
              {latestAttempt && (
                <CompactInfoCard title="🔄 Dernière tentative">
                  <div className="grid grid-cols-2 gap-1">
                    <Row label="Status" value={<PaymentStatusBadge status={latestAttempt.status} />} />
                    <Row label="Créée le" value={formatDateTime(latestAttempt.createdAt)} />
                    <Row label="Terminée le" value={formatDateTime(latestAttempt.completedAt)} />
                  </div>
                </CompactInfoCard>
              )}
            </div>
          )}
        </div>
      );
    }

    // Flux Manuel avec preuve
    if (isManualFlow) {
      return (
        <div className="space-y-4">
          {/* Étapes */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            <StepIndicator number={1} title="Preuve" active={!step1Completed && isInvoiced} completed={step1Completed} />
            <StepIndicator number={2} title="Validation" active={step1Completed && !step2Completed} completed={step2Completed} />
          </div>

          {/* Étape 1 - Preuve */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompactInfoCard title="📸 Étape 1 - Preuve de paiement">
              <Field label="URL preuve" optional>
                <input
                  className="input w-full rounded-lg border-gray-200 text-sm"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  disabled={!canProof || saving || step1Completed}
                  placeholder="https://..."
                />
              </Field>
              <Field label="Référence transaction" optional className="mt-2">
                <input
                  className="input w-full rounded-lg border-gray-200 text-sm"
                  value={proofRef}
                  onChange={(e) => setProofRef(e.target.value)}
                  disabled={!canProof || saving || step1Completed}
                  placeholder="WAVE-XXXX / OM-XXXX"
                />
              </Field>
              <Field label="Note" optional className="mt-2">
                <textarea
                  className="input w-full rounded-lg border-gray-200 text-sm min-h-[70px]"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  disabled={!canProof || saving || step1Completed}
                  placeholder="Capture reçue par WhatsApp..."
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

            {/* Étape 2 - Validation */}
            <CompactInfoCard title="✅ Étape 2 - Validation finale">
              <Field label="Note de validation" optional>
                <input
                  className="input w-full rounded-lg border-gray-200 text-sm"
                  value={verifyNote}
                  onChange={(e) => setVerifyNote(e.target.value)}
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

          {/* Preuve enregistrée existante */}
          {(order?.manualPaymentProofUrl || order?.paymentProofUrl || order?.manualPaymentReference) && (
            <CompactInfoCard title="📋 Preuve enregistrée">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Row label="URL" value={
                  (order?.manualPaymentProofUrl || order?.paymentProofUrl) ? (
                    <a href={order?.manualPaymentProofUrl || order?.paymentProofUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm">🔗 Voir</a>
                  ) : "—"
                } />
                <Row label="Référence" value={order?.manualPaymentReference || order?.paymentRef} copyable />
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

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Ligne 1: Cartes de statut */}
      {renderStatCards()}

      {/* Ligne 2: Message de statut (si présent) */}
      {statusMessage && (
        <Alert tone={statusMessage.tone} className="py-2">
          {statusMessage.text}
        </Alert>
      )}

      {/* Ligne 3: Contenu principal selon le flux */}
      {renderMainContent()}
    </div>
  );
}