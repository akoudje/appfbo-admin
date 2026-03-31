// admin-app/src/pages/preparation/PreparationQueuePage.jsx
// Page d'affichage de la file de préparation, avec les stats, les onglets et le tableau. Gère les actions de préparation des commandes.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ordersService } from "../../services/ordersService";
import PreparationQueueHeader from "../../components/preparation/PreparationQueueHeader";
import PreparationQueueAlerts from "../../components/preparation/PreparationQueueAlerts";
import PreparationQueueStats from "../../components/preparation/PreparationQueueStats";
import PreparationQueueTabs from "../../components/preparation/PreparationQueueTabs";
import PreparationQueueTable from "../../components/preparation/PreparationQueueTable";
import useAdminAuth from "../../hooks/useAdminAuth";

const PREPARATION_PRESET_STORAGE_PREFIX = "preparation_queue_preset_v1";

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function safeReadStorage(key, fallback = "ALL") {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch (_) {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    // Ignore storage failures (private mode, quota, etc.).
  }
}

export default function PreparationQueuePage() {
  const navigate = useNavigate();
  const { role } = useAdminAuth();
  const searchDebounceInitializedRef = useRef(false);
  const presetStorageKey = useMemo(
    () => `${PREPARATION_PRESET_STORAGE_PREFIX}:${role || "UNKNOWN"}`,
    [role],
  );

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tab, setTab] = useState("to-prepare");
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickPreset, setQuickPreset] = useState("ALL");

  const load = async (overrides = {}) => {
    try {
      setLoading(true);
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

      setRows(Array.from(uniqueMap.values()));
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de charger la file de préparation",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  const handleOpen = (row) => {
    const targetTab = row.status === "READY" ? "fulfillment" : "preparation";
    navigate(`/orders/${row.id}?tab=${targetTab}`);
  };

  const handlePrepare = async (row) => {
    const targetTab = row.status === "READY" ? "fulfillment" : "preparation";
    navigate(`/orders/${row.id}?tab=${targetTab}`);
  };

  return (
    <div className="space-y-4">
      <PreparationQueueHeader loading={loading} onRefresh={load} stats={stats} />

      <PreparationQueueAlerts error={error} info={info} />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="N° colis, précommande, FBO ou facture"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm xl:col-span-2"
          />
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous paiements</option>
            <option value="ESPECES">Espèces</option>
            <option value="WAVE">Wave</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            min={dateFrom || undefined}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
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
        <div className="mt-3 flex flex-wrap gap-2">
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

      <PreparationQueueTabs tab={tab} setTab={setTab} stats={stats} />

      <PreparationQueueTable
        rows={filteredRows}
        loading={loading || !!actionLoadingId}
        onOpen={handleOpen}
        onPrepare={handlePrepare}
      />
    </div>
  );
}
