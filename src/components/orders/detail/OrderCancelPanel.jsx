// src/components/orders/detail/OrderCancelPanel.jsx

function Alert({ tone = "red", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`card p-3 border ${tones[tone] || tones.red}`}>
      {title ? <div className="font-semibold text-sm mb-1">{title}</div> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

export default function OrderCancelPanel({
  order,
  saving,
  canCancel,
  cancelReason,
  setCancelReason,
  onCancel,
}) {
  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-2">
        <div className="font-semibold text-red-700">Annulation</div>
        <div className="text-sm text-gray-500">
          Action exceptionnelle. Utiliser uniquement en cas d’erreur, abandon,
          rupture ou incident.
        </div>
      </div>

      <Alert tone="red" title="Attention">
        L’annulation est irréversible.  
        Si la commande a déjà été préparée, le stock sera réintégré automatiquement
        par le backend.
      </Alert>

      <div className="card p-4 space-y-4">
        <div className="font-semibold">Motif d’annulation</div>

        <Field label="Motif (obligatoire)">
          <textarea
            className="input min-h-[110px]"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Paiement non reçu / erreur / rupture stock..."
            disabled={!canCancel || saving}
          />
        </Field>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            className="btn"
            onClick={onCancel}
            disabled={!canCancel || saving}
          >
            {saving ? "..." : "Annuler la commande"}
          </button>

          <span className="text-xs text-gray-500">
            Actif tant que la commande n’est pas clôturée ou déjà annulée
          </span>
        </div>
      </div>

      {order?.cancelReason ? (
        <div className="card p-4 space-y-2">
          <div className="font-semibold">Dernier motif enregistré</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {order.cancelReason}
          </div>
        </div>
      ) : null}
    </div>
  );
}