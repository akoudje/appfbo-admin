// src/components/orders/detail/OrderFulfillmentTab.jsx

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

function StatusBadge({ status, fulfilled }) {
  const config = {
    READY: { label: "Prête", tone: "blue", icon: "📦" },
    FULFILLED: { label: "Clôturée", tone: "emerald", icon: "✅" },
    default: { label: status || "—", tone: "gray", icon: "⏳" },
  };

  const { label, tone, icon } = config[status] || config.default;

  const tones = {
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    gray: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${tones[tone]}`}>
      <span>{icon}</span>
      {label}
      {fulfilled && " ✓"}
    </span>
  );
}

// ============================================================================
// Utilitaires
// ============================================================================

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

export default function OrderFulfillmentTab({
  order,
  saving,
  canFulfill,
  deliveryTracking,
  setDeliveryTracking,
  pickupCode,
  setPickupCode,
  pickupPointLabel,
  setPickupPointLabel,
  deliveryCarrier,
  setDeliveryCarrier,
  fulfillmentMode,
  setFulfillmentMode,
  fulfillNote,
  setFulfillNote,
  onFulfill,
}) {
  const status = order?.status;
  const isReady = status === "READY";
  const isFulfilled = status === "FULFILLED";
  const canBeFulfilled = isReady && !isFulfilled;
  const isPickupOrder = order?.deliveryMode === "RETRAIT_SITE_FLP";
  const missingPickupCode = isPickupOrder && !String(pickupCode || "").trim();
  const hasDeliveryInfo = Boolean(order?.deliveryTracking || order?.fulfilledBy || order?.fulfilledAt);

  // Rendu conditionnel des alertes
  const renderAlert = () => {
    if (isFulfilled) {
      return (
        <Alert tone="blue" title="✅ Commande clôturée">
          <p>Cette commande a été finalisée le <strong>{formatDateTime(order?.fulfilledAt)}</strong>.</p>
          {order?.fulfilledBy && (
            <p className="mt-1">Par <strong>{order.fulfilledBy}</strong>.</p>
          )}
        </Alert>
      );
    }

    if (isReady) {
      return (
        <Alert tone="emerald" title="📦 Prête pour la clôture">
          <p>Le colis est prêt. Tu peux maintenant confirmer :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Le <strong>retrait</strong> par le client</li>
            <li>Ou la <strong>livraison</strong> effective</li>
          </ul>
          <p className="mt-2">La commande passera en statut <strong>FULFILLED</strong>.</p>
        </Alert>
      );
    }

    return (
      <Alert tone="gray" title="⏸️ Clôture non disponible">
        <p>La clôture n'est possible que lorsque la commande est en statut <strong>READY</strong>.</p>
        <p className="mt-1">Statut actuel : <StatusBadge status={status} /></p>
      </Alert>
    );
  };

  return (
    <div className="space-y-4">
      <InfoSection title="Clôture">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <StatCard
            label="Statut"
            value={<StatusBadge status={status} fulfilled={isFulfilled} />}
            subvalue={isFulfilled ? "Finalisée" : "En cours"}
            tone={isFulfilled ? "emerald" : isReady ? "blue" : "gray"}
            icon={isFulfilled ? "✅" : "📦"}
          />
          <StatCard
            label="Colis"
            value={order?.parcelNumber || "—"}
            tone="blue"
            icon="📦"
          />
          <StatCard
            label="Code retrait"
            value={isPickupOrder ? (order?.pickupSecretCode || "—") : "—"}
            tone="amber"
            icon="🔐"
          />
          <StatCard
            label="Prête le"
            value={formatDateTime(order?.preparedAt)}
            tone="gray"
            icon="📅"
          />
          <StatCard
            label="Clôturée le"
            value={formatDateTime(order?.fulfilledAt)}
            tone="gray"
            icon="✅"
          />
        </div>
      </InfoSection>

      {/* Alertes contextuelles */}
      {renderAlert()}

      {/* Formulaire de clôture (visible seulement si non clôturée) */}
      {!isFulfilled && (
        <InfoSection title="Confirmation finale">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Mode de remise">
              <select
                className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                value={fulfillmentMode || (isPickupOrder ? "PICKUP" : "DELIVERY")}
                onChange={(e) => setFulfillmentMode?.(e.target.value)}
                disabled={!canFulfill || saving}
              >
                <option value="PICKUP">Retrait comptoir</option>
                <option value="DELIVERY">Livraison</option>
              </select>
            </Field>

            <Field label="Numéro de tracking" optional>
              <input
                className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                value={deliveryTracking}
                onChange={(e) => setDeliveryTracking(e.target.value)}
                placeholder="Ex: TRACK123, COLIS-456..."
                disabled={!canFulfill || saving}
              />
            </Field>

            <Field label="Transporteur / opérateur" optional>
              <input
                className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                value={deliveryCarrier || ""}
                onChange={(e) => setDeliveryCarrier?.(e.target.value)}
                placeholder="Ex: DHL, Retrait comptoir principal..."
                disabled={!canFulfill || saving}
              />
            </Field>
          </div>

          <Field label="Point de retrait" optional>
            <input
              className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
              value={pickupPointLabel || ""}
              onChange={(e) => setPickupPointLabel?.(e.target.value)}
              placeholder="Ex: Comptoir Abidjan 1"
              disabled={!canFulfill || saving}
            />
          </Field>

          {isPickupOrder ? (
            <Field label="Code secret présenté par le client">
              <input
                className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                value={pickupCode}
                onChange={(e) => setPickupCode(e.target.value)}
                placeholder="Saisir le code secret communiqué par le client"
                disabled={!canFulfill || saving}
              />
            </Field>
          ) : null}

          <Field label="Note de clôture" optional>
            <textarea
              className="input w-full min-h-[90px] rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
              value={fulfillNote}
              onChange={(e) => setFulfillNote(e.target.value)}
              placeholder="Ex: Retiré sur site par le client - Tout est conforme. / Livré à l'adresse, colis en bon état..."
              disabled={!canFulfill || saving}
            />
          </Field>

          <div className="flex items-center gap-4 pt-2">
            <button
              className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                !canFulfill || saving || missingPickupCode
                  ? "opacity-50 cursor-not-allowed bg-gray-400"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow"
              }`}
              onClick={onFulfill}
              disabled={!canFulfill || saving || missingPickupCode}
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⚪</span>
                  Clôture en cours...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  ✅ Confirmer la clôture
                </span>
              )}
            </button>

            <div className="text-xs text-gray-500 flex items-center gap-1">
              <span className={`inline-block w-2 h-2 rounded-full ${canFulfill ? 'bg-emerald-400' : 'bg-gray-400'}`} />
              {canFulfill
                ? missingPickupCode
                  ? "Code retrait requis"
                  : "Prêt à clôturer"
                : "Statut READY requis"}
            </div>
          </div>

          {isPickupOrder ? (
            <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
              Le retrait ne sera confirmé que si le code saisi correspond au code
              secret enregistré pour ce colis.
            </div>
          ) : null}

        </InfoSection>
      )}

      {hasDeliveryInfo && (
        <InfoSection title="Récapitulatif">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Row 
              label="N° colis" 
              value={order?.parcelNumber} 
              copyable
              highlight={Boolean(order?.parcelNumber)}
            />
            <Row 
              label="Tracking" 
              value={order?.deliveryTracking} 
              copyable
              highlight={Boolean(order?.deliveryTracking)}
            />
            <Row 
              label="Clôturée par" 
              value={order?.fulfilledBy} 
            />
            <Row 
              label="Date de clôture" 
              value={formatDateTime(order?.fulfilledAt)} 
            />
            <Row
              label="Code retrait vérifié le"
              value={formatDateTime(order?.pickupCodeVerifiedAt)}
              highlight={Boolean(order?.pickupCodeVerifiedAt)}
            />
            <Row label="Mode de remise" value={order?.fulfillmentMode || "—"} />
            <Row label="Point de retrait" value={order?.pickupPointLabel || "—"} />
            <Row label="Transporteur" value={order?.deliveryCarrier || "—"} />
          </div>

          {order?.fulfillNote && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-1">Note de clôture :</div>
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200 whitespace-pre-wrap">
                {order.fulfillNote}
              </div>
            </div>
          )}

          {isFulfilled && (
            <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-lg text-sm flex items-center gap-2">
              <span>✅</span>
              <span>Commande finalisée avec succès. Plus aucune action n'est possible.</span>
            </div>
          )}
        </InfoSection>
      )}

      {/* Message conditionnel pour les commandes déjà clôturées */}
      {isFulfilled && (
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">
            Cette commande est clôturée. Elle ne peut plus être modifiée.
          </p>
        </div>
      )}
    </div>
  );
}
