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

const PAYMENT_STATUS_OPTIONS = [
  { value: "", label: "Tous les paiements" },
  { value: "UNPAID", label: "Non payé" },
  { value: "PAYMENT_PENDING", label: "Paiement en attente" },
  { value: "PAID", label: "Payé" },
  { value: "FAILED", label: "Échec paiement" },
];

const BILLING_WORK_STATUS_OPTIONS = [
  { value: "", label: "Toute la facturation" },
  { value: "QUEUED", label: "En file" },
  { value: "ASSIGNED", label: "Assignée" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "WAITING_CUSTOMER_DATA", label: "Attente infos client" },
  { value: "WAITING_PAYMENT", label: "Attente paiement" },
  { value: "ESCALATED", label: "Escaladée" },
  { value: "RELEASED", label: "Relâchée" },
  { value: "DONE", label: "Terminée" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Toutes priorités" },
  { value: "LOW", label: "Faible" },
  { value: "NORMAL", label: "Normale" },
  { value: "HIGH", label: "Haute" },
  { value: "URGENT", label: "Urgente" },
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
    filters.paymentStatus,
    filters.billingWorkStatus,
    filters.priority,
    filters.as400Reference,
    filters.as400Amount,
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="relative">
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
              className="block w-full pl-9 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Rechercher par numéro FBO, nom, facture..."
              value={localQ}
              onChange={(e) => setLocalQ(e.target.value)}
            />
            {localQ && (
              <button
                onClick={() => setLocalQ("")}
                className="absolute inset-y-0 right-0 pr-3 text-gray-400 hover:text-gray-600"
                type="button"
              >
                ✕
              </button>
            )}
          </div>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filters.status || ""}
            onChange={(e) => onFilterChange({ status: e.target.value })}
          >
            {ORDER_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filters.paymentStatus || ""}
            onChange={(e) => onFilterChange({ paymentStatus: e.target.value })}
          >
            {PAYMENT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filters.billingWorkStatus || ""}
            onChange={(e) => onFilterChange({ billingWorkStatus: e.target.value })}
          >
            {BILLING_WORK_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filters.priority || ""}
            onChange={(e) => onFilterChange({ priority: e.target.value })}
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Référence AS400"
            value={filters.as400Reference || ""}
            onChange={(e) => onFilterChange({ as400Reference: e.target.value })}
          />

          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            inputMode="numeric"
            placeholder="Montant AS400"
            value={filters.as400Amount || ""}
            onChange={(e) => onFilterChange({ as400Amount: e.target.value })}
          />

          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            type="date"
            value={filters.dateFrom || ""}
            onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
          />

          <input
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            type="date"
            value={filters.dateTo || ""}
            min={filters.dateFrom || undefined}
            onChange={(e) => onFilterChange({ dateTo: e.target.value })}
          />

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filters.sort || "createdAt"}
            onChange={(e) => onFilterChange({ sort: e.target.value })}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                Trier par : {option.label}
              </option>
            ))}
          </select>

          <select
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            value={filters.dir || "desc"}
            onChange={(e) => onFilterChange({ dir: e.target.value })}
          >
            <option value="desc">Décroissant</option>
            <option value="asc">Croissant</option>
          </select>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 lg:col-span-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={!!filters.lateWaveReview}
                onChange={(e) =>
                  onFilterChange({
                    lateWaveReview: e.target.checked,
                    ...(e.target.checked
                      ? {
                          status: "",
                          paymentStatus: "",
                          billingWorkStatus: "",
                        }
                      : {}),
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
              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
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

              {filters.paymentStatus && (
                <FilterChip
                  tone="green"
                  onRemove={() => onFilterChange({ paymentStatus: "" })}
                >
                  Paiement: {filters.paymentStatus}
                </FilterChip>
              )}

              {filters.billingWorkStatus && (
                <FilterChip
                  tone="purple"
                  onRemove={() => onFilterChange({ billingWorkStatus: "" })}
                >
                  Facturation: {filters.billingWorkStatus}
                </FilterChip>
              )}

              {filters.priority && (
                <FilterChip
                  tone="amber"
                  onRemove={() => onFilterChange({ priority: "" })}
                >
                  Priorité: {filters.priority}
                </FilterChip>
              )}

              {filters.q && (
                <FilterChip onRemove={() => onFilterChange({ q: "" })}>
                  Recherche: {filters.q}
                </FilterChip>
              )}

              {filters.as400Reference && (
                <FilterChip onRemove={() => onFilterChange({ as400Reference: "" })}>
                  AS400: {filters.as400Reference}
                </FilterChip>
              )}

              {filters.as400Amount && (
                <FilterChip onRemove={() => onFilterChange({ as400Amount: "" })}>
                  Montant AS400: {filters.as400Amount}
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
