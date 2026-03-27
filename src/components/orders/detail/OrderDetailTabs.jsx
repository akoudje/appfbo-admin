// src/components/orders/detail/OrderDetailTabs.jsx
// Composant de navigation par onglets pour la page de détail d'une commande, affichant les différentes sections (Aperçu, Workflow, Facturation, etc.) et gérant l'état de l'onglet actif.

export default function OrderDetailTabs({
  activeTab,
  onChange,
  order,
  availableTabs = null,
}) {
  const tabs = (availableTabs && availableTabs.length
    ? availableTabs
    : [
        { key: "overview", label: "Aperçu" },
        { key: "workflow", label: "Workflow" },
        { key: "billing", label: "Facturation" },
        { key: "payment", label: "Paiement" },
        { key: "preparation", label: "Préparation" },
        { key: "fulfillment", label: "Clôture" },
        { key: "history", label: "Historique" },
      ]).slice();

  if (
    !availableTabs &&
    order?.status !== "FULFILLED" &&
    order?.status !== "CANCELLED"
  ) {
    tabs.push({ key: "cancel", label: "Annulation" });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => onChange(tab.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
