// src/components/orders/detail/OrderPreparationTab.jsx

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
}