// admin-app/src/components/billing/BillingQueueTabs.jsx
// Composant d'affichage des onglets de la file de facturation.

function TabButton({ active, children, onClick, tone = "default", count = null }) {
  const isUrgent = tone === "urgent";
  const activeClass = isUrgent
    ? "border-red-600 bg-red-600 text-white shadow-sm"
    : "border-blue-600 bg-blue-600 text-white";
  const inactiveClass = isUrgent
    ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
    : "border-gray-100 bg-gray-100 text-gray-700 hover:bg-gray-200";

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
        active ? activeClass : inactiveClass
      }`}
      type="button"
    >
      <span>{children}</span>
      {typeof count === "number" && count > 0 ? (
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
            active
              ? "bg-white/20 text-white"
              : isUrgent
                ? "bg-red-600 text-white"
                : "bg-white text-gray-700"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function BillingQueueTabs({
  tab,
  setTab,
  isBillingManager = false,
  stats = {},
}) {
  const urgentCount = Number(stats.escalated || 0);
  const hasUrgencies = urgentCount > 0;
  const queueLabel = isBillingManager ? "Vue globale" : "File commune";
  const tabItems = [
    hasUrgencies
      ? {
          key: "escalated",
          label: "Urgences / contentieux",
          tone: "urgent",
          count: urgentCount,
        }
      : null,
    { key: "queue", label: queueLabel },
    { key: "my", label: isBillingManager ? "Activité facturiers" : "Mes dossiers" },
    { key: "waiting-payment", label: "En attente paiement" },
    !hasUrgencies
      ? {
          key: "escalated",
          label: "Urgences / contentieux",
          tone: "urgent",
          count: urgentCount,
        }
      : null,
  ].filter(Boolean);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {tabItems.map((item) => (
          <TabButton
            key={item.key}
            active={tab === item.key}
            onClick={() => setTab(item.key)}
            tone={item.tone}
            count={item.count}
          >
            {item.label}
          </TabButton>
        ))}
      </div>
    </div>
  );
}
