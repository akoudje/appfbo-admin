// admin-app/src/components/preparation/PreparationQueueAlerts.jsx
// Affichage des alertes (erreur ou info) liées à la file de préparation, par exemple lors de la prise en charge d'une commande ou d'une erreur lors de l'action de préparation.

export default function PreparationQueueAlerts({ error, info }) {
  return (
    <>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-semibold">Erreur</div>
          <div>{error}</div>
        </div>
      ) : null}

      {info ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <div className="font-semibold">Information</div>
          <div>{info}</div>
        </div>
      ) : null}
    </>
  );
}