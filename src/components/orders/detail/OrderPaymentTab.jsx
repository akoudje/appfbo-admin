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
    try {
      await navigator.clipboard?.writeText(String(value));
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

function StepIndicator({ number, title, active = false, completed = false }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`
          w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
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
        <div className="font-medium text-gray-700">{title}</div>
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

function PaymentMethodBadge({ isCash, isWave, isAutoPayment }) {
  const config = {
    cash: { label: "Espèces", tone: "amber", icon: "💵" },
    wave: { label: "Wave", tone: "blue", icon: "🌊" },
    auto: { label: "En ligne auto", tone: "blue", icon: "🔗" },
    manual: { label: "Manuel avec preuve", tone: "gray", icon: "📎" },
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
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${tones[tone]}`}
    >
      <span>{icon}</span>
      {label}
    </span>
  );
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
// Composant principal
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
  const hasPaymentInfo = Boolean(
    order?.paidAt || order?.paymentVerifiedBy || order?.paymentRef
  );

  const isWave =
    order?.paymentProvider === "WAVE" ||
    order?.preorderPaymentMode === "WAVE" ||
    order?.paymentMode === "WAVE";

  const activePayment = order?.activePayment || null;
  const latestAttempt = getLatestAttempt(order);

  const paymentStatus = String(
    activePayment?.status || order?.paymentStatus || ""
  ).toUpperCase();

  const waveCheckoutUrl =
    latestAttempt?.providerLaunchUrl ||
    latestAttempt?.checkoutUrl ||
    order?.paymentLink ||
    "—";

  const waveSessionId =
    latestAttempt?.providerSessionId ||
    activePayment?.providerReference ||
    order?.paymentRef ||
    "—";

  const waveTransactionId =
    activePayment?.providerTxnId ||
    latestAttempt?.providerTransactionId ||
    order?.paymentRef ||
    "—";

  const canInitiateWave =
    ["INVOICED", "PAYMENT_PENDING"].includes(status) && !saving;

  const renderCashFlow = () => (
    <div className="space-y-6">
      <Alert tone="amber" title="Paiement espèces">
        <p>
          Ce paiement se fait <strong>manuellement au bureau</strong>.
        </p>
        <p className="mt-1">
          L’admin doit encaisser et marquer la commande comme payée.
        </p>
      </Alert>

      <InfoSection title="Encaissement">
        <Field label="Note d'encaissement" optional>
          <textarea
            className="input w-full min-h-[100px] rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
            value={cashNote}
            onChange={(e) => setCashNote(e.target.value)}
            disabled={!canCashPay || saving || isPaid}
            placeholder="Ex: Paiement reçu au comptoir..."
          />
        </Field>

        <div className="flex items-center gap-4 pt-2">
          <button
            className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
              !canCashPay || saving || isPaid
                ? "opacity-50 cursor-not-allowed bg-gray-400"
                : "bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow"
            }`}
            onClick={onCashPay}
            disabled={!canCashPay || saving || isPaid}
            type="button"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⚪</span>
                Traitement...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                💰 Marquer comme encaissé
              </span>
            )}
          </button>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                canCashPay && !isPaid ? "bg-amber-400" : "bg-gray-400"
              }`}
            />
            {isPaid
              ? "Déjà payé"
              : canCashPay
                ? "Prêt à encaisser"
                : "Encaissement non disponible"}
          </div>
        </div>
      </InfoSection>

      {hasPaymentInfo && (
        <InfoSection title="Traçabilité">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row label="Validé par" value={order?.paymentVerifiedBy} />
            <Row label="Validé le" value={formatDateTime(order?.paidAt)} />
          </div>
        </InfoSection>
      )}
    </div>
  );

  const renderWaveFlow = () => (
    <div className="space-y-6">
      <Alert tone="blue" title="Paiement Wave">
        <p>
          Cette commande utilise un <strong>checkout Wave</strong>.
        </p>
        <p className="mt-1">
          Le client paie via le lien Wave, puis l’admin peut synchroniser le
          statut si nécessaire.
        </p>
      </Alert>

      <InfoSection title="Session Wave">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Statut commande"
            value={status || "—"}
            subvalue={isPaid ? "Paiement confirmé" : "En attente"}
            tone={isPaid ? "emerald" : "gray"}
            icon={isPaid ? "✅" : "⏳"}
          />
          <StatCard
            label="Statut paiement"
            value={<PaymentStatusBadge status={paymentStatus} />}
            subvalue="Payment actif"
            tone={isPaid ? "emerald" : "blue"}
            icon="💳"
          />
          <StatCard
            label="Montant attendu"
            value={formatFcfa(order?.totalFcfa)}
            subvalue="Commande"
            tone="gray"
            icon="💰"
          />
          <StatCard
            label="Montant payé"
            value={formatFcfa(activePayment?.amountPaidFcfa || 0)}
            subvalue="Confirmé"
            tone={isPaid ? "emerald" : "gray"}
            icon="🧾"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Session Wave" value={waveSessionId} copyable />
          <Row label="Transaction Wave" value={waveTransactionId} copyable />
          <Row
            label="Lien de paiement"
            value={
              waveCheckoutUrl && waveCheckoutUrl !== "—" ? (
                <a
                  href={waveCheckoutUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Ouvrir le lien Wave
                </a>
              ) : (
                "—"
              )
            }
          />
          <Row
            label="Tentative créée le"
            value={formatDateTime(latestAttempt?.createdAt)}
          />
          <Row
            label="Paiement confirmé le"
            value={formatDateTime(
              activePayment?.paidAt || latestAttempt?.completedAt || order?.paidAt
            )}
            highlight={isPaid}
          />
          <Row
            label="Dernière synchro"
            value={formatDateTime(
              activePayment?.updatedAt || latestAttempt?.updatedAt
            )}
          />
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              !canInitiateWave
                ? "opacity-50 cursor-not-allowed bg-gray-400 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow"
            }`}
            onClick={onInitiateWave}
            disabled={!canInitiateWave}
            type="button"
          >
            {saving ? "Initialisation..." : "Initier / réinitier Wave"}
          </button>

          <button
            className="px-4 py-2 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            onClick={onSyncWave}
            disabled={saving || !isWave}
            type="button"
          >
            {saving ? "Synchronisation..." : "Synchroniser le statut"}
          </button>

          {waveCheckoutUrl && waveCheckoutUrl !== "—" && (
            <a
              href={waveCheckoutUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 rounded-lg font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
            >
              Ouvrir Wave
            </a>
          )}

          <button
            className="px-4 py-2 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            onClick={reload}
            disabled={saving}
            type="button"
          >
            Rafraîchir la commande
          </button>
        </div>

        <div
          className={`mt-2 p-3 rounded-lg text-sm ${
            isPaid
              ? "bg-emerald-50 text-emerald-700"
              : isPaymentPendingStatus || isInvoiced || paymentStatus === "PROCESSING"
                ? "bg-blue-50 text-blue-700"
                : "bg-gray-50 text-gray-600"
          }`}
        >
          {isPaid ? (
            <span className="flex items-center gap-2">
              ✅ Paiement Wave confirmé. La commande peut être préparée.
            </span>
          ) : (
            <span className="flex items-center gap-2">
              ⏳ Paiement Wave en attente ou à synchroniser.
            </span>
          )}
        </div>
      </InfoSection>

      {activePayment && (
        <InfoSection title="Détails paiement actif">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row label="Payment ID" value={activePayment.id} copyable />
            <Row label="Provider" value={activePayment.provider} />
            <Row label="Method type" value={activePayment.methodType} />
            <Row
              label="Statut Payment"
              value={<PaymentStatusBadge status={activePayment.status} />}
            />
            <Row
              label="Montant attendu"
              value={formatFcfa(activePayment.amountExpectedFcfa)}
            />
            <Row
              label="Montant payé"
              value={formatFcfa(activePayment.amountPaidFcfa)}
              highlight={activePayment.amountPaidFcfa > 0}
            />
            <Row
              label="Référence provider"
              value={activePayment.providerReference}
              copyable
            />
            <Row
              label="Txn provider"
              value={activePayment.providerTxnId}
              copyable
            />
            <Row
              label="Client ref"
              value={activePayment.clientReference}
              copyable
            />
            <Row
              label="Initié le"
              value={formatDateTime(activePayment.initiatedAt)}
            />
            <Row label="Payé le" value={formatDateTime(activePayment.paidAt)} />
            <Row
              label="Mis à jour le"
              value={formatDateTime(activePayment.updatedAt)}
            />
          </div>
        </InfoSection>
      )}

      {latestAttempt && (
        <InfoSection title="Dernière tentative Wave">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row label="Attempt ID" value={latestAttempt.id} copyable />
            <Row
              label="Statut tentative"
              value={<PaymentStatusBadge status={latestAttempt.status} />}
            />
            <Row
              label="Session ID"
              value={latestAttempt.providerSessionId}
              copyable
            />
            <Row
              label="Transaction ID"
              value={
                latestAttempt.providerTransactionId ||
                activePayment?.providerTxnId ||
                "—"
              }
              copyable={
                Boolean(
                  latestAttempt.providerTransactionId || activePayment?.providerTxnId
                )
              }
            />
            <Row
              label="Créée le"
              value={formatDateTime(latestAttempt.createdAt)}
            />
            <Row
              label="Terminée le"
              value={formatDateTime(latestAttempt.completedAt)}
            />
          </div>
        </InfoSection>
      )}
    </div>
  );

  const renderManualFlow = () => {
    const step1Completed = status === "PAYMENT_PENDING" || isPaid;
    const step2Completed = isPaid;

    return (
      <div className="space-y-6">
        <Alert tone="gray" title="Paiement manuel avec preuve">
          <p>Flux de secours : le client paie hors ligne et envoie une preuve.</p>
          <p className="mt-1">
            L’admin enregistre la preuve puis valide manuellement.
          </p>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
          <StepIndicator
            number={1}
            title="Enregistrer la preuve"
            active={!step1Completed && isInvoiced}
            completed={step1Completed}
          />
          <StepIndicator
            number={2}
            title="Valider le paiement"
            active={step1Completed && !step2Completed}
            completed={step2Completed}
          />
        </div>

        <InfoSection title="Étape 1 — Preuve de paiement">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="URL de la preuve" optional>
              <input
                className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
                disabled={!canProof || saving || step1Completed}
                placeholder="https://..."
              />
            </Field>

            <Field label="Référence transaction" optional>
              <input
                className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                value={proofRef}
                onChange={(e) => setProofRef(e.target.value)}
                disabled={!canProof || saving || step1Completed}
                placeholder="WAVE-XXXX / OM-XXXX"
              />
            </Field>
          </div>

          <Field label="Note" optional>
            <textarea
              className="input w-full min-h-[100px] rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              disabled={!canProof || saving || step1Completed}
              placeholder="Capture reçue par WhatsApp..."
            />
          </Field>

          <div className="flex items-center gap-4 pt-2">
            <button
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                !canProof || saving || step1Completed
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow"
              }`}
              onClick={onProof}
              disabled={!canProof || saving || step1Completed}
              type="button"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚪</span>
                  Enregistrement...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  📸 Marquer preuve reçue
                </span>
              )}
            </button>

            <span className="text-xs text-gray-500">
              {step1Completed ? "✓ Preuve enregistrée" : "Statut INVOICED requis"}
            </span>
          </div>
        </InfoSection>

        <InfoSection title="Étape 2 — Validation finale">
          <Field label="Note de validation" optional>
            <input
              className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
              value={verifyNote}
              onChange={(e) => setVerifyNote(e.target.value)}
              disabled={!canVerify || saving || step2Completed}
              placeholder="Paiement vérifié, tout est conforme..."
            />
          </Field>

          <div className="flex items-center gap-4 pt-2">
            <button
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                !canVerify || saving || step2Completed
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow"
              }`}
              onClick={onVerify}
              disabled={!canVerify || saving || step2Completed}
              type="button"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚪</span>
                  Validation...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  ✅ Valider le paiement
                </span>
              )}
            </button>

            <span className="text-xs text-gray-500">
              {step2Completed ? "✓ Paiement validé" : "Statut PAYMENT_PENDING requis"}
            </span>
          </div>
        </InfoSection>

        {(order?.manualPaymentProofUrl ||
          order?.paymentProofUrl ||
          order?.manualPaymentReference ||
          order?.paymentRef ||
          order?.manualPaymentProofNote ||
          order?.paymentProofNote) && (
          <InfoSection title="Preuve enregistrée">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Row
                label="URL preuve"
                value={
                  order?.manualPaymentProofUrl || order?.paymentProofUrl ? (
                    <a
                      className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                      href={order?.manualPaymentProofUrl || order?.paymentProofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🔗 Voir la preuve
                    </a>
                  ) : (
                    "—"
                  )
                }
              />
              <Row
                label="Référence"
                value={order?.manualPaymentReference || order?.paymentRef}
                copyable
              />
            </div>

            {(order?.manualPaymentProofNote || order?.paymentProofNote) && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
                <span className="text-xs text-gray-500 block mb-1">Note :</span>
                {order?.manualPaymentProofNote || order?.paymentProofNote}
              </div>
            )}
          </InfoSection>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <InfoSection title="Paiement">
        <p className="text-sm text-gray-600">
          Traitement du paiement selon le mode sélectionné.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Mode"
            value={
              <PaymentMethodBadge
                isCash={isCash}
                isWave={isWave}
                isAutoPayment={isAutoPayment}
              />
            }
            subvalue={
              order?.preorderPaymentMode ||
              order?.paymentMode ||
              order?.paymentProvider ||
              "—"
            }
            tone={isCash ? "amber" : isWave || isAutoPayment ? "blue" : "gray"}
          />
          <StatCard
            label="Statut commande"
            value={status || "—"}
            subvalue={isPaid ? "Payé" : "En attente"}
            tone={isPaid ? "emerald" : "gray"}
            icon={isPaid ? "✅" : "⏳"}
          />
          <StatCard
            label="Référence"
            value={waveTransactionId !== "—" ? waveTransactionId : waveSessionId}
            subvalue="Transaction / session"
            tone="blue"
            icon="🔢"
          />
          <StatCard
            label="Date"
            value={formatDateTime(order?.paidAt)}
            subvalue="de paiement"
            tone="gray"
            icon="📅"
          />
        </div>
      </InfoSection>

      {isCash && renderCashFlow()}
      {!isCash && isWave && renderWaveFlow()}
      {!isCash && !isWave && !isAutoPayment && renderManualFlow()}
      {!isCash && !isWave && isAutoPayment && renderWaveFlow()}
    </div>
  );
}