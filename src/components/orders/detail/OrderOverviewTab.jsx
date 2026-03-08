// src/components/orders/detail/OrderOverviewTab.jsx

import OrderTimeline from "./OrderTimeline";
import OrderSummaryCards from "./OrderSummaryCards";
import OrderItemsTable from "./OrderItemsTable";
import OrderStockCard from "./OrderStockCard";

function Alert({ tone = "amber", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`card p-3 border ${tones[tone] || tones.amber}`}>
      {title && <div className="font-semibold text-sm mb-1">{title}</div>}
      <div className="text-sm">{children}</div>
    </div>
  );
}

export default function OrderOverviewTab({
  order,
  emptyOrder,
  steps,
  stockSummary,
  stockDebited,
  stockRestored,
}) {
  return (
    <div className="space-y-4">
      {emptyOrder && (
        <Alert tone="amber" title="Commande potentiellement incomplète">
          Cette commande contient <b>{order?.items?.length || 0} item(s)</b> et un total{" "}
          <b>
            {new Intl.NumberFormat("fr-FR").format(Number(order?.totalFcfa || 0))} FCFA
          </b>
          . Si c’est une sortie abandonnée côté FBO, recommande : <b>annuler</b> ou
          demander au FBO de recommencer.
        </Alert>
      )}

      {order?.status === "CANCELLED" && (
        <Alert tone="red" title="Commande annulée">
          <div>
            Motif : <span className="font-medium">{order?.cancelReason || "—"}</span>
          </div>
          {stockRestored ? (
            <div className="mt-1">
              Le stock a été <span className="font-medium">réintégré</span>.
            </div>
          ) : null}
        </Alert>
      )}

      {order?.status === "PAID" && !stockDebited && (
        <Alert tone="blue" title="Commande payée">
          Le paiement est confirmé. La prochaine étape est la <b>préparation</b> du colis.
          Le stock sera décrémenté au moment du passage à <b>READY</b>.
        </Alert>
      )}

      {order?.status === "READY" && stockDebited && (
        <Alert tone="emerald" title="Commande prête">
          Le colis est prêt et le stock a déjà été décrémenté.
        </Alert>
      )}

      <OrderTimeline steps={steps} status={order?.status} />

      <OrderSummaryCards order={order} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <OrderItemsTable
            items={order?.items || []}
            totalFcfa={order?.totalFcfa || 0}
          />
        </div>

        <div className="space-y-4">
          <OrderStockCard
            order={order}
            stockSummary={stockSummary}
            stockDebited={stockDebited}
            stockRestored={stockRestored}
          />

          <div className="card p-4 space-y-3">
            <div className="font-semibold">Message WhatsApp</div>

            {order?.whatsappMessage ? (
              <>
                <div className="text-xs text-gray-600 whitespace-pre-wrap border rounded-xl p-3 bg-gray-50 max-h-64 overflow-auto">
                  {order.whatsappMessage}
                </div>

                <div className="text-xs text-gray-500">
                  Message actuellement stocké dans la commande.
                </div>
              </>
            ) : (
              <div className="text-sm text-gray-500">
                Aucun message WhatsApp généré.
              </div>
            )}
          </div>

          <div className="card p-4 space-y-3">
            <div className="font-semibold">Paiement / Facture</div>

            <div className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Référence facture</span>
                <span className="font-medium text-right">
                  {order?.factureReference || "—"}
                </span>
              </div>
            </div>

            <div className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Référence paiement</span>
                <span className="font-medium text-right">
                  {order?.paymentRef || "—"}
                </span>
              </div>
            </div>

            <div className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">Lien de paiement</span>
                <span className="font-medium text-right">
                  {order?.paymentLink ? (
                    <a
                      className="underline"
                      href={order.paymentLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ouvrir
                    </a>
                  ) : (
                    "—"
                  )}
                </span>
              </div>
            </div>

            <div className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-500">WhatsApp To</span>
                <span className="font-medium text-right">
                  {order?.factureWhatsappTo || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {Array.isArray(order?.stockMovements) && order.stockMovements.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="font-semibold">Mouvements de stock</div>
            <div className="text-sm text-gray-500">
              Débit: {stockSummary?.debitQty || 0} • Crédit: {stockSummary?.creditQty || 0}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {order.stockMovements.map((m) => (
              <div key={m.id} className="rounded-xl border p-3 bg-gray-50">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
                        m.type === "DEBIT"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }`}
                    >
                      {m.type === "DEBIT" ? "Débit" : "Crédit"}
                    </span>

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