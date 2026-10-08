import { useCallback, useEffect, useRef, useState } from "react";
import { ordersService } from "../../services/ordersService";
import { as400GatewayService } from "../../services/as400GatewayService";
import { ordersScopeKey } from "./useOrdersScope";

export default function useOrderDetail({
  id,
  scope,
  onHydrate,
  loadMessages,
  loadAs400,
}) {
  const key = `${scope}:${id}`;
  const [data, setData] = useState({
    key: "",
    order: null,
    error: "",
    info: "",
    loading: true,
    refreshing: false,
  });
  const [auxiliary, setAuxiliary] = useState({
    key: "",
    messages: [],
    requests: [],
    errors: [],
  });
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false),
    hydratedKey = useRef(""),
    hydrate = useRef(onHydrate);
  const request = useRef(0),
    controller = useRef(null),
    auxiliaryRequest = useRef(0),
    currentKey = useRef(key);
  useEffect(() => {
    hydrate.current = onHydrate;
  }, [onHydrate]);
  const isCurrentOrder = useCallback(
    () => currentKey.current === key && ordersScopeKey() === scope,
    [key, scope],
  );
  const load = useCallback(
    async (options = {}) => {
      if (!isCurrentOrder()) return;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      const sequence = ++request.current;
      setData((previous) =>
        previous.key === key
          ? {
              ...previous,
              error: "",
              refreshing: true,
              loading: !previous.order,
            }
          : {
              key,
              order: null,
              error: "",
              info: "",
              refreshing: true,
              loading: true,
            },
      );
      try {
        const order = await ordersService.getById(id, { signal: abort.signal });
        if (
          abort.signal.aborted ||
          sequence !== request.current ||
          !isCurrentOrder()
        )
          return;
        if (order?.id !== id)
          throw new Error("La réponse ne correspond pas à cette commande.");
        const shouldHydrate =
          hydratedKey.current !== key ||
          options.resetDrafts ||
          (!dirtyRef.current && !options.preserveFormDrafts);
        if (shouldHydrate) {
          hydrate.current(order);
          hydratedKey.current = key;
          dirtyRef.current = false;
          setDirty(false);
        }
        setData((previous) => ({
          ...previous,
          key,
          order,
          loading: false,
          refreshing: false,
          error: "",
          loadedAt: new Date().toISOString(),
        }));
      } catch (error) {
        if (
          abort.signal.aborted ||
          sequence !== request.current ||
          !isCurrentOrder()
        )
          return;
        setData((previous) => ({
          ...previous,
          key,
          order: null,
          loading: false,
          refreshing: false,
          error:
            error?.response?.data?.message ||
            error.message ||
            "Impossible de charger la commande.",
        }));
      }
    },
    [id, key, isCurrentOrder],
  );
  useEffect(() => {
    currentKey.current = key;
    dirtyRef.current = false;
    load();
    const primarySequence = request,
      secondarySequence = auxiliaryRequest,
      keyHolder = currentKey;
    return () => {
      keyHolder.current = "";
      primarySequence.current++;
      secondarySequence.current++;
      controller.current?.abort();
    };
  }, [key, load]);
  const reloadAuxiliary = useCallback(async () => {
    if (!isCurrentOrder()) return;
    const sequence = ++auxiliaryRequest.current;
    const results = await Promise.allSettled([
      loadMessages ? ordersService.getMessages(id) : Promise.resolve([]),
      loadAs400
        ? as400GatewayService.listRequests({ preorderId: id, take: 10 })
        : Promise.resolve({ items: [] }),
    ]);
    if (sequence !== auxiliaryRequest.current || !isCurrentOrder()) return;
    const errors = [];
    if (results[0].status === "rejected")
      errors.push("Historique des notifications indisponible.");
    if (results[1].status === "rejected")
      errors.push("Historique AS400 indisponible.");
    setAuxiliary({
      key,
      messages:
        results[0].status === "fulfilled" && Array.isArray(results[0].value)
          ? results[0].value
          : [],
      requests:
        results[1].status === "fulfilled" &&
        Array.isArray(results[1].value?.items)
          ? results[1].value.items
          : [],
      errors,
    });
  }, [id, key, isCurrentOrder, loadMessages, loadAs400]);
  const visibleOrder = data.key === key ? data.order : null;
  const visibleId = visibleOrder?.id,
    visibleRevision = visibleOrder?.updatedAt;
  const visibleLoadedAt = data.key === key ? data.loadedAt : null;
  useEffect(() => {
    if (visibleId && (loadMessages || loadAs400)) reloadAuxiliary();
  }, [
    visibleRevision,
    visibleLoadedAt,
    visibleId,
    loadMessages,
    loadAs400,
    reloadAuxiliary,
  ]);
  const setValue = useCallback(
    (field, value) => {
      if (!isCurrentOrder()) return;
      setData((previous) =>
        previous.key === key
          ? {
              ...previous,
              [field]:
                typeof value === "function" ? value(previous[field]) : value,
            }
          : previous,
      );
    },
    [key, isCurrentOrder],
  );
  const markDirty = useCallback((event) => {
    if (event?.target?.dataset?.draft === "false") return;
    if (event && !event.target?.matches?.("input, select, textarea")) return;
    dirtyRef.current = true;
    setDirty(true);
  }, []);
  return {
    order: visibleOrder,
    loading: data.key !== key || data.loading,
    refreshing: data.key === key && data.refreshing,
    error: data.key === key ? data.error : "",
    info: data.key === key ? data.info : "",
    loadedAt: data.key === key ? data.loadedAt : null,
    messages: auxiliary.key === key ? auxiliary.messages : [],
    as400Requests: auxiliary.key === key ? auxiliary.requests : [],
    auxiliaryErrors: auxiliary.key === key ? auxiliary.errors : [],
    reloadAuxiliary,
    load,
    dirty: hydratedKey.current === key && dirty,
    markDirty,
    isCurrentOrder,
    setOrder: (value) => setValue("order", value),
    setError: (value) => setValue("error", value),
    setInfo: (value) => setValue("info", value),
  };
}
