import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { ORDER_STATUSES, orderLabel } from "../../lib/orders/orderPresentation";
import { quickDateRange } from "../../lib/orders/orderFilters";
const input =
  "mt-1 block h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40";
export default function OrdersFiltersCard({
  filters,
  onFilterChange,
  onClear,
}) {
  const [search, setSearch] = useState(filters.q);
  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== filters.q) onFilterChange({ q: search });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filters.q, onFilterChange]);
  const chips = [
    ["status", filters.status && orderLabel(filters.status)],
    ["q", filters.q],
    ["dateFrom", filters.dateFrom && "Du " + filters.dateFrom],
    ["dateTo", filters.dateTo && "Au " + filters.dateTo],
    [
      "paymentStatus",
      filters.paymentStatus &&
        "Paiement : " + orderLabel(filters.paymentStatus),
    ],
    [
      "billingWorkStatus",
      filters.billingWorkStatus &&
        "Facturation : " + orderLabel(filters.billingWorkStatus),
    ],
    [
      "priority",
      filters.priority && "Priorité : " + orderLabel(filters.priority),
    ],
    ["as400Reference", filters.as400Reference],
    [
      "as400Amount",
      filters.as400Amount && "AS400 : " + filters.as400Amount + " FCFA",
    ],
    ["assignedToMe", filters.assignedToMe && "Mes dossiers"],
    ["assignedOnly", filters.assignedOnly && "Assignées"],
    ["invoicerId", filters.invoicerId && "Responsable sélectionné"],
    ["lateWaveReview", filters.lateWaveReview && "Paiement Wave tardif"],
  ].filter(([, value]) => value);
  const select = (key, label, options) => (
    <label className="text-xs font-medium text-gray-600">
      {label}
      <select
        className={input}
        value={filters[key]}
        onChange={(event) => onFilterChange({ [key]: event.target.value })}
      >
        <option value="">Tous</option>
        {options.map((value) => (
          <option value={value} key={value}>
            {orderLabel(value)}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <section
      aria-label="Filtres des commandes"
      className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="text-xs font-medium text-gray-600">
          Recherche
          <div className="relative">
            <Search
              size={16}
              aria-hidden="true"
              className="absolute left-3 top-4 text-gray-400"
            />
            <input
              className={input + " pl-9 pr-9"}
              placeholder="Précommande, colis, client, FBO, facture…"
              maxLength={200}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Effacer la recherche"
                className="absolute right-3 top-4"
                onClick={() => setSearch("")}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </label>
        {select(
          "status",
          "État de la commande",
          Object.keys(ORDER_STATUSES).filter(
            (key) => key !== "PAYMENT_PROOF_RECEIVED",
          ),
        )}
        <label className="hidden text-xs font-medium text-gray-600 sm:block">
          Du
          <input
            type="date"
            className={input}
            max={filters.dateTo || undefined}
            value={filters.dateFrom}
            onChange={(event) =>
              onFilterChange({ dateFrom: event.target.value })
            }
          />
        </label>
        <label className="hidden text-xs font-medium text-gray-600 sm:block">
          Au
          <input
            type="date"
            className={input}
            min={filters.dateFrom || undefined}
            value={filters.dateTo}
            onChange={(event) => onFilterChange({ dateTo: event.target.value })}
          />
        </label>
      </div>
      <div className="hidden flex-wrap items-end gap-3 sm:flex">
        <label className="text-xs font-medium text-gray-600">
          Trier par
          <select
            className={input}
            value={filters.sort}
            onChange={(event) =>
              onFilterChange({
                sort: event.target.value,
                dir:
                  event.target.value === "billingSlaDeadlineAt"
                    ? "asc"
                    : "desc",
              })
            }
          >
            {[
              ["createdAt", "Création"],
              ["updatedAt", "Dernière activité"],
              ["total", "Montant"],
              ["billingPriority", "Priorité"],
              ["billingSlaDeadlineAt", "Échéance de traitement"],
              ["assignedAt", "Assignation"],
            ].map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600">
          Ordre
          <select
            className={input}
            value={filters.dir}
            onChange={(event) => onFilterChange({ dir: event.target.value })}
          >
            <option value="desc">Décroissant</option>
            <option value="asc">Croissant</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-2 pb-1">
          {[
            [1, "Aujourd’hui"],
            [7, "7 jours"],
            [30, "30 jours"],
          ].map(([days, label]) => (
            <button
              type="button"
              key={days}
              onClick={() => onFilterChange(quickDateRange(days))}
              className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50"
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <details className="rounded-xl border border-gray-200 p-3 sm:hidden">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Période et tri
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="text-xs text-gray-600">
            Du
            <input
              type="date"
              className={input}
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(event) =>
                onFilterChange({ dateFrom: event.target.value })
              }
            />
          </label>
          <label className="text-xs text-gray-600">
            Au
            <input
              type="date"
              className={input}
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(event) =>
                onFilterChange({ dateTo: event.target.value })
              }
            />
          </label>
          <label className="text-xs text-gray-600">
            Trier par
            <select
              className={input}
              value={filters.sort}
              onChange={(event) =>
                onFilterChange({
                  sort: event.target.value,
                  dir:
                    event.target.value === "billingSlaDeadlineAt"
                      ? "asc"
                      : "desc",
                })
              }
            >
              {[
                ["createdAt", "Création"],
                ["updatedAt", "Activité"],
                ["total", "Montant"],
                ["billingPriority", "Priorité"],
                ["billingSlaDeadlineAt", "Échéance"],
              ].map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Ordre
            <select
              className={input}
              value={filters.dir}
              onChange={(event) => onFilterChange({ dir: event.target.value })}
            >
              <option value="desc">Décroissant</option>
              <option value="asc">Croissant</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex gap-2">
          {[
            [1, "Aujourd’hui"],
            [7, "7 jours"],
            [30, "30 jours"],
          ].map(([days, label]) => (
            <button
              type="button"
              key={days}
              onClick={() => onFilterChange(quickDateRange(days))}
              className="border border-gray-200 px-3 py-2 text-xs"
            >
              {label}
            </button>
          ))}
        </div>
      </details>
      <details className="rounded-xl border border-gray-200 p-3">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Filtres avancés
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {select("paymentStatus", "Paiement", [
            "UNPAID",
            "PAYMENT_PENDING",
            "PAID",
            "PARTIALLY_PAID",
            "REFUNDED",
          ])}
          {select("billingWorkStatus", "Facturation", [
            "NONE",
            "QUEUED",
            "ASSIGNED",
            "IN_PROGRESS",
            "WAITING_CUSTOMER_DATA",
            "WAITING_PAYMENT",
            "COMPLETED",
            "RELEASED",
            "ESCALATED",
          ])}
          {select("priority", "Priorité", ["LOW", "NORMAL", "HIGH", "URGENT"])}
          <label className="text-xs font-medium text-gray-600">
            Référence AS400
            <input
              className={input}
              value={filters.as400Reference}
              onChange={(event) =>
                onFilterChange({ as400Reference: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-medium text-gray-600">
            Montant AS400 (FCFA)
            <input
              type="number"
              min="0"
              className={input}
              value={filters.as400Amount}
              onChange={(event) =>
                onFilterChange({ as400Amount: event.target.value })
              }
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {[
            ["assignedToMe", "Mes dossiers"],
            ["assignedOnly", "Dossiers assignés"],
            ["lateWaveReview", "Paiement Wave tardif à revoir"],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters[key]}
                onChange={(event) =>
                  onFilterChange({
                    [key]: event.target.checked,
                    ...(key === "assignedToMe" && event.target.checked
                      ? { assignedOnly: false, invoicerId: "" }
                      : {}),
                    ...(key === "lateWaveReview" && event.target.checked
                      ? { status: "" }
                      : {}),
                  })
                }
              />
              {label}
            </label>
          ))}
        </div>
      </details>
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-label={"Retirer le filtre " + label}
              onClick={() =>
                onFilterChange({
                  [key]: typeof filters[key] === "boolean" ? false : "",
                })
              }
              className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
            >
              {label}
              <X size={12} />
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="px-2 text-xs font-semibold underline"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </section>
  );
}
