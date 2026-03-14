// admin-app/src/components/preparation/PreparationQueueTabs.jsx
// Component d'affichage des onglets de la file de préparation, permettant de filtrer les commandes à préparer, prêtes ou clôturées.

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

export default function PreparationQueueTabs({ tab, setTab }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <TabButton active={tab === "to-prepare"} onClick={() => setTab("to-prepare")}>
          À préparer
        </TabButton>

        <TabButton active={tab === "ready"} onClick={() => setTab("ready")}>
          Prêtes
        </TabButton>

        <TabButton active={tab === "fulfilled"} onClick={() => setTab("fulfilled")}>
          Clôturées
        </TabButton>
      </div>
    </div>
  );
}