// admin-app/src/components/orders/OrdersFiltersCard.jsx
// Composant d'affichage des filtres de la liste des commandes, avec des sélecteurs pour le statut, le statut de paiement, la date, etc. et des chips pour les filtres actifs.

import { useEffect, useState } from "react";

const ORDER_STATUS_OPTIONS = [
  { value: "", label: "Tous les statuts" },
  { value: "DRAFT", label: "Brouillon" },
  { value: "SUBMITTED", label: "Soumise" },
  { value: "INVOICED", label: "Préfacturée" },
  { value: "PAYMENT_PENDING", label: "Paiement en attente" },
  { value: "PAID", label: "Payée" },
  { value: "READY", label: "Colis prêt" },
  { value: "FULFILLED", label: "Clôturée" },
  { value: "CANCELLED", label: "Annulée" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Date création" },
  { value: "updatedAt", label: "Dernière mise à jour" },
  { value: "total", label: "Montant" },
  { value: "billingQueueEnteredAt", label: "Entrée file" },
  { value: "assignedAt", label: "Date assignation" },
  { value: "billingSlaDeadlineAt", label: "Échéance SLA" },
  { value: "priority", label: "Priorité" },
];

function FilterChip({ children, onRemove, tone = "blue" }) {
  const toneClass =
    tone === "green"
      ? "bg-green-50 text-green-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "purple"
          ? "bg-purple-50 text-purple-700"
          : "bg-blue-50 text-blue-700";

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs ${toneClass}`}>
      {children}
      <button onClick={onRemove} type="button">
        ✕
      </button>
    </span>
  );
}

export default function OrdersFiltersCard({ filters, onFilterChange, onClear }) {
  const [localQ, setLocalQ] = useState(filters.q || "");

  useEffect(() => {
    setLocalQ(filters.q || "");
  }, [filters.q]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localQ !== filters.q) {
        onFilterChange({ q: localQ });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localQ, filters.q, onFilterChange]);

  const hasActiveFilters = [
    filters.status,
    filters.q,
    filters.dateFrom,
    filters.dateTo,
    filters.lateWaveReview,
    filters.assignedOnly,
    filters.hasAssignee,
    filters.invoicerId,
  ].some(Boolean);

  const handleQuickDate = (range) => {
    const today = new Date();
    const from = new Date();

    if (range === "today") {
      from.setHours(0, 0, 0, 0);
    } else if (range === "week") {
      from.setDate(from.getDate() - 7);
    } else if (range === "month") {
      from.setMonth(from.getMonth() - 1);
    } else {
      return;
    }

    onFilterChange({
      dateFrom: from.toISOString().split("T")[0],
      dateTo: today.toISOString().split("T")[0],
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.5fr)_180px_150px_150px_190px]">
          <div className="relative md:col-span-2 xl:col-span-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              className="block h-10 w-full rounded-lg border border-gray-300 py-2 pl-9 pr-10 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500"
              placeholder="Rechercher par numéro FBO, nom, facture..."
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
              aria-label="Rechercher par numéro FBO, nom ou facture"
            />
            {localQ && (
              <button
                onClick={() => setLocalQ("")}
                className="absolute inset-y-0 right-0 pr-3 text-gray-400 hover:text-gray-600"
                type="button"
                aria-label="Effacer la recherche"
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            value={filters.status || ""}
            onChange={(e) => onFilterChange({ status: e.target.value })}
          >
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
          />

          <input
            className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            type="date"
            value={filters.dateTo || ""}
            min={filters.dateFrom || undefined}
            onChange={(e) => onFilterChange({ dateTo: e.target.value })}
          />

          <select
            className="h-10 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            value={filters.sort || "createdAt"}
            onChange={(e) => onFilterChange({ sort: e.target.value, dir: "desc" })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!filters.lateWaveReview}
                onChange={(e) =>
                  onFilterChange({
                    lateWaveReview: e.target.checked,
                    ...(e.target.checked ? { status: "" } : {}),
                  })
                }
              />
              Paiement Wave tardif à revoir
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!filters.assignedOnly}
                onChange={(e) =>
                  onFilterChange({
                    assignedOnly: e.target.checked,
                    ...(e.target.checked ? { hasAssignee: false, invoicerId: "" } : {}),
                  })
                }
              />
              Mes dossiers
            </label>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!filters.hasAssignee}
                onChange={(e) =>
                  onFilterChange({
                    hasAssignee: e.target.checked,
                    ...(e.target.checked ? { assignedOnly: false } : {}),
                  })
                }
                />
              Assignées
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleQuickDate("today")}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              type="button"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => handleQuickDate("week")}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              type="button"
            >
              7 jours
            </button>
            <button
              onClick={() => handleQuickDate("month")}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              type="button"
            >
              30 jours
            </button>
            <button
              onClick={onClear}
              className="px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700"
              type="button"
            >
              Effacer tout
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center pt-2">
            <div className="flex flex-wrap gap-2">
              {filters.status && (
                <FilterChip onRemove={() => onFilterChange({ status: "" })}>
                  Statut: {filters.status}
                </FilterChip>
              )}

              {filters.q && (
                <FilterChip onRemove={() => onFilterChange({ q: "" })}>
                  Recherche: {filters.q}
                </FilterChip>
              )}

              {filters.lateWaveReview && (
                <FilterChip onRemove={() => onFilterChange({ lateWaveReview: false })}>
                  Paiement Wave tardif
                </FilterChip>
              )}

              {filters.dateFrom && (
                <FilterChip onRemove={() => onFilterChange({ dateFrom: "" })}>
                  Du: {new Date(filters.dateFrom).toLocaleDateString("fr-FR")}
                </FilterChip>
              )}

              {filters.dateTo && (
                <FilterChip onRemove={() => onFilterChange({ dateTo: "" })}>
                  Au: {new Date(filters.dateTo).toLocaleDateString("fr-FR")}
                </FilterChip>
              )}

              {filters.assignedOnly && (
                <FilterChip onRemove={() => onFilterChange({ assignedOnly: false })}>
                  Mes dossiers
                </FilterChip>
              )}

              {filters.hasAssignee && (
                <FilterChip onRemove={() => onFilterChange({ hasAssignee: false })}>
                  Assignées
                </FilterChip>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
