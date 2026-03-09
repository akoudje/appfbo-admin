// src/components/orders/detail/OrderPaymentTab.jsx

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
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
        ${completed ? 'bg-emerald-100 text-emerald-700' : 
          active ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}
      `}>
        {completed ? '✓' : number}
      </div>
      <div>
        <div className="font-medium text-gray-700">{title}</div>
        <div className="text-xs text-gray-500">
          {completed ? 'Terminée' : active ? 'En cours' : 'À venir'}
        </div>
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

function PaymentMethodBadge({ mode, isCash, isAutoPayment }) {
  const config = {
    cash: { label: "Espèces", tone: "amber", icon: "💵" },
    auto: { label: "En ligne auto", tone: "blue", icon: "🔗" },
    manual: { label: "Manuel avec preuve", tone: "gray", icon: "📎" },
  };

  let type = "manual";
  if (isCash) type = "cash";
  else if (isAutoPayment) type = "auto";

  const { label, tone, icon } = config[type];

  const tones = {
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${tones[tone]}`}>
      <span>{icon}</span>
      {label}
    </span>
  );
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
  reload,
}) {
  const status = order?.status;
  const isPaid = status === "PAID";
  const isInvoiced = status === "INVOICED";
  const isProofReceived = status === "PAYMENT_PROOF_RECEIVED";
  const hasPaymentInfo = Boolean(order?.paidAt || order?.paymentVerifiedBy || order?.paymentRef);

  // Rendu conditionnel selon le mode de paiement
  const renderCashFlow = () => (
    <div className="space-y-6">
      <Alert tone="amber" title="💵 Paiement espèces">
        <p>Ce paiement se fait <strong>manuellement au bureau</strong>.</p>
        <p className="mt-1">L'admin doit encaisser et marquer la commande comme payée.</p>
      </Alert>

      <InfoSection title="Encaissement">
        <Field label="Note d'encaissement" optional>
          <textarea
            className="input w-full min-h-[100px] rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
            value={cashNote}
            onChange={(e) => setCashNote(e.target.value)}
            disabled={!canCashPay || saving || isPaid}
            placeholder="Ex: Paiement reçu au comptoir par Mamadou..."
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
            <span className={`inline-block w-2 h-2 rounded-full ${canCashPay && !isPaid ? 'bg-amber-400' : 'bg-gray-400'}`} />
            {isPaid ? 'Déjà payé' : (canCashPay ? 'Prêt à encaisser' : 'Encaissement non disponible')}
          </div>
        </div>
      </InfoSection>

      {hasPaymentInfo && (
        <InfoSection title="Traçabilité">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row 
              label="Validé par" 
              value={order?.paymentVerifiedBy} 
            />
            <Row 
              label="Validé le" 
              value={formatDateTime(order?.paidAt)} 
            />
          </div>
        </InfoSection>
      )}
    </div>
  );

  const renderAutoFlow = () => (
    <div className="space-y-6">
      <Alert tone="blue" title="🔗 Paiement en ligne automatique">
        <p>Cette commande utilise un <strong>lien PayDunya</strong>.</p>
        <p className="mt-1">Le statut passe automatiquement à <strong>PAID</strong> dès que le client paie.</p>
      </Alert>

      <InfoSection title="Suivi du paiement">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard
            label="Statut"
            value={status}
            subvalue={isPaid ? "Paiement confirmé" : "En attente"}
            tone={isPaid ? "emerald" : "gray"}
            icon={isPaid ? "✅" : "⏳"}
          />
          <StatCard
            label="Référence"
            value={order?.paymentRef || "—"}
            subvalue="Transaction"
            tone="blue"
            icon="🔢"
          />
          <StatCard
            label="Validé par"
            value={order?.paymentVerifiedBy || "Automatique"}
            subvalue="Système"
            tone="gray"
            icon="🤖"
          />
          <StatCard
            label="Date"
            value={formatDateTime(order?.paidAt) || "—"}
            subvalue="de paiement"
            tone="gray"
            icon="📅"
          />
        </div>

        <div className="flex gap-3 flex-wrap pt-2">
          {order?.paymentLink && (
            <a
              className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              href={order.paymentLink}
              target="_blank"
              rel="noreferrer"
            >
              🔗 Ouvrir le lien PayDunya
            </a>
          )}

          <button
            className="btn inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            onClick={reload}
            disabled={saving}
          >
            🔄 Rafraîchir le statut
          </button>
        </div>

        <div className={`mt-2 p-3 rounded-lg text-sm ${
          isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-50 text-gray-600'
        }`}>
          {isPaid ? (
            <span className="flex items-center gap-2">✅ Paiement confirmé. La commande peut être préparée.</span>
          ) : (
            <span className="flex items-center gap-2">⏳ En attente de confirmation du paiement en ligne.</span>
          )}
        </div>
      </InfoSection>
    </div>
  );

  const renderManualFlow = () => {
    const step1Completed = isProofReceived || isPaid;
    const step2Completed = isPaid;

    return (
      <div className="space-y-6">
        <Alert tone="gray" title="📎 Paiement manuel avec preuve">
          <p>Flux de secours : le client paie hors ligne et envoie une preuve.</p>
          <p className="mt-1">L'admin enregistre la preuve puis valide manuellement.</p>
        </Alert>

        {/* Indicateur d'étapes */}
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

        {/* Étape 1 */}
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
              placeholder="Capture d'écran reçue par WhatsApp..."
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
              {step1Completed ? '✓ Preuve enregistrée' : 'Statut INVOICED requis'}
            </span>
          </div>
        </InfoSection>

        {/* Étape 2 */}
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
              {step2Completed ? '✓ Paiement validé' : 'Statut PAYMENT_PROOF_RECEIVED requis'}
            </span>
          </div>
        </InfoSection>

        {/* Informations enregistrées */}
        {(order?.paymentProofUrl || order?.paymentRef || order?.paymentProofNote) && (
          <InfoSection title="Preuve enregistrée">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Row 
                label="URL preuve" 
                value={
                  order?.paymentProofUrl ? (
                    <a
                      className="text-indigo-600 hover:text-indigo-800 underline inline-flex items-center gap-1"
                      href={order.paymentProofUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      🔗 Voir la preuve
                    </a>
                  ) : "—"
                }
              />
              <Row 
                label="Référence" 
                value={order?.paymentRef}
                copyable
              />
            </div>

            {order?.paymentProofNote && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700 whitespace-pre-wrap border border-gray-200">
                <span className="text-xs text-gray-500 block mb-1">Note :</span>
                {order.paymentProofNote}
              </div>
            )}
          </InfoSection>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* En-tête commun */}
      <InfoSection title="Paiement">
        <p className="text-sm text-gray-600">
          Traitement du paiement selon le mode sélectionné.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Mode"
            value={<PaymentMethodBadge isCash={isCash} isAutoPayment={isAutoPayment} />}
            subvalue={order?.paymentMode}
            tone={isCash ? "amber" : isAutoPayment ? "blue" : "gray"}
          />
          <StatCard
            label="Statut"
            value={status}
            subvalue={isPaid ? "Payé" : "En attente"}
            tone={isPaid ? "emerald" : "gray"}
            icon={isPaid ? "✅" : "⏳"}
          />
          <StatCard
            label="Référence"
            value={order?.paymentRef || "—"}
            subvalue="Transaction"
            tone="blue"
            icon="🔢"
          />
          <StatCard
            label="Date"
            value={formatDateTime(order?.paidAt) || "—"}
            subvalue="de paiement"
            tone="gray"
            icon="📅"
          />
        </div>
      </InfoSection>

      {/* Flux conditionnel */}
      {isCash && renderCashFlow()}
      {!isCash && isAutoPayment && renderAutoFlow()}
      {!isCash && !isAutoPayment && renderManualFlow()}
    </div>
  );
}