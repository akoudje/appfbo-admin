// admin-app/src/pages/billing/BillingQueuePage.jsx
// Page d'affichage de la file de facturation, avec les stats, les onglets et le tableau. 
// Gère les actions de prise en charge, démarrage, libération et escalade des dossiers de facturation.

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ordersService } from "../../services/ordersService";
import useAdminAuth from "../../hooks/useAdminAuth";
import BillingQueueHeader from "../../components/billing/BillingQueueHeader";
import BillingQueueAlerts from "../../components/billing/BillingQueueAlerts";
import BillingQueueStats from "../../components/billing/BillingQueueStats";
import BillingQueueTabs from "../../components/billing/BillingQueueTabs";
import BillingQueueTable from "../../components/billing/BillingQueueTable";
import SoundAlertControls from "../../components/common/SoundAlertControls";
import useSoundAlerts from "../../hooks/useSoundAlerts";
import useRealtimeAlerts from "../../hooks/useRealtimeAlerts";
import { ackRealtimeAlertPlayback } from "../../services/realtimeAlertsService";

const BILLING_PRESET_STORAGE_PREFIX = "billing_queue_preset_v1";

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

export default function BillingQueuePage() {
  const navigate = useNavigate();
  const { admin, role } = useAdminAuth();
  const currentAdminId = admin?.id || null;
  const searchDebounceInitializedRef = useRef(false);
  const loadRef = useRef(null);
  const firstAlertLoadRef = useRef(true);
  const previousAlertSnapshotRef = useRef(null);
  const presetStorageKey = useMemo(
    () => `${BILLING_PRESET_STORAGE_PREFIX}:${role || "UNKNOWN"}`,
    [role],
  );
  const sound = useSoundAlerts("billing");

  useRealtimeAlerts({
    onEvent: async (event) => {
      const eventKey = String(event?.eventKey || "");
      if (eventKey === "billing_escalated_new") {
        const played = await sound.notify("billing_escalated_new", {
          signature: `rt:${eventKey}:${event?.orderId || event?.at || ""}`,
          cooldownMs: 15000,
        });
        if (played) {
          ackRealtimeAlertPlayback({
            workspace: "billing",
            eventKey,
            orderId: event?.orderId || null,
            played: true,
          }).catch(() => {});
        }
        loadRef.current?.({ silent: true });
        return;
      }
      if (eventKey === "billing_queue_new") {
        const played = await sound.notify("billing_queue_new", {
          signature: `rt:${eventKey}:${event?.orderId || event?.at || ""}`,
          cooldownMs: 20000,
        });
        if (played) {
          ackRealtimeAlertPlayback({
            workspace: "billing",
            eventKey,
            orderId: event?.orderId || null,
            played: true,
          }).catch(() => {});
        }
        loadRef.current?.({ silent: true });
      }
    },
  });

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tab, setTab] = useState(
    role === "BILLING_MANAGER" ? "queue" : "my",
  );
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickPreset, setQuickPreset] = useState("ALL");

  const load = async (overrides = {}) => {
    const silent = Boolean(overrides.silent);
    try {
      if (!silent) setLoading(true);
      setError("");
      const qValue = overrides.query ?? query;
      const priorityValue = overrides.priority ?? priority;
      const dateFromValue = overrides.dateFrom ?? dateFrom;
      const dateToValue = overrides.dateTo ?? dateTo;
      const commonFilters = {
        page: 1,
        pageSize: 100,
        q: qValue || undefined,
        billingPriority: priorityValue || undefined,
        dateFrom: dateFromValue || undefined,
        dateTo: dateToValue || undefined,
      };

      const [myData, queueData, waitingPaymentData, escalatedData] = await Promise.all([
        ordersService.getAll({
          ...commonFilters,
          assignedToMe: true,
          sort: "billingSlaDeadlineAt",
          dir: "asc",
        }),
        ordersService.getAll({
          ...commonFilters,
          billingWorkStatus: "QUEUED",
          sort: "billingQueueEnteredAt",
          dir: "asc",
        }),
        ordersService.getAll({
          ...commonFilters,
          billingWorkStatus: "WAITING_PAYMENT",
          sort: "billingLastActivityAt",
          dir: "asc",
        }),
        ordersService.getAll({
          ...commonFilters,
          billingWorkStatus: "ESCALATED",
          sort: "billingEscalatedAt",
          dir: "asc",
        }),
      ]);

      const merged = [
        ...(myData?.data || []),
        ...(queueData?.data || []),
        ...(waitingPaymentData?.data || []),
        ...(escalatedData?.data || []),
      ];

      const uniqueMap = new Map();
      merged.forEach((row) => {
        uniqueMap.set(row.id, row);
      });

      const nextRows = Array.from(uniqueMap.values());
      const defaultScope =
        !qValue && !priorityValue && !dateFromValue && !dateToValue;

      if (!defaultScope) {
        firstAlertLoadRef.current = true;
        previousAlertSnapshotRef.current = null;
      } else {
        const snapshot = {
          queue: new Set(
            nextRows
              .filter((r) => ["QUEUED", "RELEASED"].includes(r.billingWorkStatus))
              .map((r) => r.id),
          ),
          escalated: new Set(
            nextRows
              .filter((r) => r.billingWorkStatus === "ESCALATED")
              .map((r) => r.id),
          ),
        };

        if (!firstAlertLoadRef.current && previousAlertSnapshotRef.current) {
          const prev = previousAlertSnapshotRef.current;
          const newQueueCount = [...snapshot.queue].filter((id) => !prev.queue.has(id)).length;
          const newEscalatedCount = [...snapshot.escalated].filter(
            (id) => !prev.escalated.has(id),
          ).length;

          if (newEscalatedCount > 0) {
            sound.notify("billing_escalated_new", {
              signature: `esc:${newEscalatedCount}:${snapshot.escalated.size}`,
              cooldownMs: 30000,
            });
          } else if (newQueueCount > 0) {
            sound.notify("billing_queue_new", {
              signature: `queue:${newQueueCount}:${snapshot.queue.size}`,
              cooldownMs: 45000,
            });
          }
        }

        firstAlertLoadRef.current = false;
        previousAlertSnapshotRef.current = snapshot;
      }

      setRows(nextRows);
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de charger la file de facturation",
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
    if (savedPreset === "URGENT") {
      setQuickPreset("URGENT");
      setPriority("URGENT");
      setDateFrom("");
      setDateTo("");
      load({ priority: "URGENT", dateFrom: "", dateTo: "" });
      return;
    }
    if (savedPreset === "TODAY") {
      const today = getTodayIsoDate();
      setQuickPreset("TODAY");
      setPriority("");
      setDateFrom(today);
      setDateTo(today);
      load({ priority: "", dateFrom: today, dateTo: today });
      return;
    }
    setQuickPreset("ALL");
    setPriority("");
    setDateFrom("");
    setDateTo("");
    load({ priority: "", dateFrom: "", dateTo: "" });
  }, [presetStorageKey]);

  useEffect(() => {
    safeWriteStorage(presetStorageKey, quickPreset);
  }, [presetStorageKey, quickPreset]);

  const applyQuickPreset = (preset) => {
    const today = getTodayIsoDate();
    if (preset === "URGENT") {
      setQuickPreset("URGENT");
      setPriority("URGENT");
      setDateFrom("");
      setDateTo("");
      load({ priority: "URGENT", dateFrom: "", dateTo: "" });
      return;
    }
    if (preset === "TODAY") {
      setQuickPreset("TODAY");
      setPriority("");
      setDateFrom(today);
      setDateTo(today);
      load({ priority: "", dateFrom: today, dateTo: today });
      return;
    }
    setQuickPreset("ALL");
    setPriority("");
    setDateFrom("");
    setDateTo("");
    load({ priority: "", dateFrom: "", dateTo: "" });
  };

  const handleClearFilters = () => {
    setQuickPreset("ALL");
    setQuery("");
    setPriority("");
    setDateFrom("");
    setDateTo("");
    load({
      query: "",
      priority: "",
      dateFrom: "",
      dateTo: "",
    });
  };

  const filteredRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    const isMine = (row) =>
      Boolean(currentAdminId) && row?.assignedInvoicerId === currentAdminId;

    if (tab === "queue") {
      return rows.filter((r) => ["QUEUED", "RELEASED"].includes(r.billingWorkStatus));
    }

    if (tab === "waiting-payment") {
      return rows.filter((r) => r.billingWorkStatus === "WAITING_PAYMENT");
    }

    if (tab === "escalated") {
      return rows.filter((r) => r.billingWorkStatus === "ESCALATED");
    }

    return rows.filter(
      (r) =>
        isMine(r) &&
        ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER_DATA", "WAITING_PAYMENT"].includes(
          r.billingWorkStatus,
        ),
    );
  }, [rows, tab, currentAdminId]);

  const stats = useMemo(() => {
    const all = Array.isArray(rows) ? rows : [];
    const isMine = (row) =>
      Boolean(currentAdminId) && row?.assignedInvoicerId === currentAdminId;

    return {
      queue: all.filter((r) => ["QUEUED", "RELEASED"].includes(r.billingWorkStatus)).length,
      my: all.filter(
        (r) =>
          isMine(r) &&
          ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER_DATA", "WAITING_PAYMENT"].includes(
            r.billingWorkStatus,
          ),
      ).length,
      waitingPayment: all.filter((r) => r.billingWorkStatus === "WAITING_PAYMENT").length,
      escalated: all.filter((r) => r.billingWorkStatus === "ESCALATED").length,
    };
  }, [rows, currentAdminId]);

  const handleOpen = (row) => {
    navigate(`/orders/${row.id}?tab=billing`);
  };

  const handleClaimNext = async () => {
    try {
      setClaiming(true);
      setError("");
      setInfo("");

      const result = await ordersService.claimNextBilling();

      if (result?.ok && result?.preorder?.id) {
        setInfo("Dossier attribué avec succès.");
        await load();
        navigate(`/orders/${result.preorder.id}?tab=billing`);
        return;
      }

      if (result?.reason === "NO_ORDER_AVAILABLE") {
        setInfo("Aucun dossier disponible dans la file.");
        return;
      }

      if (result?.reason === "MAX_ACTIVE_REACHED") {
        setInfo(
          `Limite atteinte : ${result.activeCount}/${result.maxActive} dossiers actifs.`,
        );
        return;
      }

      setInfo("Aucun dossier attribué.");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de prendre le prochain dossier",
      );
    } finally {
      setClaiming(false);
    }
  };

  const handleStart = async (row) => {
    try {
      setError("");
      setInfo("");
      await ordersService.startBilling(row.id);
      setInfo("Traitement démarré.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de démarrer le traitement");
    }
  };

  const handleRelease = async (row) => {
    try {
      setError("");
      setInfo("");
      await ordersService.releaseBilling(row.id, {
        reason: "Libéré depuis la file de facturation",
      });
      setInfo("Dossier remis dans la file.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de libérer le dossier");
    }
  };

  const handleEscalate = async (row) => {
    try {
      setError("");
      setInfo("");
      await ordersService.escalateBilling(row.id, {
        reason: "Escaladé depuis la file de facturation",
      });
      setInfo("Dossier escaladé.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d’escalader le dossier");
    }
  };

  return (
    <div className="space-y-4">
      <BillingQueueHeader
        loading={loading}
        claiming={claiming}
        onRefresh={load}
        onClaimNext={handleClaimNext}
      />

      <BillingQueueAlerts error={error} info={info} />

      <SoundAlertControls
        title="Alertes sonores facturation"
        description="Alerte sur nouveaux dossiers en file et sur escalades."
        sound={sound}
      />

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
              className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Toutes priorités</option>
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
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
              onClick={() => applyQuickPreset("URGENT")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                quickPreset === "URGENT"
                  ? "bg-red-600 text-white"
                  : "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
              }`}
              type="button"
            >
              Urgent
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
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={load}
              disabled={loading || claiming}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              type="button"
            >
              {loading ? "Chargement..." : "Appliquer"}
            </button>
            <button
              onClick={handleClearFilters}
              disabled={loading || claiming}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              type="button"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      <BillingQueueStats stats={stats} />

      <BillingQueueTabs tab={tab} setTab={setTab} />

      <BillingQueueTable
        rows={filteredRows}
        loading={loading}
        currentAdminId={currentAdminId}
        onOpen={handleOpen}
        onStart={handleStart}
        onRelease={handleRelease}
        onEscalate={handleEscalate}
      />
    </div>
  );
}
