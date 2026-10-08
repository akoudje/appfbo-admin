export const DEFAULT_ORDER_FILTERS = {
  page: 1,
  pageSize: 20,
  status: "",
  q: "",
  dateFrom: "",
  dateTo: "",
  paymentStatus: "",
  billingWorkStatus: "",
  priority: "",
  as400Reference: "",
  as400Amount: "",
  lateWaveReview: false,
  assignedOnly: false,
  assignedToMe: false,
  invoicerId: "",
  sort: "createdAt",
  dir: "desc",
};
const booleanKeys = new Set(["lateWaveReview", "assignedOnly", "assignedToMe"]);
export function readOrderFilters(params) {
  const filters = { ...DEFAULT_ORDER_FILTERS };
  for (const key of Object.keys(filters)) {
    if (!params.has(key)) continue;
    const value = params.get(key);
    filters[key] = booleanKeys.has(key)
      ? value === "true"
      : key === "page"
        ? Math.max(1, Math.min(100000, Number.parseInt(value, 10) || 1))
        : key === "pageSize"
          ? [20, 50, 100].includes(Number(value))
            ? Number(value)
            : 20
          : value;
  }
  if (filters.sort === "priority") filters.sort = "billingPriority";
  if (
    ![
      "createdAt",
      "updatedAt",
      "total",
      "totalFcfa",
      "billingPriority",
      "billingSlaDeadlineAt",
      "billingQueueEnteredAt",
      "assignedAt",
      "preparationLaunchedAt",
      "preparedAt",
      "fulfilledAt",
    ].includes(filters.sort)
  )
    filters.sort = "createdAt";
  if (!["asc", "desc"].includes(filters.dir)) filters.dir = "desc";
  return filters;
}
export function orderFilterParams(filters) {
  const params = new URLSearchParams();
  for (const [key, defaultValue] of Object.entries(DEFAULT_ORDER_FILTERS)) {
    const value = filters[key];
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== false &&
      value !== defaultValue
    )
      params.set(key, String(value));
  }
  return params;
}
export function orderRequestParams(filters) {
  return {
    ...filters,
    billingPriority: filters.priority || undefined,
    priority: undefined,
    includeDrafts: true,
    includeCancelled: true,
  };
}
export function quickDateRange(days, today = new Date()) {
  const from = new Date(today);
  from.setDate(from.getDate() - (days - 1));
  const key = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { dateFrom: key(from), dateTo: key(today) };
}
