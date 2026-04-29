// admin-app/src/components/billing/BillingQueueTabs.jsx
// Composant d'affichage des onglets de la file de facturation, avec les différentes vues (mes dossiers, file commune, en attente de paiement, escaladés). Permet de changer de vue en cliquant sur les onglets.

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-blue-600 text-white"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
      type="button"
    >
      {children}
    </button>
  );
}

export default function BillingQueueTabs({ tab, setTab, isBillingManager = false }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">

        <TabButton active={tab === "queue"} onClick={() => setTab("queue")}>
          {isBillingManager ? "Vue globale" : "File commune"}
        </TabButton>

        <TabButton active={tab === "my"} onClick={() => setTab("my")}>
          {isBillingManager ? "Activité facturiers" : "Mes dossiers"}
        </TabButton>
        
        <TabButton
          active={tab === "waiting-payment"}
          onClick={() => setTab("waiting-payment")}
        >
          En attente paiement
        </TabButton>

        <TabButton active={tab === "escalated"} onClick={() => setTab("escalated")}>
          Escaladés
        </TabButton>
      </div>
    </div>
  );
}
