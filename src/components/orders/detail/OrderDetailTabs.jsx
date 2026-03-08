// src/components/orders/detail/OrderDetailTabs.jsx

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

const TABS = [
  { key: "overview", label: "Vue d’ensemble" },
  { key: "billing", label: "Facturation" },
  { key: "payment", label: "Paiement" },
  { key: "preparation", label: "Préparation" },
  { key: "fulfillment", label: "Clôture / Livraison" },
  { key: "history", label: "Historique" },
  { key: "cancel", label: "Annulation", danger: true },
];

export default function OrderDetailTabs({ activeTab, onChange, order }) {
  const status = order?.status;

  const tabs = TABS.filter((tab) => {
    if (tab.key === "cancel") {
      return status && !["FULFILLED", "CANCELLED"].includes(status);
    }
    return true;
  });

  return (
    <div className="card p-2">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={cx(
                "px-3 py-2 rounded-xl text-sm font-medium border transition",
                active
                  ? tab.danger
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : tab.danger
                    ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}