// admin-app/src/components/preparation/PreparationQueueHeader.jsx
// composant d'affichage de l'en-tête de la page de la file de préparation, avec le titre, la description et le bouton de rafraîchissement. Prend en props le statut de chargement et la fonction de rafraîchissement.

export default function PreparationQueueHeader({ loading, onRefresh }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Préparation</h1>
          <p className="mt-1 text-sm text-gray-500">
            Espace de suivi des commandes à préparer, prêtes et clôturées.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            type="button"
          >
            {loading ? "Chargement..." : "Rafraîchir"}
          </button>
        </div>
      </div>
    </div>
  );
}