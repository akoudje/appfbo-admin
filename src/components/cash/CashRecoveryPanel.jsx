// admin-app/src/components/cash/CashRecoveryPanel.jsx
// Onglet « Recouvrement » de la Supervision caisse : faire payer le plus
// grand nombre de commandes traitées.
// - par facturier : traitées sur la période → payées, en attente, annulées ;
// - « À recouvrer » (maintenant) : renvoyer la notification de paiement
//   d'une commande en attente, ou relancer une commande annulée sans
//   paiement aujourd'hui, tant que l'agence est ouverte ;
// - efficacité des relances et renvois sur la période.
// Une commande relancée reste chez le facturier qui l'a traitée à l'origine.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Send, RotateCcw } from "lucide-react";
import { reportsService } from "../../services/reportsService";
import { ordersService } from "../../services/ordersService";
import { formatFcfa, formatDateTime } from "../../lib/format";
import { Permission, hasAnyPermission } from "../../auth/permissions";
import useAdminAuth from "../../hooks/useAdminAuth";
import { useConfirm } from "../../hooks/useDialogs";

const PAYMENT_MODES = {
  ESPECES: "Espèces",
  WAVE: "Wave",
  ORANGE_MONEY: "Orange Money",
  BANK_TRANSFER: "Virement bancaire",
  ECOBANK_PAY: "Ecobank Pay",
  PI_SPI: "PI SPI",
};
const BANK_MODES = new Set(["BANK_TRANSFER", "ECOBANK_PAY", "PI_SPI"]);
// Preuve de virement déposée : c'est la validation qui manque, pas le client.
const PROOF_TO_REVIEW = new Set(["PROOF_SUBMITTED", "UNDER_REVIEW"]);
// Délai de paiement d'une relance mobile money (le backend plafonne à 60 min ;
// un virement garde le délai bancaire du pays).
const MOBILE_RELAUNCH_MINUTES = 30;

function rate(value) {
  return value === null || value === undefined ? "—" : `${value} %`;
}

function rateTone(value) {
  if (value === null || value === undefined) return "text-gray-500";
  if (value >= 90) return "text-emerald-700";
  if (value >= 75) return "text-amber-700";
  return "text-red-700";
}

function ageText(from) {
  if (!from) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(from).getTime()) / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 48 ? `${hours} h ${minutes % 60} min` : `${Math.floor(hours / 24)} j`;
}

function Stat({ bucket }) {
  return (
    <>
      <div className="tabular-nums">{bucket.count}</div>
      <div className="text-xs tabular-nums text-gray-500">{formatFcfa(bucket.amountFcfa)}</div>
    </>
  );
}

function EffectivenessCard({ title, data, verb }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
        {data.paidOrders} / {data.orders}
        <span className={`ml-2 text-base ${rateTone(data.successRate)}`}>{rate(data.successRate)}</span>
      </div>
      <div className="mt-1 text-sm text-gray-600">
        commande(s) {verb} payée(s) depuis · {formatFcfa(data.paidAmountFcfa)} récupérés
      </div>
      {data.byActor.length ? (
        <div className="mt-2 text-xs text-gray-500">
          {data.byActor.map((actor) => `${actor.label} (${actor.count})`).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}

export default function CashRecoveryPanel({ params, onSelectInvoicer, selectedInvoicerId }) {
  const { role, permissions } = useAdminAuth();
  const confirm = useConfirm();
  const canAct = hasAnyPermission(role, [Permission.PAYMENT_FOLLOWUP, Permission.INVOICE_CREATE], permissions);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await reportsService.getCashRecovery(params));
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le recouvrement.");
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (row, kind) => {
    const isBank = BANK_MODES.has(row.paymentMode);
    const question =
      kind === "RELAUNCH"
        ? {
            title: `Relancer ${row.preorderNumber} ?`,
            message: `La commande est refacturée (${formatFcfa(row.amountFcfa)}) et le client reçoit un nouveau lien de paiement, valable ${
              isBank ? "selon le délai virement du pays" : `${MOBILE_RELAUNCH_MINUTES} minutes`
            }. Elle reste chez ${row.invoicer?.label || "son facturier d'origine"}.`,
          }
        : {
            title: `Renvoyer la notification de ${row.preorderNumber} ?`,
            message: `Le client reçoit à nouveau son lien de paiement (${formatFcfa(row.amountFcfa)}) par SMS${row.phone ? ` au ${row.phone}` : ""}.`,
          };
    if (!(await confirm(question))) return;

    setBusyId(row.id);
    setFeedback(null);
    try {
      if (kind === "RELAUNCH") {
        await ordersService.relaunchPayment(row.id, {
          ...(isBank ? {} : { durationMinutes: MOBILE_RELAUNCH_MINUTES }),
          note: "Relance depuis la supervision caisse",
        });
      } else {
        await ordersService.resendInvoiceSms(row.id, {});
      }
      setFeedback({
        tone: "ok",
        text: `${row.preorderNumber} : ${kind === "RELAUNCH" ? "commande relancée" : "notification renvoyée"}.`,
      });
      await load();
    } catch (e) {
      setFeedback({
        tone: "error",
        text: `${row.preorderNumber} : ${e?.response?.data?.message || "action impossible."}`,
      });
    } finally {
      setBusyId("");
    }
  };

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>;
  }
  if (!data) {
    return <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">Chargement…</div>;
  }

  const { totals, byInvoicer, toRecover, effectiveness } = data;
  const recoverRows = [...toRecover.relaunchable, ...toRecover.pending];

  return (
    <div className={`space-y-4 ${loading ? "opacity-60" : ""}`}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Taux de recouvrement</div>
          <div className={`mt-1 text-2xl font-semibold tabular-nums ${rateTone(totals.recoveryRate)}`}>
            {rate(totals.recoveryRate)}
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {totals.paid.count} payée(s) sur {totals.processed.count} traitée(s) · {rate(totals.amountRecoveryRate)} en
            montant
          </div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Traitées sur la période</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{formatFcfa(totals.processed.amountFcfa)}</div>
          <div className="mt-1 text-sm text-gray-600">{totals.processed.count} commande(s) facturée(s)</div>
        </div>
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">En attente de paiement</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">{formatFcfa(totals.pending.amountFcfa)}</div>
          <div className="mt-1 text-sm text-gray-600">{totals.pending.count} commande(s) de la période</div>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Annulées sans paiement</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-red-700">{formatFcfa(totals.cancelled.amountFcfa)}</div>
          <div className="mt-1 text-sm text-gray-600">{totals.cancelled.count} commande(s) perdue(s)</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Recouvrement par facturier</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Commandes traitées (facturées) sur la période, chez le facturier qui les a traitées à l'origine. Cliquez
            sur une ligne pour filtrer.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Facturier</th>
                <th className="px-4 py-2 text-right font-medium">Traitées</th>
                <th className="px-4 py-2 text-right font-medium">Payées</th>
                <th className="px-4 py-2 text-right font-medium">En attente</th>
                <th className="px-4 py-2 text-right font-medium">Annulées</th>
                <th className="px-4 py-2 text-right font-medium">Recouvrement</th>
              </tr>
            </thead>
            <tbody>
              {byInvoicer.map((group) => (
                <tr
                  key={group.key}
                  onClick={() => group.key !== "UNASSIGNED" && onSelectInvoicer(group.key)}
                  className={`cursor-pointer border-t border-gray-100 hover:bg-gray-50 ${
                    selectedInvoicerId === group.key ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-4 py-2 text-gray-800">{group.label}</td>
                  <td className="px-4 py-2 text-right"><Stat bucket={group.processed} /></td>
                  <td className="px-4 py-2 text-right"><Stat bucket={group.paid} /></td>
                  <td className="px-4 py-2 text-right"><Stat bucket={group.pending} /></td>
                  <td className="px-4 py-2 text-right"><Stat bucket={group.cancelled} /></td>
                  <td className={`px-4 py-2 text-right font-semibold tabular-nums ${rateTone(group.recoveryRate)}`}>
                    {rate(group.recoveryRate)}
                    <div className="text-xs font-normal text-gray-500">{rate(group.amountRecoveryRate)} en montant</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!byInvoicer.length ? (
          <p className="px-4 py-4 text-center text-sm text-gray-500">Aucune commande traitée sur la période.</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">À recouvrer maintenant ({recoverRows.length})</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Commandes en attente de paiement, et commandes annulées sans paiement aujourd'hui (relançables pendant
              l'ouverture de l'agence ; ensuite, la commande est à reprendre entièrement).
            </p>
          </div>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Actualiser
          </button>
        </div>
        {!toRecover.agencyOpen && toRecover.relaunchable.length ? (
          <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            La caisse du comptoir est fermée : les commandes annulées ne peuvent plus être relancées.
          </p>
        ) : null}
        {!canAct ? (
          <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-600">
            Consultation seule : le droit « Suivre et relancer les paiements » est nécessaire pour agir (reconnectez-vous
            s'il vient de vous être accordé).
          </p>
        ) : null}
        {feedback ? (
          <p
            className={`border-b px-4 py-2 text-sm ${
              feedback.tone === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Commande</th>
                <th className="px-4 py-2 font-medium">Client</th>
                <th className="px-4 py-2 font-medium">Facturier</th>
                <th className="px-4 py-2 font-medium">Situation</th>
                <th className="px-4 py-2 text-right font-medium">Montant</th>
                <th className="px-4 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {recoverRows.map((row) => {
                const proofToReview = row.kind === "PENDING" && PROOF_TO_REVIEW.has(row.bankPaymentStatus);
                return (
                  <tr key={`${row.kind}-${row.id}`} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link to={`/orders/${row.id}`} className="text-blue-700 hover:underline">
                        {row.preorderNumber}
                      </Link>
                      <div className="mt-0.5 font-sans text-gray-500">{PAYMENT_MODES[row.paymentMode] || row.paymentMode}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-800">
                      {row.fboNomComplet}
                      <div className="text-xs text-gray-500">{[row.fboNumero, row.phone].filter(Boolean).join(" · ")}</div>
                    </td>
                    <td className="px-4 py-2 text-gray-700">{row.invoicer?.label || "—"}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {row.kind === "RELAUNCH" ? (
                        <>
                          <span className="inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">
                            Annulée sans paiement
                          </span>
                          <div className="mt-0.5 text-xs text-gray-500">le {formatDateTime(row.cancelledAt)}</div>
                        </>
                      ) : (
                        <>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              proofToReview ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800"
                            }`}
                          >
                            {proofToReview ? "Preuve de virement à valider" : "En attente de paiement"}
                          </span>
                          <div className="mt-0.5 text-xs text-gray-500">
                            facturée il y a {ageText(row.invoicedAt)}
                            {row.paymentExpiresAt ? ` · expire le ${formatDateTime(row.paymentExpiresAt)}` : ""}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatFcfa(row.amountFcfa)}</td>
                    <td className="px-4 py-2 text-right">
                      {proofToReview ? (
                        <Link to={`/orders/${row.id}`} className="text-sm font-medium text-blue-700 hover:underline">
                          Voir la preuve
                        </Link>
                      ) : canAct ? (
                        <button
                          type="button"
                          onClick={() => act(row, row.kind)}
                          disabled={busyId === row.id || (row.kind === "RELAUNCH" && !toRecover.agencyOpen)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          {row.kind === "RELAUNCH" ? (
                            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {busyId === row.id ? "…" : row.kind === "RELAUNCH" ? "Relancer" : "Renvoyer le lien"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!recoverRows.length ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">Rien à recouvrer pour le moment.</p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <EffectivenessCard title="Relances sur la période" data={effectiveness.relaunches} verb="relancée(s)" />
        <EffectivenessCard title="Liens renvoyés sur la période" data={effectiveness.resends} verb="relancée(s) par SMS" />
      </div>
    </div>
  );
}
