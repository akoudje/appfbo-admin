export default function OrderDetailTabs({
  activeTab,
  onChange,
  order,
  availableTabs,
}) {
  const fallback = [
    { key: "overview", label: "Résumé" },
    { key: "workflow", label: "Traitement" },
    { key: "billing", label: "Facturation" },
    { key: "payment", label: "Règlement" },
    { key: "preparation", label: "Préparation" },
    { key: "fulfillment", label: "Remise" },
    { key: "history", label: "Historique" },
    ...(!["FULFILLED", "CANCELLED"].includes(order?.status)
      ? [{ key: "cancel", label: "Annulation" }]
      : []),
  ];
  const tabs = availableTabs?.length ? availableTabs : fallback;
  const extra = tabs.filter((tab) => ["workflow", "cancel"].includes(tab.key));
  const main =
    extra.length > 1 ? tabs.filter((tab) => !extra.includes(tab)) : tabs;
  const button = (tab) => (
    <button
      type="button"
      key={tab.key}
      aria-current={activeTab === tab.key ? "page" : undefined}
      onClick={() => onChange(tab.key)}
      className={
        "rounded-lg px-3 py-2 text-sm font-medium " +
        (activeTab === tab.key
          ? "bg-gray-950 text-white"
          : "text-gray-600 hover:bg-gray-100")
      }
    >
      {tab.label}
    </button>
  );
  return (
    <nav
      aria-label="Sections du dossier"
      className="flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-2 shadow-sm"
    >
      {main.map(button)}
      {extra.length > 1 && (
        <details className="relative">
          <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-gray-600">
            Autres vues
            {extra.some((tab) => tab.key === activeTab)
              ? " · " + extra.find((tab) => tab.key === activeTab).label
              : ""}
          </summary>
          <div className="absolute right-0 z-20 mt-1 flex min-w-44 flex-col rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
            {extra.map(button)}
          </div>
        </details>
      )}
    </nav>
  );
}
