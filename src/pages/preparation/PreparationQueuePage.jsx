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
import FulfillNoNotificationDialog from "../../components/preparation/FulfillNoNotificationDialog";
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

const MAX_QUEUE_PAGES = 20; // Garde-fou : jusqu'à 2000 commandes par statut, au-delà on tronque plutôt que de bloquer la page.

// Filtres serveur par onglet. "to-prepare" reste toujours chargé intégralement (voir `load()`)
// car c'est la file surveillée par les alertes sonores/temps réel, quel que soit l'onglet affiché.
const TAB_QUERY_PARAMS = {
  "to-prepare": { status: "PAID", paymentStatus: "PAID", sort: "preparationLaunchedAt", dir: "asc" },
  ready: { status: "READY", sort: "preparedAt", dir: "asc" },
  fulfilled: { status: "FULFILLED", sort: "fulfilledAt", dir: "asc" },
};

async function fetchAllOrderPages(baseParams) {
  const first = await ordersService.getAll({ ...baseParams, page: 1, pageSize: 100 });
  const totalPages = Math.min(first?.totalPages || 1, MAX_QUEUE_PAGES);
  const data = [...(first?.data || [])];

  if (totalPages > 1) {
    const restPages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        ordersService.getAll({ ...baseParams, page: i + 2, pageSize: 100 }),
      ),
    );
    restPages.forEach((page) => data.push(...(page?.data || [])));
  }

  return data;
}

// Ne récupère que le total d'un onglet (pour son badge de compteur), sans en télécharger les lignes.
// pageSize est plafonné à 10 côté API : c'est le minimum, largement suffisant puisqu'on n'utilise
// que `totalCount` de la réponse.
async function fetchTabCount(baseParams, tabKey) {
  const res = await ordersService.getAll({
    ...baseParams,
    ...TAB_QUERY_PARAMS[tabKey],
    page: 1,
    pageSize: 10,
  });
  return Number(res?.totalCount || 0);
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
  const [stats, setStats] = useState({ toPrepare: 0, ready: 0, fulfilled: 0, total: 0 });
  const [query, setQuery] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickPreset, setQuickPreset] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [fulfillDialog, setFulfillDialog] = useState(null); // { mode: "single" | "bulk", order?, orders? }
  const [fulfillDialogError, setFulfillDialogError] = useState("");
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
    const targetTab = overrides.tab ?? tab;
    try {
      if (!silent) setLoading(true);
      setError("");
      const qValue = overrides.query ?? query;
      const paymentModeValue = overrides.paymentMode ?? paymentMode;
      const dateFromValue = overrides.dateFrom ?? dateFrom;
      const dateToValue = overrides.dateTo ?? dateTo;
      const commonFilters = {
        q: qValue || undefined,
        preorderPaymentMode: paymentModeValue || undefined,
        dateFrom: dateFromValue || undefined,
        dateTo: dateToValue || undefined,
      };

      // On ne télécharge intégralement que "à préparer" (toujours, pour les alertes) et l'onglet
      // actif (pour l'affichage). Les autres onglets n'ont besoin que de leur total pour le badge.
      const fullTabKeys = Array.from(new Set(["to-prepare", targetTab]));
      const lightTabKeys = Object.keys(TAB_QUERY_PARAMS).filter(
        (key) => !fullTabKeys.includes(key),
      );

      const [fullEntries, lightEntries] = await Promise.all([
        Promise.all(
          fullTabKeys.map((key) =>
            fetchAllOrderPages({ ...commonFilters, ...TAB_QUERY_PARAMS[key] }).then((data) => [
              key,
              data,
            ]),
          ),
        ),
        Promise.all(
          lightTabKeys.map((key) =>
            fetchTabCount(commonFilters, key).then((total) => [key, total]),
          ),
        ),
      ]);

      const fullByTab = Object.fromEntries(fullEntries);
      const countByTab = Object.fromEntries(lightEntries);

      const uniqueMap = new Map();
      Object.values(fullByTab).forEach((tabRows) => {
        tabRows.forEach((row) => uniqueMap.set(row.id, row));
      });
      const nextRows = Array.from(uniqueMap.values());

      const nextStats = {
        toPrepare: fullByTab["to-prepare"]?.length ?? countByTab["to-prepare"] ?? 0,
        ready: fullByTab.ready?.length ?? countByTab.ready ?? 0,
        fulfilled: fullByTab.fulfilled?.length ?? countByTab.fulfilled ?? 0,
      };
      nextStats.total = nextStats.toPrepare + nextStats.ready + nextStats.fulfilled;

      const defaultScope = !qValue && !paymentModeValue && !dateFromValue && !dateToValue;

      if (!defaultScope) {
        firstAlertLoadRef.current = true;
        previousAlertSnapshotRef.current = null;
      } else {
        const toPrepareRows = fullByTab["to-prepare"] || [];
        const snapshot = {
          toPrepare: new Set(
            toPrepareRows
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
      setStats(nextStats);
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de charger la file de préparation",
      );
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Ajuste `rows`/`stats` immédiatement après une clôture, sans attendre un rechargement réseau.
  // `load({ silent: true })` est ensuite appelé en tâche de fond pour recaler l'état exact.
  const applyOptimisticFulfill = (closedRows) => {
    if (!closedRows.length) return;
    const closedIds = new Set(closedRows.map((r) => r.id));
    setRows((prev) => prev.filter((r) => !closedIds.has(r.id)));
    setStats((prev) => {
      const next = { ...prev };
      closedRows.forEach((r) => {
        const bucket = r.status === "READY" ? "ready" : "toPrepare";
        next[bucket] = Math.max(0, (next[bucket] || 0) - 1);
      });
      next.fulfilled = (next.fulfilled || 0) + closedRows.length;
      return next;
    });
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

  const canFulfillNoNotification = [
    AdminRole.SUPER_ADMIN,
    AdminRole.TECH_ADMIN,
    AdminRole.OPERATIONS_DIRECTOR,
  ].includes(role);

  const setTab = (nextTab) => {
    if (nextTab === tab) return;
    setSelectedIds(new Set());
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
    // "rows" ne contient que "à préparer" + l'onglet jusqu'ici actif : il faut recharger
    // pour obtenir les lignes complètes du nouvel onglet (son total était déjà connu via `stats`).
    load({ tab: nextTab });
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

  const handleFulfillNoNotification = (row) => {
    setFulfillDialogError("");
    setFulfillDialog({ mode: "single", order: row });
  };

  const confirmFulfillNoNotification = async (note) => {
    const row = fulfillDialog?.order;
    if (!row) return;
    const label = row.parcelNumber || row.preorderNumber || row.id;

    try {
      setActionLoadingId(row.id);
      setFulfillDialogError("");
      setError("");
      setInfo("");
      await ordersService.fulfillNoNotification(row.id, {
        note:
          note?.trim() ||
          "Commande déjà livrée physiquement. Clôture admin depuis la file de préparation, sans notification.",
      });
      setFulfillDialog(null);
      setInfo(`Commande ${label} clôturée sans notification.`);
      applyOptimisticFulfill([row]);
      load({ silent: true });
    } catch (e) {
      setFulfillDialogError(
        e?.response?.data?.message ||
          "Impossible de clôturer la commande sans notification.",
      );
    } finally {
      setActionLoadingId("");
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = (ids, checked) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const handleInvertSelection = () => {
    const selectableIds = filteredRows
      .filter((row) => row.status === "READY")
      .map((row) => row.id);
    setSelectedIds((prev) => new Set(selectableIds.filter((id) => !prev.has(id))));
  };

  const handleBulkFulfillNoNotification = () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const selectedOrders = ids
      .map((id) => rows.find((r) => r.id === id))
      .filter(Boolean);
    setFulfillDialogError("");
    setFulfillDialog({ mode: "bulk", orders: selectedOrders });
  };

  const confirmBulkFulfillNoNotification = async (note) => {
    const orders = fulfillDialog?.orders || [];
    if (orders.length === 0) return;

    setActionLoadingId("bulk");
    setFulfillDialogError("");
    setError("");
    setInfo("");

    const closedRows = [];
    const failures = [];

    for (const row of orders) {
      const label = row?.parcelNumber || row?.preorderNumber || row?.id;
      try {
        await ordersService.fulfillNoNotification(row.id, {
          note:
            note?.trim() ||
            "Commande déjà livrée physiquement. Clôture admin groupée depuis la file de préparation, sans notification.",
        });
        closedRows.push(row);
      } catch (e) {
        failures.push(`${label}: ${e?.response?.data?.message || "erreur"}`);
      }
    }

    setActionLoadingId("");
    setSelectedIds(new Set());
    setFulfillDialog(null);
    applyOptimisticFulfill(closedRows);

    if (failures.length > 0) {
      setError(
        `${closedRows.length} commande(s) clôturée(s), ${failures.length} échec(s) — ${failures.join(" | ")}`,
      );
    } else {
      setInfo(`${closedRows.length} commande(s) clôturée(s) sans notification.`);
    }

    load({ silent: true });
  };

  const handleBulkRelaunch = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    const targets = ids.map((id) => rows.find((r) => r.id === id)).filter(Boolean);
    if (targets.length === 0) return;

    const confirmed = window.confirm(
      `Relancer ${targets.length} client${targets.length > 1 ? "s" : ""} par SMS/email pour venir récupérer leur colis ?`,
    );
    if (!confirmed) return;

    setActionLoadingId("bulk-relaunch");
    setError("");
    setInfo("");

    let relaunched = 0;
    let skipped = 0;
    const failures = [];

    for (const row of targets) {
      const label = row?.parcelNumber || row?.preorderNumber || row?.id;
      try {
        const result = await ordersService.relaunchPickup(row.id);
        if (result?.relaunched) relaunched += 1;
        else skipped += 1;
      } catch (e) {
        failures.push(`${label}: ${e?.response?.data?.message || "erreur"}`);
      }
    }

    setActionLoadingId("");
    setSelectedIds(new Set());
    setInfo(
      `${relaunched} client${relaunched > 1 ? "s" : ""} relancé${relaunched > 1 ? "s" : ""}` +
        (skipped ? `, ${skipped} déjà relancé(s) aujourd'hui` : "") +
        (failures.length ? `, ${failures.length} échec(s) — ${failures.join(" | ")}` : "") +
        ".",
    );
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
            <option value="ECOBANK_PAY">Ecobank Pay</option>
            <option value="PI_SPI">PI SPI</option>
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

      {canFulfillNoNotification && tab === "ready" && selectedIds.size > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-medium">
            {selectedIds.size} commande{selectedIds.size > 1 ? "s" : ""} sélectionnée{selectedIds.size > 1 ? "s" : ""}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              disabled={!!actionLoadingId}
            >
              Désélectionner tout
            </button>
            <button
              type="button"
              onClick={handleInvertSelection}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              disabled={!!actionLoadingId}
              title="Sélectionne les commandes prêtes non cochées et décoche celles qui l'étaient"
            >
              Inverser la sélection
            </button>
            <button
              type="button"
              onClick={handleBulkRelaunch}
              className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
              disabled={!!actionLoadingId}
            >
              {actionLoadingId === "bulk-relaunch" ? "Relance en cours..." : "Relancer (sélection)"}
            </button>
            <button
              type="button"
              onClick={handleBulkFulfillNoNotification}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
              disabled={!!actionLoadingId}
            >
              {actionLoadingId === "bulk" ? "Clôture en cours..." : "Clôturer sans notif. (sélection)"}
            </button>
          </div>
        </div>
      ) : null}

      <PreparationQueueTable
        rows={filteredRows}
        loading={loading || !!actionLoadingId}
        onOpen={handleOpen}
        onPrepare={handlePrepare}
        getOrderHref={buildOrderUrl}
        onFulfillNoNotification={handleFulfillNoNotification}
        canFulfillNoNotification={canFulfillNoNotification}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
      />

      <FulfillNoNotificationDialog
        key={fulfillDialog ? `${fulfillDialog.mode}:${fulfillDialog.order?.id || fulfillDialog.orders?.map((o) => o.id).join(",")}` : "closed"}
        open={Boolean(fulfillDialog)}
        mode={fulfillDialog?.mode || "single"}
        order={fulfillDialog?.order || null}
        orders={fulfillDialog?.orders || []}
        busy={
          fulfillDialog?.mode === "bulk"
            ? actionLoadingId === "bulk"
            : Boolean(actionLoadingId) && actionLoadingId === fulfillDialog?.order?.id
        }
        error={fulfillDialogError}
        defaultNote={
          fulfillDialog?.mode === "bulk"
            ? "Commande déjà livrée physiquement. Clôture admin groupée depuis la file de préparation, sans notification."
            : "Commande déjà livrée physiquement. Clôture admin depuis la file de préparation, sans notification."
        }
        onCancel={() => {
          if (actionLoadingId) return;
          setFulfillDialog(null);
          setFulfillDialogError("");
        }}
        onConfirm={
          fulfillDialog?.mode === "bulk"
            ? confirmBulkFulfillNoNotification
            : confirmFulfillNoNotification
        }
      />
    </div>
  );
}
