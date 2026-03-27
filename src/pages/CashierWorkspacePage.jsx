import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAdminAuth from "../hooks/useAdminAuth";
import { AdminRole } from "../auth/permissions";
import { cashierService } from "../services/cashierService";
import { ordersService } from "../services/ordersService";

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
  const { rows, ...actions } = props;

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
              <th className="px-4 py-3">État</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-500">
                  Aucune précommande à traiter.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {row.preorderNumber || row.factureReference || row.id}
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
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500">
                  Aucun paiement validé pour préparation sur cette période.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">
                      {row.factureReference || row.preorderNumber || row.id}
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
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {formatDateTime(row.preparedAt)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {canViewAll
                        ? `Par ${row.preparedBy?.fullName || "—"}`
                        : "Validé pour préparation"}
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

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await cashierService.getWorkspace({
        q: query || undefined,
        paymentMode: paymentMode || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        journalScope: canViewConsolidated ? journalScope : "my",
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

  async function runAction(orderId, action) {
    try {
      setBusyId(orderId);
      setError("");
      setInfo("");
      await action();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Action impossible.");
    } finally {
      setBusyId("");
    }
  }

  const queue = workspace?.queue || [];
  const journal = workspace?.journal || [];
  const queueSummary = workspace?.queueSummary || {};
  const journalSummary = workspace?.journalSummary || {};

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="À traiter" value={queueSummary.total || 0} hint="Précommandes préfacturées ou en attente d'encaissement" />
        <SummaryCard title="Espèces à encaisser" value={queueSummary.pendingCash || 0} hint="Modes espèces non encore confirmés" />
        <SummaryCard title="Prêtes préparation" value={queueSummary.readyToPrepare || 0} hint="Paiement confirmé, en attente de passage à READY" />
        <SummaryCard title="Journal" value={journalSummary.total || 0} hint={journalSummary.scope === "all" ? "Vue consolidée" : "Mon historique"} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="FBO, facture, précommande"
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
          </div>
        </div>

        <MetricList
          title="Répartition par mode"
          rows={queueSummary.byPaymentMode || []}
          emptyLabel="Aucune ligne en file de caisse."
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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">File de caisse</h2>
            <p className="text-sm text-gray-500">
              Toutes les précommandes préfacturées avec leur mode de paiement, leur état et les actions utiles.
            </p>
          </div>
        </div>
        <QueueTable
          rows={queue}
          busyId={busyId}
          onCashPay={(row) =>
            runAction(row.id, async () => {
              await ordersService.pay(row.id, {
                reference: row.factureReference || row.preorderNumber || row.id,
                note: "Encaissement espèces depuis l'espace caisse",
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
              setInfo("Commande transmise à la préparation.");
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

      <section className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Journal de transactions</h2>
            <p className="text-sm text-gray-500">
              {journalSummary.scope === "all"
                ? "Historique consolidé des commandes validées pour préparation par toutes les caisses."
                : "Historique des commandes que vous avez validées pour préparation."}
            </p>
          </div>
          <JournalTable rows={journal} canViewAll={journalSummary.scope === "all"} />
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
    </div>
  );
}
