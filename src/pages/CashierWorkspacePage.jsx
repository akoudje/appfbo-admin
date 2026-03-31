import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAdminAuth from "../hooks/useAdminAuth";
import { AdminRole } from "../auth/permissions";
import { cashierService } from "../services/cashierService";
import { ordersService } from "../services/ordersService";

const CASHIER_PRESET_STORAGE_PREFIX = "cashier_workspace_preset_v1";

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

function formatFcfa(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function formatAge(value) {
  if (!value) return "—";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "—";
  const diffMs = Date.now() - dt.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} j`;
}

function humanizeEnum(value) {
  if (!value) return "—";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function StatusPill({ children, tone = "gray" }) {
  const tones = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-800",
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function SummaryCard({ title, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
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
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            active ? "bg-white/15 text-white" : "bg-gray-100 text-gray-700"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function QuickFilterButton({ active, children, onClick }) {
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

function MetricList({ title, rows = [], emptyLabel }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <div className="mt-3 space-y-2">
        {rows.length === 0 ? (
          <div className="text-sm text-gray-500">{emptyLabel}</div>
        ) : (
          rows.map((row) => (
            <div
              key={`${title}-${row.paymentMode || row.cashierId || row.cashierName}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900">
                  {row.paymentMode ? humanizeEnum(row.paymentMode) : row.cashierName}
                </div>
                <div className="text-xs text-gray-500">{row.count} opération(s)</div>
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {formatFcfa(row.amountFcfa)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function QueueRowActions({
  row,
  busyId,
  onCashPay,
  onVerify,
  onPrepare,
  onSyncWave,
  onPrint,
  onOpen,
}) {
  const paymentMode = String(row.preorderPaymentMode || "").toUpperCase();
  const isCash = paymentMode.includes("ESPE") || paymentMode.includes("CASH");
  const isWave = String(row.paymentProvider || "").toUpperCase() === "WAVE";
  const canCashPay = isCash && row.paymentStatus !== "PAID";
  const canVerify =
    !isCash && !isWave && row.status === "PAYMENT_PENDING" && row.paymentStatus !== "PAID";
  const canPrepare = row.status === "PAID";
  const canPrint = row.paymentStatus === "PAID";
  const canSyncWave =
    String(row.paymentProvider || "").toUpperCase() === "WAVE" &&
    row.paymentStatus !== "PAID";
  const disabled = busyId === row.id;

  return (
    <div className="flex flex-wrap gap-2">
      {canCashPay ? (
        <button
          type="button"
          onClick={() => onCashPay(row)}
          disabled={disabled}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Encaisser espèces
        </button>
      ) : null}
      {canVerify ? (
        <button
          type="button"
          onClick={() => onVerify(row)}
          disabled={disabled}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Confirmer paiement
        </button>
      ) : null}
      {canSyncWave ? (
        <button
          type="button"
          onClick={() => onSyncWave(row)}
          disabled={disabled}
          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50"
        >
          Synchroniser
        </button>
      ) : null}
      {canPrepare ? (
        <button
          type="button"
          onClick={() => onPrepare(row)}
          disabled={disabled}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Lancer préparation
        </button>
      ) : null}
      {canPrint ? (
        <button
          type="button"
          onClick={() => onPrint(row)}
          disabled={disabled}
          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
        >
          Imprimer reçu
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
      >
        Ouvrir
      </button>
    </div>
  );
}

function QueueTable(props) {
  const { rows, emptyLabel = "Aucune précommande à traiter.", ...actions } = props;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Précommande</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Ancienneté</th>
              <th className="px-4 py-3">État</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {row.parcelNumber || row.preorderNumber || row.factureReference || row.id}
                    </div>
                    <div className="text-xs text-gray-500">{row.factureReference || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.fboNomComplet || "—"}</div>
                    <div className="text-xs text-gray-500">
                      FBO {row.fboNumero || "—"} • {row.payerPhone || "N° payeur non saisi"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {humanizeEnum(row.preorderPaymentMode)}
                    </div>
                    <div className="text-xs text-gray-500">{row.paymentProvider || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {formatFcfa(row.amountExpectedFcfa)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Facturée le {formatDateTime(row.invoicedAt)}
                    </div>
                    {row.cashierTransaction?.receiptNumber ? (
                      <div className="text-xs text-gray-500">
                        Reçu {row.cashierTransaction.receiptNumber}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {formatAge(row.preparationLaunchedAt || row.paidAt || row.invoicedAt || row.createdAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      depuis {formatDateTime(row.preparationLaunchedAt || row.paidAt || row.invoicedAt || row.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <StatusPill tone={row.paymentStatus === "PAID" ? "green" : row.status === "PAID" ? "blue" : "amber"}>
                        {humanizeEnum(row.paymentStatus || row.status)}
                      </StatusPill>
                      <StatusPill tone={row.status === "PAID" ? "green" : "gray"}>
                        {humanizeEnum(row.status)}
                      </StatusPill>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Payé le {formatDateTime(row.paidAt)}
                    </div>
                    {row.cashierTransaction?.cashDeskLabel ? (
                      <div className="mt-1 text-xs text-gray-500">
                        {row.cashierTransaction.cashDeskLabel}
                      </div>
                    ) : null}
                    {row.preparationLaunchedAt ? (
                      <div className="mt-1 text-xs text-emerald-600">
                        Transmise préparation le {formatDateTime(row.preparationLaunchedAt)}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <QueueRowActions row={row} {...actions} />
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

function JournalTable({ rows, canViewAll }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Reçu / Commande</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Préparation</th>
              <th className="px-4 py-3">Ancienneté</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  Aucun paiement validé pour préparation sur cette période.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {row.parcelNumber || row.factureReference || row.preorderNumber || row.id}
                    </div>
                    <div className="text-xs text-gray-500">{row.fboNomComplet || "—"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {humanizeEnum(row.preorderPaymentMode)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {row.paymentProvider || "—"} • {row.payerPhone || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {formatFcfa(row.amountExpectedFcfa)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Payé le {formatDateTime(row.paidAt)}
                    </div>
                    {row.cashierTransaction?.receiptNumber ? (
                      <div className="text-xs text-gray-500">
                        Reçu {row.cashierTransaction.receiptNumber}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {formatDateTime(row.preparationLaunchedAt || row.preparedAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {canViewAll
                        ? `Par ${row.preparationLaunchedBy?.fullName || "—"}`
                        : "Transmis à la préparation"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {formatAge(row.preparationLaunchedAt || row.paidAt || row.createdAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      depuis {formatDateTime(row.preparationLaunchedAt || row.paidAt || row.createdAt)}
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

export default function CashierWorkspacePage() {
  const navigate = useNavigate();
  const { admin, role } = useAdminAuth();
  const searchDebounceInitializedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [workspace, setWorkspace] = useState(null);
  const [query, setQuery] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [journalScope, setJournalScope] = useState("my");
  const [activeTab, setActiveTab] = useState("collect");
  const [quickMode, setQuickMode] = useState("ALL");
  const [quickPreset, setQuickPreset] = useState("ALL");
  const presetStorageKey = useMemo(
    () => `${CASHIER_PRESET_STORAGE_PREFIX}:${role || "UNKNOWN"}`,
    [role],
  );

  const canViewConsolidated = useMemo(
    () =>
      [
        AdminRole.SUPER_ADMIN,
        AdminRole.TECH_ADMIN,
        AdminRole.OPERATIONS_DIRECTOR,
        AdminRole.COUNTER_MANAGER,
      ].includes(role),
    [role],
  );

  async function load(overrides = {}) {
    try {
      setLoading(true);
      setError("");
      const queryValue = overrides.query ?? query;
      const paymentModeValue = overrides.paymentMode ?? paymentMode;
      const dateFromValue = overrides.dateFrom ?? dateFrom;
      const dateToValue = overrides.dateTo ?? dateTo;
      const journalScopeValue = overrides.journalScope ?? journalScope;
      const data = await cashierService.getWorkspace({
        q: queryValue || undefined,
        paymentMode: paymentModeValue || undefined,
        dateFrom: dateFromValue || undefined,
        dateTo: dateToValue || undefined,
        journalScope: canViewConsolidated ? journalScopeValue : "my",
      });
      setWorkspace(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger l'espace caisse.");
    } finally {
      setLoading(false);
    }
  }

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

    if (savedPreset === "TODAY") {
      setQuickPreset("TODAY");
      setPaymentMode("");
      setDateFrom(today);
      setDateTo(today);
      setQuickMode("ALL");
      setJournalScope("my");
      load({
        paymentMode: "",
        dateFrom: today,
        dateTo: today,
        journalScope: "my",
      });
      return;
    }

    if (savedPreset === "CASH") {
      setQuickPreset("CASH");
      setPaymentMode("ESPECES");
      setDateFrom("");
      setDateTo("");
      setQuickMode("ESPECES");
      load({
        paymentMode: "ESPECES",
        dateFrom: "",
        dateTo: "",
      });
      return;
    }

    if (savedPreset === "WAVE") {
      setQuickPreset("WAVE");
      setPaymentMode("WAVE");
      setDateFrom("");
      setDateTo("");
      setQuickMode("WAVE");
      load({
        paymentMode: "WAVE",
        dateFrom: "",
        dateTo: "",
      });
      return;
    }

    setQuickPreset("ALL");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    setQuickMode("ALL");
    setJournalScope("my");
    load({
      paymentMode: "",
      dateFrom: "",
      dateTo: "",
      journalScope: "my",
    });
  }, [presetStorageKey]);

  useEffect(() => {
    safeWriteStorage(presetStorageKey, quickPreset);
  }, [presetStorageKey, quickPreset]);

  function applyQuickPreset(preset) {
    const today = getTodayIsoDate();

    if (preset === "TODAY") {
      setQuickPreset("TODAY");
      setPaymentMode("");
      setDateFrom(today);
      setDateTo(today);
      setQuickMode("ALL");
      setJournalScope("my");
      load({
        paymentMode: "",
        dateFrom: today,
        dateTo: today,
        journalScope: "my",
      });
      return;
    }

    if (preset === "CASH") {
      setQuickPreset("CASH");
      setPaymentMode("ESPECES");
      setDateFrom("");
      setDateTo("");
      setQuickMode("ESPECES");
      load({
        paymentMode: "ESPECES",
        dateFrom: "",
        dateTo: "",
      });
      return;
    }

    if (preset === "WAVE") {
      setQuickPreset("WAVE");
      setPaymentMode("WAVE");
      setDateFrom("");
      setDateTo("");
      setQuickMode("WAVE");
      load({
        paymentMode: "WAVE",
        dateFrom: "",
        dateTo: "",
      });
      return;
    }

    setQuickPreset("ALL");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    setJournalScope("my");
    setQuickMode("ALL");
    load({
      paymentMode: "",
      dateFrom: "",
      dateTo: "",
      journalScope: "my",
    });
  }

  async function runAction(orderId, action) {
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
  }

  const toCollect = workspace?.toCollect || [];
  const toLaunchPreparation = workspace?.toLaunchPreparation || [];
  const journal = workspace?.journal || [];
  const collectionSummary = workspace?.collectionSummary || {};
  const launchSummary = workspace?.launchSummary || {};
  const journalSummary = workspace?.journalSummary || {};
  const financialSummary = workspace?.financialSummary || {};

  const filteredToCollect = useMemo(() => {
    if (quickMode === "ALL") return toCollect;
    if (quickMode === "ELECTRONIC") {
      return toCollect.filter(
        (row) => String(row.preorderPaymentMode || "").toUpperCase() !== "ESPECES",
      );
    }
    return toCollect.filter(
      (row) => String(row.preorderPaymentMode || "").toUpperCase() === quickMode,
    );
  }, [quickMode, toCollect]);

  const filteredToLaunchPreparation = useMemo(() => {
    if (quickMode === "ALL") return toLaunchPreparation;
    if (quickMode === "ELECTRONIC") {
      return toLaunchPreparation.filter(
        (row) => String(row.preorderPaymentMode || "").toUpperCase() !== "ESPECES",
      );
    }
    return toLaunchPreparation.filter(
      (row) => String(row.preorderPaymentMode || "").toUpperCase() === quickMode,
    );
  }, [quickMode, toLaunchPreparation]);

  const filteredJournal = useMemo(() => {
    if (quickMode === "ALL") return journal;
    if (quickMode === "ELECTRONIC") {
      return journal.filter(
        (row) => String(row.preorderPaymentMode || "").toUpperCase() !== "ESPECES",
      );
    }
    return journal.filter(
      (row) => String(row.preorderPaymentMode || "").toUpperCase() === quickMode,
    );
  }, [quickMode, journal]);

  const askCashCollection = (row) => {
    const receiptNumber = window.prompt(
      "Numéro de reçu caisse",
      row?.cashierTransaction?.receiptNumber || row?.factureReference || "",
    );
    if (!receiptNumber || !String(receiptNumber).trim()) return null;

    const cashDeskLabel =
      window.prompt(
        "Poste de caisse",
        row?.cashierTransaction?.cashDeskLabel || "Caisse principale",
      ) || "";

    const amountReceivedFcfa = window.prompt(
      "Montant reçu (FCFA)",
      String(row?.amountExpectedFcfa || row?.totalFcfa || ""),
    );
    if (!amountReceivedFcfa || !String(amountReceivedFcfa).trim()) return null;

    return {
      receiptNumber: String(receiptNumber).trim(),
      cashDeskLabel: String(cashDeskLabel || "").trim() || undefined,
      amountReceivedFcfa: String(amountReceivedFcfa).trim(),
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Espace Caisse</h1>
          <p className="mt-1 text-sm text-gray-500">
            File d'encaissement, validation des paiements et suivi des commandes prêtes à lancer en préparation.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="font-semibold text-gray-900">{admin?.fullName || "Caissière"}</div>
          <div className="text-gray-500">{humanizeEnum(role)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard title="À encaisser" value={collectionSummary.total || 0} hint="Préfactures à encaisser ou paiements électroniques à contrôler" />
        <SummaryCard title="Espèces" value={collectionSummary.pendingCash || 0} hint="Encaissements espèces en attente" />
        <SummaryCard title="Électroniques" value={collectionSummary.pendingElectronic || 0} hint="Paiements électroniques à confirmer" />
        <SummaryCard title="À lancer" value={launchSummary.total || 0} hint="Paiements confirmés, en attente de transmission au stock" />
        <SummaryCard title="Total jour" value={formatFcfa(financialSummary.totalReceivedFcfa || 0)} hint={journalSummary.scope === "all" ? "Bilan consolidé" : "Mon bilan du jour"} />
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton
          active={activeTab === "collect"}
          count={collectionSummary.total || 0}
          onClick={() => setActiveTab("collect")}
        >
          À encaisser
        </TabButton>
        <TabButton
          active={activeTab === "launch"}
          count={launchSummary.total || 0}
          onClick={() => setActiveTab("launch")}
        >
          À lancer
        </TabButton>
        <TabButton
          active={activeTab === "journal"}
          count={journalSummary.total || 0}
          onClick={() => setActiveTab("journal")}
        >
          Journal
        </TabButton>
        <TabButton
          active={activeTab === "balance"}
          onClick={() => setActiveTab("balance")}
        >
          Bilan
        </TabButton>
      </div>

      <div className="flex flex-wrap gap-2">
        <QuickFilterButton active={quickMode === "ALL"} onClick={() => setQuickMode("ALL")}>
          Tous
        </QuickFilterButton>
        <QuickFilterButton active={quickMode === "ESPECES"} onClick={() => setQuickMode("ESPECES")}>
          Espèces
        </QuickFilterButton>
        <QuickFilterButton active={quickMode === "WAVE"} onClick={() => setQuickMode("WAVE")}>
          Wave
        </QuickFilterButton>
        <QuickFilterButton active={quickMode === "ORANGE_MONEY"} onClick={() => setQuickMode("ORANGE_MONEY")}>
          Orange Money
        </QuickFilterButton>
        <QuickFilterButton active={quickMode === "ELECTRONIC"} onClick={() => setQuickMode("ELECTRONIC")}>
          Électroniques
        </QuickFilterButton>
      </div>

      <div className="flex flex-wrap gap-2">
        <QuickFilterButton active={quickPreset === "ALL"} onClick={() => applyQuickPreset("ALL")}>
          Tous
        </QuickFilterButton>
        <QuickFilterButton active={quickPreset === "TODAY"} onClick={() => applyQuickPreset("TODAY")}>
          Aujourd'hui
        </QuickFilterButton>
        <QuickFilterButton active={quickPreset === "CASH"} onClick={() => applyQuickPreset("CASH")}>
          Espèces
        </QuickFilterButton>
        <QuickFilterButton active={quickPreset === "WAVE"} onClick={() => applyQuickPreset("WAVE")}>
          Wave
        </QuickFilterButton>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="FBO, facture, précommande, colis, téléphone, reçu"
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm xl:col-span-2"
            />
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
              className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tous les paiements</option>
              <option value="ESPECES">Espèces</option>
              <option value="WAVE">Wave</option>
              <option value="ORANGE_MONEY">Orange Money</option>
            </select>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl border border-gray-300 px-3 py-2 text-sm" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canViewConsolidated ? (
              <select
                value={journalScope}
                onChange={(e) => setJournalScope(e.target.value)}
                className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="my">Mon journal</option>
                <option value="all">Toutes les caisses</option>
              </select>
            ) : null}
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {loading ? "Chargement..." : "Actualiser"}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickPreset("ALL");
                setQuery("");
                setPaymentMode("");
                setDateFrom("");
                setDateTo("");
                setJournalScope("my");
                setQuickMode("ALL");
                load({
                  query: "",
                  paymentMode: "",
                  dateFrom: "",
                  dateTo: "",
                  journalScope: "my",
                });
              }}
              disabled={loading}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        <MetricList
          title={
            activeTab === "launch"
              ? "Répartition à lancer"
              : activeTab === "journal" || activeTab === "balance"
                ? "Répartition journal"
                : "Répartition à encaisser"
          }
          rows={
            activeTab === "launch"
              ? launchSummary.byPaymentMode || []
              : activeTab === "journal" || activeTab === "balance"
                ? journalSummary.byPaymentMode || []
                : collectionSummary.byPaymentMode || []
          }
          emptyLabel="Aucune ligne pour cette vue."
        />
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          {info}
        </div>
      ) : null}

      {activeTab === "collect" ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">À encaisser</h2>
            <p className="text-sm text-gray-500">
              Liste prioritaire des dossiers de caisse à traiter, du plus ancien au plus récent.
            </p>
          </div>
          <QueueTable
            rows={filteredToCollect}
            emptyLabel="Aucune précommande à encaisser."
            busyId={busyId}
            onCashPay={(row) =>
              runAction(row.id, async () => {
                const payload = askCashCollection(row);
                if (!payload) {
                  throw new Error("Encaissement annulé.");
                }
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
                setInfo("Commande transmise au préparateur et SMS client envoyé.");
              })
            }
            onSyncWave={(row) =>
              runAction(row.id, async () => {
                await ordersService.syncWavePaymentStatus(row.id);
                setInfo("Statut Wave synchronisé.");
              })
            }
            onPrint={(row) => navigate(`/orders/${row.id}?tab=payment`)}
            onOpen={(row) => navigate(`/orders/${row.id}?tab=payment`)}
          />
        </section>
      ) : null}

      {activeTab === "launch" ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">À lancer en préparation</h2>
            <p className="text-sm text-gray-500">
              Commandes déjà payées, prêtes à être transmises au stock.
            </p>
          </div>
          <QueueTable
            rows={filteredToLaunchPreparation}
            emptyLabel="Aucune commande en attente de lancement préparation."
            busyId={busyId}
            onCashPay={() => {}}
            onVerify={() => {}}
            onPrepare={(row) =>
              runAction(row.id, async () => {
                await cashierService.prepareForPacking(row.id, {
                  packingNote: "Commande validée par la caisse pour préparation",
                });
                setInfo("Commande transmise au préparateur et SMS client envoyé.");
              })
            }
            onSyncWave={() => {}}
            onPrint={(row) => navigate(`/orders/${row.id}?tab=payment`)}
            onOpen={(row) => navigate(`/orders/${row.id}?tab=payment`)}
          />
        </section>
      ) : null}

      {activeTab === "journal" ? (
        <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Journal de transactions</h2>
              <p className="text-sm text-gray-500">
                {journalSummary.scope === "all"
                  ? "Historique consolidé des paiements traités par toutes les caisses."
                  : "Historique des paiements que vous avez traités."}
              </p>
            </div>
            <JournalTable rows={filteredJournal} canViewAll={journalSummary.scope === "all"} />
          </div>

          <div className="space-y-4">
            <MetricList
              title="Journal par mode"
              rows={journalSummary.byPaymentMode || []}
              emptyLabel="Aucun règlement validé."
            />
            {canViewConsolidated && journalSummary.scope === "all" ? (
              <MetricList
                title="Synthèse par caisse"
                rows={journalSummary.byCashier || []}
                emptyLabel="Aucune caisse consolidée."
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {activeTab === "balance" ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Bilan financier</h2>
            <p className="text-sm text-gray-500">
              Vue synthétique des encaissements de la période sélectionnée.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <SummaryCard title="Transactions" value={financialSummary.transactionsCount || 0} hint="Paiements traités sur la période" />
            <SummaryCard title="Montant attendu" value={formatFcfa(financialSummary.totalExpectedFcfa || 0)} hint="Total théorique des encaissements" />
            <SummaryCard title="Montant encaissé" value={formatFcfa(financialSummary.totalReceivedFcfa || 0)} hint="Total effectivement saisi en caisse" />
            <SummaryCard title="À transmettre" value={financialSummary.totalToLaunchPreparation || 0} hint="Commandes encore à lancer en préparation" />
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <MetricList
              title="Encaissements par mode"
              rows={journalSummary.byPaymentMode || []}
              emptyLabel="Aucun encaissement sur la période."
            />
            {canViewConsolidated && journalSummary.scope === "all" ? (
              <MetricList
                title="Encaissements par caisse"
                rows={journalSummary.byCashier || []}
                emptyLabel="Aucune caisse consolidée."
              />
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900">Point d'attention</h3>
                <div className="mt-3 text-sm text-gray-600">
                  Utilise les filtres de dates et de mode de paiement pour suivre ton bilan journalier et préparer ta clôture de caisse.
                </div>
              </div>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
