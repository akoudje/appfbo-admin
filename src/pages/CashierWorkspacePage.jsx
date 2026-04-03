import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAdminAuth from "../hooks/useAdminAuth";
import { cashierService } from "../services/cashierService";
import { ordersService } from "../services/ordersService";
import SoundAlertControls from "../components/common/SoundAlertControls";
import useSoundAlerts from "../hooks/useSoundAlerts";
import useRealtimeAlerts from "../hooks/useRealtimeAlerts";

const CASHIER_PRESET_STORAGE_PREFIX = "cashier_workspace_preset_v2";

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
    // Ignore storage failures.
  }
}

function formatFcfa(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function humanizeEnum(value) {
  if (!value) return "-";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function mergeRowsById(groups = []) {
  const map = new Map();
  groups.flat().forEach((row) => {
    if (row?.id) map.set(row.id, row);
  });
  return Array.from(map.values());
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function TabButton({ active, children, onClick, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-gray-900 text-white"
          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span>{children}</span>
      {typeof count === "number" ? (
        <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15" : "bg-gray-100"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function QuickButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (["PAID", "READY", "FULFILLED"].includes(s)) return "bg-emerald-100 text-emerald-700";
  if (["PAYMENT_PENDING", "INVOICED"].includes(s)) return "bg-amber-100 text-amber-700";
  if (s === "CANCELLED") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function ProcessingTable({ rows, busyId, onCashPay, onVerify, onPrepare, onSyncWave, onOpenDetails }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Commande</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Aucune commande.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const paymentMode = String(row.preorderPaymentMode || "").toUpperCase();
                const isCash = paymentMode.includes("ESPE") || paymentMode.includes("CASH");
                const isWave = String(row.paymentProvider || "").toUpperCase() === "WAVE";
                const canCashPay = isCash && row.paymentStatus !== "PAID";
                const canVerify = !isCash && !isWave && row.status === "PAYMENT_PENDING" && row.paymentStatus !== "PAID";
                const canPrepare = row.status === "PAID";
                const canSyncWave = isWave && row.paymentStatus !== "PAID";
                const disabled = busyId === row.id;

                return (
                  <tr key={row.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.parcelNumber || row.preorderNumber || row.factureReference || row.id}</div>
                      <div className="text-xs text-gray-500">{row.factureReference || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.fboNomComplet || "-"}</div>
                      <div className="text-xs text-gray-500">FBO {row.fboNumero || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{humanizeEnum(row.preorderPaymentMode)}</div>
                      <div className="text-xs text-gray-500">{row.paymentProvider || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{formatFcfa(row.amountExpectedFcfa || row.totalFcfa)}</div>
                      <div className="text-xs text-gray-500">Facturée le {formatDateTime(row.invoicedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(row.paymentStatus || row.status)}`}>
                        {humanizeEnum(row.paymentStatus || row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canCashPay ? (
                          <button type="button" onClick={() => onCashPay(row)} disabled={disabled} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Encaisser</button>
                        ) : null}
                        {canVerify ? (
                          <button type="button" onClick={() => onVerify(row)} disabled={disabled} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Confirmer</button>
                        ) : null}
                        {canSyncWave ? (
                          <button type="button" onClick={() => onSyncWave(row)} disabled={disabled} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">Sync Wave</button>
                        ) : null}
                        {canPrepare ? (
                          <button type="button" onClick={() => onPrepare(row)} disabled={disabled} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Lancer prep</button>
                        ) : null}
                        <button type="button" onClick={() => onOpenDetails(row.id)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">Détails</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArchiveTable({ rows, emptyLabel, onOpenDetails, onOpenOrder }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Commande</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">{emptyLabel}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{row.parcelNumber || row.preorderNumber || row.factureReference || row.id}</div>
                    <div className="text-xs text-gray-500">{humanizeEnum(row.status)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.fboNomComplet || "-"}</div>
                    <div className="text-xs text-gray-500">FBO {row.fboNumero || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{humanizeEnum(row.preorderPaymentMode)}</div>
                    <div className="text-xs text-gray-500">{humanizeEnum(row.paymentStatus)} / {row.paymentProvider || "-"}</div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatFcfa(row.totalFcfa)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div>Créée: {formatDateTime(row.createdAt)}</div>
                    <div>Payée: {formatDateTime(row.paidAt)}</div>
                    <div>Prête: {formatDateTime(row.preparedAt)}</div>
                    <div>Clôturée: {formatDateTime(row.fulfilledAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onOpenDetails(row.id)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">Détails</button>
                      <button type="button" onClick={() => onOpenOrder(row.id)} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white">Fiche</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OrderDrawer({ open, loading, order, onClose, onOpenOrder }) {
  if (!open) return null;

  const items = Array.isArray(order?.items) ? order.items : [];
  const attempt = order?.activePayment?.attempts?.[0] || null;
  const cashierTx = order?.cashierTransactions?.[0] || null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Détail commande caisse</h3>
            <div className="text-xs text-gray-500">Consultation complète après encaissement incluse</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">Fermer</button>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-500">Chargement...</div>
        ) : !order ? (
          <div className="p-4 text-sm text-gray-500">Aucune donnée.</div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryCard label="Commande" value={order.parcelNumber || order.preorderNumber || order.id} />
              <SummaryCard label="Montant" value={formatFcfa(order.totalFcfa)} />
            </div>

            <div className="rounded-xl border border-gray-200 p-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div><strong>Client:</strong> {order.fboNomComplet || "-"} (FBO {order.fboNumero || "-"})</div>
                <div><strong>Statut:</strong> {humanizeEnum(order.status)} / {humanizeEnum(order.paymentStatus)}</div>
                <div><strong>Mode paiement:</strong> {humanizeEnum(order.preorderPaymentMode)} ({order.paymentProvider || "-"})</div>
                <div><strong>Téléphone payeur:</strong> {attempt?.providerPayerPhone || "-"}</div>
                <div><strong>N° reçu caisse:</strong> {cashierTx?.receiptNumber || "-"}</div>
                <div><strong>Poste caisse:</strong> {cashierTx?.cashDeskLabel || "-"}</div>
                <div><strong>Facture:</strong> {order.factureReference || "-"}</div>
                <div><strong>Paiement confirmé:</strong> {formatDateTime(order.paidAt)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200">
              <div className="border-b bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">Produits de la commande</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Produit</th>
                      <th className="px-3 py-2">Qté</th>
                      <th className="px-3 py-2">Total ligne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-500">Aucun produit</td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-mono text-xs">{item.productSkuSnapshot || item.product?.sku || "-"}</td>
                          <td className="px-3 py-2">{item.productNameSnapshot || item.product?.nom || "Produit"}</td>
                          <td className="px-3 py-2 font-semibold">{Number(item.qty || 0)}</td>
                          <td className="px-3 py-2">{formatFcfa(item.lineTotalFcfa)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onOpenOrder(order.id)} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">
                Ouvrir la fiche complète
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function CashierWorkspacePage() {
  const navigate = useNavigate();
  const { admin, role } = useAdminAuth();
  const presetStorageKey = useMemo(() => `${CASHIER_PRESET_STORAGE_PREFIX}:${role || "UNKNOWN"}`, [role]);
  const searchDebounceInitializedRef = useRef(false);
  const loadRef = useRef(null);
  const firstAlertLoadRef = useRef(true);
  const previousAlertSnapshotRef = useRef(null);
  const sound = useSoundAlerts("cashier");

  useRealtimeAlerts({
    onEvent: (event) => {
      const eventKey = String(event?.eventKey || "");
      if (eventKey === "cashier_collect_new") {
        sound.notify("cashier_collect_new", {
          signature: `rt:${eventKey}:${event?.orderId || event?.at || ""}`,
          cooldownMs: 20000,
        });
        loadRef.current?.({ silent: true });
        return;
      }
      if (eventKey === "cashier_launch_new") {
        sound.notify("cashier_launch_new", {
          signature: `rt:${eventKey}:${event?.orderId || event?.at || ""}`,
          cooldownMs: 15000,
        });
        loadRef.current?.({ silent: true });
      }
    },
  });

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [activeTab, setActiveTab] = useState("processing");
  const [quickPreset, setQuickPreset] = useState("ALL");

  const [query, setQuery] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [completedRows, setCompletedRows] = useState([]);
  const [searchRows, setSearchRows] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState(null);

  const toCollect = workspace?.toCollect || [];
  const toLaunchPreparation = workspace?.toLaunchPreparation || [];

  const load = async (overrides = {}) => {
    const silent = Boolean(overrides.silent);
    try {
      if (!silent) setLoading(true);
      setError("");
      const qValue = overrides.query ?? query;
      const paymentModeValue = overrides.paymentMode ?? paymentMode;
      const fromValue = overrides.dateFrom ?? dateFrom;
      const toValue = overrides.dateTo ?? dateTo;

      const common = {
        q: qValue || undefined,
        paymentMode: paymentModeValue || undefined,
        dateFrom: fromValue || undefined,
        dateTo: toValue || undefined,
      };

      const [workspaceRes, paidRes, readyRes, fulfilledRes, searchRes] = await Promise.all([
        cashierService.getWorkspace(common),
        ordersService.getAll({ ...common, status: "PAID", page: 1, pageSize: 60, sort: "updatedAt", dir: "desc" }),
        ordersService.getAll({ ...common, status: "READY", page: 1, pageSize: 60, sort: "updatedAt", dir: "desc" }),
        ordersService.getAll({ ...common, status: "FULFILLED", page: 1, pageSize: 60, sort: "updatedAt", dir: "desc" }),
        qValue?.trim()
          ? ordersService.getAll({ ...common, page: 1, pageSize: 80, sort: "updatedAt", dir: "desc" })
          : Promise.resolve({ data: [] }),
      ]);

      const defaultScope = !qValue && !paymentModeValue && !fromValue && !toValue;

      if (!defaultScope) {
        firstAlertLoadRef.current = true;
        previousAlertSnapshotRef.current = null;
      } else {
        const snapshot = {
          toCollect: new Set((workspaceRes?.toCollect || []).map((row) => row.id)),
          toLaunch: new Set((workspaceRes?.toLaunchPreparation || []).map((row) => row.id)),
        };

        if (!firstAlertLoadRef.current && previousAlertSnapshotRef.current) {
          const prev = previousAlertSnapshotRef.current;
          const newCollectCount = [...snapshot.toCollect].filter((id) => !prev.toCollect.has(id)).length;
          const newLaunchCount = [...snapshot.toLaunch].filter((id) => !prev.toLaunch.has(id)).length;

          if (newLaunchCount > 0) {
            sound.notify("cashier_launch_new", {
              signature: `launch:${newLaunchCount}:${snapshot.toLaunch.size}`,
              cooldownMs: 30000,
            });
          } else if (newCollectCount > 0) {
            sound.notify("cashier_collect_new", {
              signature: `collect:${newCollectCount}:${snapshot.toCollect.size}`,
              cooldownMs: 45000,
            });
          }
        }

        firstAlertLoadRef.current = false;
        previousAlertSnapshotRef.current = snapshot;
      }

      setWorkspace(workspaceRes);
      setCompletedRows(mergeRowsById([paidRes?.data || [], readyRes?.data || [], fulfilledRes?.data || []]));
      setSearchRows(Array.isArray(searchRes?.data) ? searchRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger l'espace caisse.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const savedPreset = safeReadStorage(presetStorageKey, "ALL");
    const today = getTodayIsoDate();
    if (savedPreset === "TODAY") {
      setQuickPreset("TODAY");
      setPaymentMode("");
      setDateFrom(today);
      setDateTo(today);
      load({ paymentMode: "", dateFrom: today, dateTo: today });
      return;
    }
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
    setQuickPreset("ALL");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    load({ paymentMode: "", dateFrom: "", dateTo: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetStorageKey]);

  useEffect(() => {
    safeWriteStorage(presetStorageKey, quickPreset);
  }, [presetStorageKey, quickPreset]);

  const applyPreset = (preset) => {
    const today = getTodayIsoDate();
    if (preset === "TODAY") {
      setQuickPreset("TODAY");
      setPaymentMode("");
      setDateFrom(today);
      setDateTo(today);
      load({ paymentMode: "", dateFrom: today, dateTo: today });
      return;
    }
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
    setQuickPreset("ALL");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    load({ paymentMode: "", dateFrom: "", dateTo: "" });
  };

  const runAction = async (orderId, action) => {
    try {
      setBusyId(orderId);
      setError("");
      setInfo("");
      await action();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Action impossible.");
    } finally {
      setBusyId("");
    }
  };

  const askCashCollection = (row) => {
    const receiptNumber = window.prompt("Numéro de reçu caisse", row?.cashierTransaction?.receiptNumber || row?.factureReference || "");
    if (!receiptNumber || !String(receiptNumber).trim()) return null;

    const cashDeskLabel = window.prompt("Poste de caisse", row?.cashierTransaction?.cashDeskLabel || "Caisse principale") || "";

    const amountReceivedFcfa = window.prompt("Montant reçu (FCFA)", String(row?.amountExpectedFcfa || row?.totalFcfa || ""));
    if (!amountReceivedFcfa || !String(amountReceivedFcfa).trim()) return null;

    return {
      receiptNumber: String(receiptNumber).trim(),
      cashDeskLabel: String(cashDeskLabel || "").trim() || undefined,
      amountReceivedFcfa: String(amountReceivedFcfa).trim(),
    };
  };

  const openDetails = async (orderId) => {
    try {
      setDrawerOpen(true);
      setDrawerLoading(true);
      const data = await ordersService.getById(orderId);
      setDrawerOrder(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le détail commande.");
    } finally {
      setDrawerLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Espace Caisse</h1>
          <p className="mt-1 text-sm text-gray-500">Interface simplifiée: traiter, consulter les terminées, rechercher toute commande.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="font-semibold text-gray-900">{admin?.fullName || "Caissière"}</div>
          <div className="text-gray-500">{humanizeEnum(role)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="À encaisser" value={workspace?.collectionSummary?.total || 0} hint="Paiements à traiter" />
        <SummaryCard label="À lancer préparation" value={workspace?.launchSummary?.total || 0} hint="Déjà payées" />
        <SummaryCard label="Terminées" value={completedRows.length} hint="Payées, prêtes, clôturées" />
      </div>

      <SoundAlertControls
        title="Alertes sonores caisse"
        description="Alerte sur nouvelles commandes à encaisser et à transmettre en préparation."
        sound={sound}
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, facture, précommande, colis, téléphone, reçu"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm xl:col-span-2"
          />
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm">
            <option value="">Tous paiements</option>
            <option value="ESPECES">Espèces</option>
            <option value="WAVE">Wave</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          <input type="date" min={dateFrom || undefined} value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm" />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <QuickButton active={quickPreset === "ALL"} onClick={() => applyPreset("ALL")}>Tous</QuickButton>
          <QuickButton active={quickPreset === "TODAY"} onClick={() => applyPreset("TODAY")}>Aujourd'hui</QuickButton>
          <QuickButton active={quickPreset === "CASH"} onClick={() => applyPreset("CASH")}>Espèces</QuickButton>
          <QuickButton active={quickPreset === "WAVE"} onClick={() => applyPreset("WAVE")}>Wave</QuickButton>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={load} disabled={loading} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Chargement..." : "Actualiser"}</button>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setPaymentMode("");
              setDateFrom("");
              setDateTo("");
              setQuickPreset("ALL");
              load({ query: "", paymentMode: "", dateFrom: "", dateTo: "" });
            }}
            disabled={loading}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={activeTab === "processing"} onClick={() => setActiveTab("processing")} count={toCollect.length + toLaunchPreparation.length}>À traiter</TabButton>
        <TabButton active={activeTab === "completed"} onClick={() => setActiveTab("completed")} count={completedRows.length}>Terminées</TabButton>
        <TabButton active={activeTab === "search"} onClick={() => setActiveTab("search")} count={searchRows.length}>Recherche</TabButton>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{info}</div> : null}

      {activeTab === "processing" ? (
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">À encaisser / confirmer</h2>
            <ProcessingTable
              rows={toCollect}
              busyId={busyId}
              onOpenDetails={openDetails}
              onCashPay={(row) =>
                runAction(row.id, async () => {
                  const payload = askCashCollection(row);
                  if (!payload) throw new Error("Encaissement annulé.");
                  await ordersService.pay(row.id, {
                    reference: row.factureReference || row.preorderNumber || row.id,
                    note: "Encaissement espèces depuis l'espace caisse",
                    ...payload,
                  });
                  setInfo("Paiement espèces enregistré.");
                })
              }
              onVerify={(row) =>
                runAction(row.id, async () => {
                  await ordersService.verifyPayment(row.id, {
                    note: "Paiement confirmé depuis l'espace caisse",
                  });
                  setInfo("Paiement confirmé.");
                })
              }
              onPrepare={(row) =>
                runAction(row.id, async () => {
                  await cashierService.prepareForPacking(row.id, {
                    packingNote: "Commande validée par la caisse pour préparation",
                  });
                  setInfo("Commande transmise au préparateur.");
                })
              }
              onSyncWave={(row) =>
                runAction(row.id, async () => {
                  await ordersService.syncWavePaymentStatus(row.id);
                  setInfo("Statut Wave synchronisé.");
                })
              }
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">À lancer en préparation</h2>
            <ProcessingTable
              rows={toLaunchPreparation}
              busyId={busyId}
              onOpenDetails={openDetails}
              onCashPay={() => {}}
              onVerify={() => {}}
              onPrepare={(row) =>
                runAction(row.id, async () => {
                  await cashierService.prepareForPacking(row.id, {
                    packingNote: "Commande validée par la caisse pour préparation",
                  });
                  setInfo("Commande transmise au préparateur.");
                })
              }
              onSyncWave={() => {}}
            />
          </section>
        </div>
      ) : null}

      {activeTab === "completed" ? (
        <ArchiveTable
          rows={completedRows}
          emptyLabel="Aucune commande terminée avec ces filtres."
          onOpenDetails={openDetails}
          onOpenOrder={(id) => navigate(`/orders/${id}?tab=payment`)}
        />
      ) : null}

      {activeTab === "search" ? (
        <ArchiveTable
          rows={searchRows}
          emptyLabel={query?.trim() ? "Aucun résultat pour cette recherche." : "Saisis une recherche pour interroger toutes les commandes."}
          onOpenDetails={openDetails}
          onOpenOrder={(id) => navigate(`/orders/${id}?tab=payment`)}
        />
      ) : null}

      <OrderDrawer
        open={drawerOpen}
        loading={drawerLoading}
        order={drawerOrder}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerOrder(null);
        }}
        onOpenOrder={(id) => navigate(`/orders/${id}?tab=payment`)}
      />
    </div>
  );
}
