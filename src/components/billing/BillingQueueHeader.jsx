// admin-app/src/components/billing/BillingQueueHeader.jsx
// Composant d'affichage de l'en-tête de la page de la file de facturation, avec le titre, la description et les boutons d'action (rafraîchir et prendre le prochain dossier). Les boutons sont désactivés en fonction des props loading et claiming pour éviter les actions concurrentes.

export default function BillingQueueHeader({
  loading,
  claiming,
  onRefresh,
  onClaimNext,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Facturation</h1>
          <p className="mt-1 text-sm text-gray-500">
            Espace de travail des facturiers : queue, dossiers assignés, attente paiement, escalades.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRefresh}
            disabled={loading || claiming}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            Rafraîchir
          </button>

          <button
            onClick={onClaimNext}
            disabled={claiming}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            type="button"
          >
            {claiming ? "Attribution..." : "Prendre le prochain dossier"}
          </button>
        </div>
      </div>
    </div>
  );
}