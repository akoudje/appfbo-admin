// admin-app/src/pages/preparation/PreparationQueuePage.jsx
// Page d'affichage de la file de préparation, avec les stats, les onglets et le tableau. Gère les actions de préparation des commandes.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ordersService } from "../../services/ordersService";
import PreparationQueueHeader from "../../components/preparation/PreparationQueueHeader";
import PreparationQueueAlerts from "../../components/preparation/PreparationQueueAlerts";
import PreparationQueueStats from "../../components/preparation/PreparationQueueStats";
import PreparationQueueTabs from "../../components/preparation/PreparationQueueTabs";
import PreparationQueueTable from "../../components/preparation/PreparationQueueTable";
import useAdminAuth from "../../hooks/useAdminAuth";
import useSoundAlerts from "../../hooks/useSoundAlerts";
import useRealtimeAlerts from "../../hooks/useRealtimeAlerts";
import { ackRealtimeAlertPlayback } from "../../services/realtimeAlertsService";
import { AdminRole } from "../../auth/permissions";

const PREPARATION_PRESET_STORAGE_PREFIX = "preparation_queue_preset_v1";

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function safeReadStorage(key, fallback = "ALL") {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export default function PreparationQueuePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { role } = useAdminAuth();
  const searchDebounceInitializedRef = useRef(false);
  const loadRef = useRef(null);
  const firstAlertLoadRef = useRef(true);
  const previousAlertSnapshotRef = useRef(null);
  const presetStorageKey = useMemo(
    () => `${PREPARATION_PRESET_STORAGE_PREFIX}:${role || "UNKNOWN"}`,
    [role],
  );
  const sound = useSoundAlerts("preparation");

  useRealtimeAlerts({
    onEvent: async (event) => {
      const eventKey = String(event?.eventKey || "");
      if (eventKey !== "preparation_queue_new") return;
      const played = await sound.notify("preparation_queue_new", {
        signature: `rt:${eventKey}:${event?.orderId || event?.at || ""}`,
        cooldownMs: 15000,
      });
      raiseAttentionAlert(1, "realtime");
      if (played) {
        ackRealtimeAlertPlayback({
          workspace: "preparation",
          eventKey,
          orderId: event?.orderId || null,
          played: true,
        }).catch(() => {});
      }
      loadRef.current?.({ silent: true });
    },
  });

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [, setAttentionAlert] = useState(null);
  const [tab, setTabState] = useState(searchParams.get("tab") || "to-prepare");
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickPreset, setQuickPreset] = useState("ALL");
  const attentionTimerRef = useRef(null);

  const raiseAttentionAlert = (count = 1, source = "poll") => {
    if (attentionTimerRef.current) {
      clearTimeout(attentionTimerRef.current);
      attentionTimerRef.current = null;
    }

    const safeCount = Math.max(1, Number(count) || 1);
    setAttentionAlert({
      source,
      tone: "emerald",
      soundEventKey: "preparation_queue_new",
      title: "Nouvelle commande à préparer",
      message: `${safeCount} commande${safeCount > 1 ? "s" : ""} vient${safeCount > 1 ? "nent" : ""} d'entrer dans la file de préparation.`,
    });

    attentionTimerRef.current = setTimeout(() => {
      setAttentionAlert(null);
      attentionTimerRef.current = null;
    }, 45000);
  };

  const load = async (overrides = {}) => {
    const silent = Boolean(overrides.silent);
    try {
      if (!silent) setLoading(true);
      setError("");
      const qValue = overrides.query ?? query;
      const paymentModeValue = overrides.paymentMode ?? paymentMode;
      const dateFromValue = overrides.dateFrom ?? dateFrom;
      const dateToValue = overrides.dateTo ?? dateTo;
      const commonFilters = {
        page: 1,
        pageSize: 100,
        q: qValue || undefined,
        preorderPaymentMode: paymentModeValue || undefined,
        dateFrom: dateFromValue || undefined,
        dateTo: dateToValue || undefined,
      };

      const [paidData, readyData, fulfilledData] = await Promise.all([
        ordersService.getAll({
          ...commonFilters,
          status: "PAID",
          paymentStatus: "PAID",
          sort: "preparationLaunchedAt",
          dir: "asc",
        }),
        ordersService.getAll({
          ...commonFilters,
          status: "READY",
          sort: "preparedAt",
          dir: "asc",
        }),
        ordersService.getAll({
          ...commonFilters,
          status: "FULFILLED",
          sort: "fulfilledAt",
          dir: "asc",
        }),
      ]);

      const merged = [
        ...(paidData?.data || []),
        ...(readyData?.data || []),
        ...(fulfilledData?.data || []),
      ];

      const uniqueMap = new Map();
      merged.forEach((row) => {
        uniqueMap.set(row.id, row);
      });

      const nextRows = Array.from(uniqueMap.values());
      const defaultScope = !qValue && !paymentModeValue && !dateFromValue && !dateToValue;

      if (!defaultScope) {
        firstAlertLoadRef.current = true;
        previousAlertSnapshotRef.current = null;
      } else {
        const snapshot = {
          toPrepare: new Set(
            nextRows
              .filter((r) => r.status === "PAID" && r.preparationLaunchedAt)
              .map((r) => r.id),
          ),
        };

        if (!firstAlertLoadRef.current && previousAlertSnapshotRef.current) {
          const prev = previousAlertSnapshotRef.current;
          const newToPrepareCount = [...snapshot.toPrepare].filter(
            (id) => !prev.toPrepare.has(id),
          ).length;

          if (newToPrepareCount > 0) {
            sound.notify("preparation_queue_new", {
              signature: `prep:${newToPrepareCount}:${snapshot.toPrepare.size}`,
              cooldownMs: 35000,
            });
            raiseAttentionAlert(newToPrepareCount, "poll");
          }
        }

        firstAlertLoadRef.current = false;
        previousAlertSnapshotRef.current = snapshot;
      }

      setRows(nextRows);
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de charger la file de préparation",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      loadRef.current?.({ silent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (attentionTimerRef.current) {
        clearTimeout(attentionTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchDebounceInitializedRef.current) {
        searchDebounceInitializedRef.current = true;
        return;
      }
      load({ query });
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const savedPreset = safeReadStorage(presetStorageKey, "ALL");
    const today = getTodayIsoDate();

    if (savedPreset === "CASH") {
      setQuickPreset("CASH");
      setPaymentMode("ESPECES");
      setDateFrom("");
      setDateTo("");
      load({ paymentMode: "ESPECES", dateFrom: "", dateTo: "" });
      return;
    }
    if (savedPreset === "WAVE") {
      setQuickPreset("WAVE");
      setPaymentMode("WAVE");
      setDateFrom("");
      setDateTo("");
      load({ paymentMode: "WAVE", dateFrom: "", dateTo: "" });
      return;
    }
    if (savedPreset === "TODAY") {
      setQuickPreset("TODAY");
      setPaymentMode("");
      setDateFrom(today);
      setDateTo(today);
      load({ paymentMode: "", dateFrom: today, dateTo: today });
      return;
    }
    setQuickPreset("ALL");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    load({ paymentMode: "", dateFrom: "", dateTo: "" });
  }, [presetStorageKey]);

  useEffect(() => {
    safeWriteStorage(presetStorageKey, quickPreset);
  }, [presetStorageKey, quickPreset]);

  const applyQuickPreset = (preset) => {
    const today = getTodayIsoDate();

    if (preset === "CASH") {
      setQuickPreset("CASH");
      setPaymentMode("ESPECES");
      setDateFrom("");
      setDateTo("");
      load({ paymentMode: "ESPECES", dateFrom: "", dateTo: "" });
      return;
    }
    if (preset === "WAVE") {
      setQuickPreset("WAVE");
      setPaymentMode("WAVE");
      setDateFrom("");
      setDateTo("");
      load({ paymentMode: "WAVE", dateFrom: "", dateTo: "" });
      return;
    }
    if (preset === "TODAY") {
      setQuickPreset("TODAY");
      setPaymentMode("");
      setDateFrom(today);
      setDateTo(today);
      load({ paymentMode: "", dateFrom: today, dateTo: today });
      return;
    }
    setQuickPreset("ALL");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    load({ paymentMode: "", dateFrom: "", dateTo: "" });
  };

  const handleClearFilters = () => {
    setQuickPreset("ALL");
    setQuery("");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    load({
      query: "",
      paymentMode: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const filteredRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    if (tab === "ready") {
      return rows.filter((r) => r.status === "READY");
    }

    if (tab === "fulfilled") {
      return rows.filter((r) => r.status === "FULFILLED");
    }

    return rows.filter((r) => r.status === "PAID" && r.preparationLaunchedAt);
  }, [rows, tab]);

  const activeFilterCount = [query, paymentMode, dateFrom, dateTo].filter(Boolean).length;

  const stats = useMemo(() => {
    const all = Array.isArray(rows) ? rows : [];

    return {
      toPrepare: all.filter((r) => r.status === "PAID" && r.preparationLaunchedAt)
        .length,
      ready: all.filter((r) => r.status === "READY").length,
      fulfilled: all.filter((r) => r.status === "FULFILLED").length,
      total: all.length,
    };
  }, [rows]);

  const canFulfillNoNotification = [
    AdminRole.SUPER_ADMIN,
    AdminRole.TECH_ADMIN,
    AdminRole.OPERATIONS_DIRECTOR,
  ].includes(role);

  const setTab = (nextTab) => {
    setTabState(nextTab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextTab && nextTab !== "to-prepare") {
        next.set("tab", nextTab);
      } else {
        next.delete("tab");
      }
      return next;
    });
  };

  const buildOrderUrl = (row) => {
    const targetTab = row.status === "READY" ? "fulfillment" : "preparation";
    const params = new URLSearchParams();
    params.set("tab", targetTab);
    params.set("prepQueue", "1");
    params.set("queueTab", tab);
    params.set("queueIds", filteredRows.map((item) => item.id).filter(Boolean).join(","));
    return `/orders/${row.id}?${params.toString()}`;
  };

  const handleOpen = (row) => {
    navigate(buildOrderUrl(row));
  };

  const handlePrepare = async (row) => {
    navigate(buildOrderUrl(row));
  };

  const handleFulfillNoNotification = async (row) => {
    const label = row.parcelNumber || row.preorderNumber || row.id;
    const confirmed = window.confirm(
      `Clôturer la commande ${label} sans envoyer de SMS ni email ? Cette action sera tracée dans l'historique.`,
    );
    if (!confirmed) return;

    try {
      setActionLoadingId(row.id);
      setError("");
      setInfo("");
      await ordersService.fulfillNoNotification(row.id, {
        note:
          "Commande déjà livrée physiquement. Clôture admin depuis la file de préparation, sans notification.",
      });
      setInfo(`Commande ${label} clôturée sans notification.`);
      await load();
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de clôturer la commande sans notification.",
      );
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="space-y-4">
      <PreparationQueueHeader loading={loading} onRefresh={load} stats={stats} />

      <PreparationQueueAlerts error={error} info={info} />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="N° colis, précommande, FBO ou facture"
              className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={paymentMode}
            onChange={(e) => {
              const next = e.target.value;
              setPaymentMode(next);
              setQuickPreset("CUSTOM");
              load({ paymentMode: next });
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous paiements</option>
            <option value="ESPECES">Espèces</option>
            <option value="WAVE">Wave</option>
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="BANK_TRANSFER">Virement bancaire</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              const next = e.target.value;
              setDateFrom(next);
              setQuickPreset("CUSTOM");
              load({ dateFrom: next });
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            min={dateFrom || undefined}
            value={dateTo}
            onChange={(e) => {
              const next = e.target.value;
              setDateTo(next);
              setQuickPreset("CUSTOM");
              load({ dateTo: next });
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => applyQuickPreset("ALL")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                quickPreset === "ALL"
                  ? "bg-gray-900 text-white"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
              type="button"
            >
              Tous
            </button>
            <button
              onClick={() => applyQuickPreset("TODAY")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                quickPreset === "TODAY"
                  ? "bg-blue-600 text-white"
                  : "border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              }`}
              type="button"
            >
              Aujourd'hui
            </button>
            <button
              onClick={() => applyQuickPreset("CASH")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                quickPreset === "CASH"
                  ? "bg-emerald-600 text-white"
                  : "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
              type="button"
            >
              Espèces
            </button>
            <button
              onClick={() => applyQuickPreset("WAVE")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                quickPreset === "WAVE"
                  ? "bg-cyan-600 text-white"
                  : "border border-cyan-200 bg-cyan-50 text-cyan-700 hover:bg-cyan-100"
              }`}
              type="button"
            >
              Wave
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              type="button"
            >
              {loading ? "Chargement..." : "Appliquer"}
            </button>
            <button
              onClick={handleClearFilters}
              disabled={loading}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              type="button"
            >
              Réinitialiser
            </button>
          </div>
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
          {filteredRows.length} commande{filteredRows.length > 1 ? "s" : ""} affichée{filteredRows.length > 1 ? "s" : ""} dans l'onglet courant sur {rows.length} commande{rows.length > 1 ? "s" : ""} chargée{rows.length > 1 ? "s" : ""}
          {activeFilterCount > 0
            ? ` avec ${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""} actif${activeFilterCount > 1 ? "s" : ""}.`
            : " sans filtre actif."}
        </div>
      </div>

      <PreparationQueueTabs tab={tab} setTab={setTab} stats={stats} />

      <PreparationQueueTable
        rows={filteredRows}
        loading={loading || !!actionLoadingId}
        onOpen={handleOpen}
        onPrepare={handlePrepare}
        getOrderHref={buildOrderUrl}
        onFulfillNoNotification={handleFulfillNoNotification}
        canFulfillNoNotification={canFulfillNoNotification}
      />
    </div>
  );
}
