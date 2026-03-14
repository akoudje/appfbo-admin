// admin-app/src/components/billing/BillingQueueAlerts.jsx
// Composant d'affichage des alertes (erreur ou info) liées à la gestion de la file de facturation. Affiche un message d'erreur en rouge ou un message d'information en bleu selon les props reçues.

export default function BillingQueueAlerts({ error, info }) {
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