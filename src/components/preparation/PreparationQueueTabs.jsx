// admin-app/src/components/preparation/PreparationQueueTabs.jsx
// Component d'affichage des onglets de la file de préparation, permettant de filtrer les commandes à préparer, prêtes ou clôturées.

function TabButton({ active, children, onClick, count }) {
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
      <span>{children}</span>
      {typeof count === "number" ? (
        <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20 text-white" : "bg-white text-gray-700"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function PreparationQueueTabs({ tab, setTab, stats }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        <TabButton
          active={tab === "to-prepare"}
          onClick={() => setTab("to-prepare")}
          count={stats?.toPrepare || 0}
        >
          À préparer
        </TabButton>

        <TabButton active={tab === "ready"} onClick={() => setTab("ready")} count={stats?.ready || 0}>
          À clôturer
        </TabButton>

        <TabButton
          active={tab === "fulfilled"}
          onClick={() => setTab("fulfilled")}
          count={stats?.fulfilled || 0}
        >
          Clôturées
        </TabButton>
      </div>
    </div>
  );
}
