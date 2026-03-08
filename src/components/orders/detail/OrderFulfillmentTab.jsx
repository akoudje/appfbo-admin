// src/components/orders/detail/OrderFulfillmentTab.jsx

function Field({ label, children }) {
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

export default function OrderFulfillmentTab({
  order,
  saving,
  canFulfill,
  deliveryTracking,
  setDeliveryTracking,
  fulfillNote,
  setFulfillNote,
  onFulfill,
}) {
  const status = order?.status;

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="font-semibold">Clôture / Livraison</div>
        <div className="text-sm text-gray-500">
          Finalisation de la commande après retrait ou livraison effective.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Statut commande" value={status || "—"} />
          <Row
            label="Clôturée par"
            value={order?.fulfilledBy || "—"}
          />
          <Row
            label="Date clôture"
            value={
              order?.fulfilledAt
                ? new Date(order.fulfilledAt).toLocaleString("fr-FR")
                : "—"
            }
          />
          <Row
            label="Tracking existant"
            value={order?.deliveryTracking || "—"}
          />
        </div>
      </div>

      {status === "READY" && (
        <Alert tone="emerald" title="Commande prête à être clôturée">
          Le colis est prêt. Tu peux maintenant confirmer le retrait ou la livraison
          pour passer la commande en <b>FULFILLED</b>.
        </Alert>
      )}

      {status !== "READY" && status !== "FULFILLED" && (
        <Alert tone="gray" title="Clôture non disponible">
          La clôture est disponible uniquement quand la commande est <b>READY</b>.
        </Alert>
      )}

      {status === "FULFILLED" && (
        <Alert tone="blue" title="Commande déjà clôturée">
          Cette commande a déjà été finalisée.
        </Alert>
      )}

      <div className="card p-4 space-y-4">
        <div className="font-semibold">Informations de livraison / retrait</div>

        <Field label="Tracking livraison (optionnel)">
          <input
            className="input"
            value={deliveryTracking}
            onChange={(e) => setDeliveryTracking(e.target.value)}
            placeholder="TRACK123..."
            disabled={!canFulfill || saving}
          />
        </Field>

        <Field label="Note de clôture (optionnel)">
          <textarea
            className="input min-h-[110px]"
            value={fulfillNote}
            onChange={(e) => setFulfillNote(e.target.value)}
            placeholder="Retiré sur site / livré au client..."
            disabled={!canFulfill || saving}
          />
        </Field>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            className="btn-primary"
            onClick={onFulfill}
            disabled={!canFulfill || saving}
          >
            {saving ? "..." : "Clôturer (retiré/livré)"}
          </button>

          <span className="text-xs text-gray-500">
            Actif si statut = READY
          </span>
        </div>
      </div>
    </div>
  );
}