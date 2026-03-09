// src/components/orders/detail/OrderPreparationTab.jsx

/* function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Alert({ tone = "blue", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    gray: "border-gray-200 bg-gray-50 text-gray-900",
  };

  return (
    <div className={`card p-3 border ${tones[tone] || tones.blue}`}>
      {title ? <div className="font-semibold text-sm mb-1">{title}</div> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
        tones[tone] || tones.gray
      }`}
    >
      {children}
    </span>
  );
}

export default function OrderPreparationTab({
  order,
  saving,
  canPrepare,
  packingNote,
  setPackingNote,
  onPrepare,
  stockSummary,
}) {
  const status = order?.status;
  const stockDebited = Boolean(order?.stockDeductedAt);

  const stockMovements = Array.isArray(order?.stockMovements)
    ? order.stockMovements
    : [];

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="font-semibold">Préparation</div>
        <div className="text-sm text-gray-500">
          Cette étape concerne le préparateur : constitution du colis, validation
          logistique et sortie de stock.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Statut commande" value={status || "—"} />
          <Row
            label="Stock déjà sorti"
            value={stockDebited ? "Oui" : "Non"}
          />
          <Row
            label="Date sortie stock"
            value={
              order?.stockDeductedAt
                ? new Date(order.stockDeductedAt).toLocaleString("fr-FR")
                : "—"
            }
          />
          <Row
            label="Préparée par"
            value={order?.preparedBy || "—"}
          />
        </div>
      </div>

      {status === "PAID" && !stockDebited && (
        <Alert tone="blue" title="Commande prête à être préparée">
          Le paiement est confirmé. En cliquant sur <b>Marquer colis prêt</b>,
          tu vas :
          <br />
          - passer la commande en <b>READY</b>
          <br />
          - décrémenter le stock
          <br />
          - enregistrer les mouvements de stock
        </Alert>
      )}

      {status === "READY" && stockDebited && (
        <Alert tone="emerald" title="Commande déjà préparée">
          La commande est déjà en statut <b>READY</b>. Le stock a été décrémenté.
        </Alert>
      )}

      {status !== "PAID" && status !== "READY" && (
        <Alert tone="gray" title="Préparation non disponible">
          La préparation n’est disponible que lorsque la commande est <b>PAID</b>.
        </Alert>
      )}

      <div className="card p-4 space-y-4">
        <div className="font-semibold">Note de préparation</div>

        <Field label="Note colis (optionnel)">
          <textarea
            className="input min-h-[110px]"
            value={packingNote}
            onChange={(e) => setPackingNote(e.target.value)}
            placeholder="1 carton + 1 sachet, vérification effectuée..."
            disabled={!canPrepare || saving}
          />
        </Field>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            className="btn-primary"
            onClick={onPrepare}
            disabled={!canPrepare || saving}
          >
            {saving ? "..." : "Marquer colis prêt"}
          </button>

          <span className="text-xs text-gray-500">
            Actif si statut = PAID
          </span>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="font-semibold">Synthèse stock</div>
          <div className="text-sm text-gray-500">
            Débit total : {stockSummary?.debitQty || 0} • Crédit total : {stockSummary?.creditQty || 0}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border p-3 bg-gray-50">
            <div className="text-xs text-gray-500">Sortie stock</div>
            <div className="font-semibold mt-1">
              {order?.stockDeductedAt
                ? new Date(order.stockDeductedAt).toLocaleString("fr-FR")
                : "Pas encore"}
            </div>
          </div>

          <div className="rounded-xl border p-3 bg-gray-50">
            <div className="text-xs text-gray-500">Débit total</div>
            <div className="font-semibold mt-1">{stockSummary?.debitQty || 0}</div>
          </div>

          <div className="rounded-xl border p-3 bg-gray-50">
            <div className="text-xs text-gray-500">Crédit total</div>
            <div className="font-semibold mt-1">{stockSummary?.creditQty || 0}</div>
          </div>
        </div>
      </div>

      {stockMovements.length > 0 && (
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Mouvements de stock liés</div>

          <div className="space-y-2">
            {stockMovements.map((m) => (
              <div key={m.id} className="rounded-xl border p-3 bg-gray-50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge tone={m.type === "DEBIT" ? "amber" : "emerald"}>
                      {m.type === "DEBIT" ? "Débit" : "Crédit"}
                    </Badge>

                    <div className="font-medium">
                      {m.product?.sku || "—"} — {m.product?.nom || "Produit"}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    {m.createdAt
                      ? new Date(m.createdAt).toLocaleString("fr-FR")
                      : "—"}
                  </div>
                </div>

                <div className="text-sm text-gray-700 mt-1">
                  Raison : <span className="font-medium">{m.reason}</span> • Qté :{" "}
                  <span className="font-medium">{m.qty}</span>
                </div>

                {m.note ? (
                  <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
                    {m.note}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} */

  // src/components/orders/detail/OrderPreparationTab.jsx

// ============================================================================
// Sous-composants
// ============================================================================

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
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

function Row({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1 border-b border-gray-100 last:border-0">
      <div className="text-gray-500">{label}</div>
      <div className={`font-medium text-right ${highlight ? 'text-indigo-600' : ''}`}>
        {value ?? "—"}
      </div>
    </div>
  );
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        tones[tone] || tones.gray
      }`}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, subvalue, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-50 border-gray-200",
    amber: "bg-amber-50 border-amber-200",
    emerald: "bg-emerald-50 border-emerald-200",
    blue: "bg-blue-50 border-blue-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {subvalue && <div className="text-xs text-gray-500 mt-1">{subvalue}</div>}
    </div>
  );
}

// ============================================================================
// Composant principal
// ============================================================================

export default function OrderPreparationTab({
  order,
  saving,
  canPrepare,
  packingNote,
  setPackingNote,
  onPrepare,
  stockSummary,
}) {
  // État de la commande
  const status = order?.status;
  const stockDebited = Boolean(order?.stockDeductedAt);
  const isPaid = status === "PAID";
  const isReady = status === "READY";
  const canBePrepared = isPaid && !stockDebited;

  // Mouvements de stock
  const stockMovements = Array.isArray(order?.stockMovements)
    ? order.stockMovements
    : [];

  // Formatage des dates
  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  // Rendu conditionnel des alertes
  const renderAlert = () => {
    if (canBePrepared) {
      return (
        <Alert tone="blue" title="📦 Prêt pour la préparation">
          <p>Le paiement est confirmé. En préparant cette commande :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Le statut passera à <strong>READY</strong></li>
            <li>Le stock sera décrémenté</li>
            <li>Les mouvements seront enregistrés</li>
          </ul>
        </Alert>
      );
    }

    if (isReady && stockDebited) {
      return (
        <Alert tone="emerald" title="✅ Commande préparée">
          <p>Cette commande a déjà été préparée le <strong>{formatDate(order.stockDeductedAt)}</strong>.</p>
          <p className="mt-1">Le stock a été décrémenté et les mouvements sont visibles ci-dessous.</p>
        </Alert>
      );
    }

    if (!isPaid && !isReady) {
      return (
        <Alert tone="gray" title="⏸️ Préparation non disponible">
          La préparation n'est possible que lorsque la commande est en statut <strong>PAYÉE</strong>.
          Statut actuel : <Badge tone="gray">{status}</Badge>
        </Alert>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* En-tête avec synthèse */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Préparation de commande</h3>
          <Badge tone={stockDebited ? "emerald" : "gray"}>
            {stockDebited ? "Stock sorti" : "Stock en attente"}
          </Badge>
        </div>

        <p className="text-sm text-gray-600">
          Validation logistique, constitution du colis et mise à jour des stocks.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Statut"
            value={status}
            subvalue={stockDebited ? "Stock sorti" : "Stock disponible"}
            tone={isReady ? "emerald" : isPaid ? "blue" : "gray"}
          />
          <StatCard
            label="Date de sortie"
            value={formatDate(order?.stockDeductedAt) || "—"}
            subvalue={stockDebited ? "Stock décrémenté" : "Aucune sortie"}
          />
          <StatCard
            label="Préparateur"
            value={order?.preparedBy || "—"}
            subvalue={order?.preparedBy ? "Préparateur assigné" : "Non assigné"}
          />
          <StatCard
            label="Mouvements"
            value={stockMovements.length}
            subvalue={`${stockSummary?.debitQty || 0} débits • ${stockSummary?.creditQty || 0} crédits`}
          />
        </div>
      </div>

      {/* Alertes contextuelles */}
      {renderAlert()}

      {/* Zone de préparation */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900">Note de préparation</h4>
          <span className="text-xs text-gray-500">(optionnel)</span>
        </div>

        <Field label="Instructions et détails colis">
          <textarea
            className="input min-h-[120px] w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            value={packingNote}
            onChange={(e) => setPackingNote(e.target.value)}
            placeholder="Ex: 1 carton + 1 sachet, fragile, vérification effectuée..."
            disabled={!canPrepare || saving}
          />
        </Field>

        <div className="flex items-center gap-4 pt-2">
          <button
            className={`btn-primary px-6 py-2.5 rounded-lg font-medium transition-all ${
              !canPrepare || saving
                ? "opacity-50 cursor-not-allowed bg-gray-400"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow"
            }`}
            onClick={onPrepare}
            disabled={!canPrepare || saving}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⚪</span>
                Préparation en cours...
              </span>
            ) : (
              "✅ Marquer colis prêt"
            )}
          </button>

          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-400" />
            {canPrepare ? "Prêt à être préparé" : "Action non disponible"}
          </div>
        </div>
      </div>

      {/* Synthèse stock */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Synthèse des stocks</h4>
          <Badge tone="blue">
            Total mouvements : {stockMovements.length}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">Sortie de stock</div>
            <div className="text-xl font-semibold mt-1">
              {formatDate(order?.stockDeductedAt) || "En attente"}
            </div>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <div className="text-sm text-amber-700">Débit total</div>
            <div className="text-xl font-semibold mt-1 text-amber-800">
              {stockSummary?.debitQty || 0}
            </div>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
            <div className="text-sm text-emerald-700">Crédit total</div>
            <div className="text-xl font-semibold mt-1 text-emerald-800">
              {stockSummary?.creditQty || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Mouvements de stock */}
      {stockMovements.length > 0 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Mouvements de stock</h4>
            <span className="text-xs text-gray-500">
              {stockMovements.length} mouvement{stockMovements.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {stockMovements.map((movement) => (
              <div
                key={movement.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge tone={movement.type === "DEBIT" ? "amber" : "emerald"}>
                        {movement.type === "DEBIT" ? "⬇️ Débit" : "⬆️ Crédit"}
                      </Badge>
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
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        📝 {movement.note}
                      </div>
                    )}
                  </div>

                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(movement.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}