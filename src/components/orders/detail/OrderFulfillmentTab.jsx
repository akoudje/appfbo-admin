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

function formatFcfa(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function getItemSku(item) {
  return item?.productSkuSnapshot || item?.product?.sku || "—";
}

function getItemName(item) {
  return item?.productNameSnapshot || item?.product?.nom || "Produit";
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
  onDownloadDeliveryNote,
}) {
  const status = order?.status;
  const isReady = status === "READY";
  const isFulfilled = status === "FULFILLED";
  const canBeFulfilled = isReady && !isFulfilled;
  const isPickupOrder = order?.deliveryMode === "RETRAIT_SITE_FLP";
  const missingPickupCode = isPickupOrder && !String(pickupCode || "").trim();
  const hasDeliveryInfo = Boolean(order?.deliveryTracking || order?.fulfilledBy || order?.fulfilledAt);
  const orderItems = Array.isArray(order?.items) ? order.items : [];
  const totalUnits = orderItems.reduce((sum, item) => sum + Number(item?.qty || 0), 0);

  const handlePrintDeliveryNote = () => {
    const popup = window.open("", "_blank", "width=980,height=720");
    if (!popup) return;

    const rows = orderItems
      .map((item) => {
        const sku = getItemSku(item);
        const name = getItemName(item);
        const qty = Number(item?.qty || 0);
        return `
          <tr>
            <td>${sku}</td>
            <td>${name}</td>
            <td>${qty}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Bon de livraison ${order?.parcelNumber || order?.preorderNumber || order?.id || ""}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
          h1 { font-size: 20px; margin: 0 0 8px; }
          .meta { margin-bottom: 18px; font-size: 13px; }
          .meta div { margin: 3px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; text-align: left; }
          th { background: #f5f5f5; }
          .footer { margin-top: 18px; font-size: 12px; color: #444; }
        </style>
      </head>
      <body>
        <h1>Bon de livraison</h1>
        <div class="meta">
          <div><strong>N° colis:</strong> ${order?.parcelNumber || "—"}</div>
          <div><strong>N° précommande:</strong> ${order?.preorderNumber || order?.id || "—"}</div>
          <div><strong>Client:</strong> ${order?.fboNomComplet || "—"} (FBO ${order?.fboNumero || "—"})</div>
          <div><strong>Date impression:</strong> ${formatDateTime(new Date().toISOString())}</div>
          <div><strong>Mode remise:</strong> ${order?.fulfillmentMode || (isPickupOrder ? "PICKUP" : "DELIVERY")}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Produit</th>
              <th>Quantité</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3">Aucun produit</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          Total lignes: ${orderItems.length} • Total unités: ${totalUnits}
        </div>
      </body>
      </html>
    `;

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    popup.print();
  };

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

      <InfoSection title="Produits à remettre au client">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <div className="text-gray-700">
            <strong>{orderItems.length}</strong> ligne(s) • <strong>{totalUnits}</strong> unité(s)
          </div>
          <div className="font-semibold text-gray-900">{formatFcfa(order?.totalFcfa || 0)}</div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Produit</th>
                <th className="px-3 py-2">Qté</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-gray-500">
                    Aucun produit sur la commande.
                  </td>
                </tr>
              ) : (
                orderItems.map((item) => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-mono text-xs">{getItemSku(item)}</td>
                    <td className="px-3 py-2">{getItemName(item)}</td>
                    <td className="px-3 py-2 font-semibold">{Number(item?.qty || 0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              if (typeof onDownloadDeliveryNote === "function") {
                onDownloadDeliveryNote();
                return;
              }
              handlePrintDeliveryNote();
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Télécharger bon de livraison (PDF)
          </button>
        </div>
      </InfoSection>

      {!isFulfilled && (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <InfoSection title="Saisie utile">
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

              {isPickupOrder ? (
                <Field label="Code secret client">
                  <input
                    className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                    value={pickupCode}
                    onChange={(e) => setPickupCode(e.target.value)}
                    placeholder="Code présenté au comptoir"
                    disabled={!canFulfill || saving}
                  />
                </Field>
              ) : (
                <Field label="Numéro de tracking" optional>
                  <input
                    className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                    value={deliveryTracking}
                    onChange={(e) => setDeliveryTracking(e.target.value)}
                    placeholder="Ex: TRACK123"
                    disabled={!canFulfill || saving}
                  />
                </Field>
              )}

              <Field label={isPickupOrder ? "Point de retrait" : "Transporteur"} optional>
                <input
                  className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                  value={isPickupOrder ? pickupPointLabel || "" : deliveryCarrier || ""}
                  onChange={(e) =>
                    isPickupOrder
                      ? setPickupPointLabel?.(e.target.value)
                      : setDeliveryCarrier?.(e.target.value)
                  }
                  placeholder={isPickupOrder ? "Ex: Comptoir Abidjan 1" : "Ex: DHL"}
                  disabled={!canFulfill || saving}
                />
              </Field>

              {!isPickupOrder ? (
                <Field label="Point de remise" optional>
                  <input
                    className="input w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                    value={pickupPointLabel || ""}
                    onChange={(e) => setPickupPointLabel?.(e.target.value)}
                    placeholder="Ex: Adresse client / dépôt"
                    disabled={!canFulfill || saving}
                  />
                </Field>
              ) : null}
            </div>

            <Field label="Note" optional>
              <textarea
                className="input w-full min-h-[88px] rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 disabled:bg-gray-50 disabled:text-gray-500"
                value={fulfillNote}
                onChange={(e) => setFulfillNote(e.target.value)}
                placeholder="Observation utile sur la remise"
                disabled={!canFulfill || saving}
              />
            </Field>
          </InfoSection>

          <InfoSection title="Action finale">
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-2">
                  <span className="text-gray-500">Colis</span>
                  <span className="font-semibold text-gray-900">{order?.parcelNumber || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-gray-200 py-2">
                  <span className="text-gray-500">Client</span>
                  <span className="font-semibold text-gray-900">{order?.fboNomComplet || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2">
                  <span className="text-gray-500">Mode</span>
                  <span className="font-semibold text-gray-900">
                    {fulfillmentMode || (isPickupOrder ? "PICKUP" : "DELIVERY")}
                  </span>
                </div>
              </div>

              <button
                className={`w-full px-6 py-3 rounded-lg font-medium transition-all ${
                  !canFulfill || saving || missingPickupCode
                    ? "opacity-50 cursor-not-allowed bg-gray-400"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow"
                }`}
                onClick={onFulfill}
                disabled={!canFulfill || saving || missingPickupCode}
              >
                {saving ? "Clôture en cours..." : "Confirmer la clôture"}
              </button>

              <div className="text-xs text-gray-500">
                {canFulfill
                  ? missingPickupCode
                    ? "Code retrait requis avant validation."
                    : "La clôture enverra automatiquement un SMS de confirmation au client."
                  : "Statut READY requis pour clôturer."}
              </div>

              {isPickupOrder ? (
                <div className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  Le retrait ne sera validé que si le code saisi correspond au colis.
                </div>
              ) : null}
            </div>
          </InfoSection>
        </div>
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
