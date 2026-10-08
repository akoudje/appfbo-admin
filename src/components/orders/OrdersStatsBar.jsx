import { ORDER_STATUSES } from "../../lib/orders/orderPresentation";
export default function OrdersStatsBar({ totalCount, stats, loading }) {
  return (
    <section
      aria-label="Répartition des commandes filtrées"
      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-gray-600">
          <strong className="mr-2 text-2xl text-gray-950">
            {loading ? "…" : totalCount}
          </strong>{" "}
          commandes dans cette vue
        </p>
        <p className="text-xs text-gray-500">
          Répartition sur tous les résultats filtrés
        </p>
      </div>
      <div className="mt-4 hidden gap-2 sm:grid sm:grid-cols-4 xl:grid-cols-8">
        {Object.entries(ORDER_STATUSES)
          .filter(([key]) => key !== "PAYMENT_PROOF_RECEIVED")
          .map(([key, value]) => (
            <div key={key} className="rounded-xl bg-gray-50 px-3 py-2">
              <span className="block text-xs text-gray-600">{value.label}</span>
              <strong className="mt-1 block text-lg text-gray-900">
                {loading || !stats ? "—" : stats.statusCounts?.[key] || 0}
              </strong>
            </div>
          ))}
      </div>
      <details className="mt-3 sm:hidden">
        <summary className="cursor-pointer text-xs font-medium text-gray-600">
          Voir la répartition par statut
        </summary>{" "}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {Object.entries(ORDER_STATUSES)
            .filter(([key]) => key !== "PAYMENT_PROOF_RECEIVED")
            .map(([key, value]) => (
              <div key={key} className="rounded-xl bg-gray-50 px-3 py-2">
                <span className="block text-xs text-gray-600">
                  {value.label}
                </span>
                <strong className="mt-1 block text-lg text-gray-900">
                  {loading || !stats ? "—" : stats.statusCounts?.[key] || 0}
                </strong>
              </div>
            ))}
        </div>
      </details>
    </section>
  );
}
