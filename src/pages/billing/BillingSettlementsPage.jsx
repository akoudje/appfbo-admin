// admin-app/src/pages/billing/BillingSettlementsPage.jsx
// Commandes réglées par une autre filiale FLP (ex. FLP Burkina) : le client
// transmet sa liste de n° de précommande, le facturier la colle ici. Les
// commandes sont marquées, puis facturées comme d'habitude : à la facturation
// elles passent directement en « Payée » (pas de lien de paiement, pas de
// SMS, hors caisse) et partent en préparation.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import useAdminAuth from "../../hooks/useAdminAuth";
import { SETTLEMENT_REPORT_ROLES } from "../../auth/workspaces";
import { ordersService } from "../../services/ordersService";
import { formatFcfa, formatDateTime } from "../../lib/format";

const OUTCOMES = {
  MARKED: { label: "Marquée, à facturer", tone: "bg-emerald-50 text-emerald-700" },
  MARKED_AND_SETTLED: { label: "Déjà facturée : réglée, à préparer", tone: "bg-emerald-50 text-emerald-700" },
  ALREADY_MARKED: { label: "Déjà marquée", tone: "bg-gray-100 text-gray-700" },
  NOT_FOUND: { label: "Introuvable", tone: "bg-red-50 text-red-700" },
  CANCELLED: { label: "Annulée : à relancer d'abord", tone: "bg-red-50 text-red-700" },
  ALREADY_PAID: { label: "Déjà payée ici", tone: "bg-amber-50 text-amber-800" },
  NOT_MARKABLE: { label: "Statut incompatible", tone: "bg-amber-50 text-amber-800" },
  OTHER_ENTITY: { label: "Marquée pour une autre filiale", tone: "bg-amber-50 text-amber-800" },
  CHANGED: { label: "Modifiée entre-temps, réessayer", tone: "bg-amber-50 text-amber-800" },
};

const STATUS_LABELS = {
  SUBMITTED: "À facturer",
  INVOICED: "Préfacturée",
  PAYMENT_PENDING: "Paiement en attente",
  PAID: "Payée",
  READY: "Prête",
  FULFILLED: "Remise",
  CANCELLED: "Annulée",
  DRAFT: "Brouillon",
};

function OutcomeBadge({ outcome, detail }) {
  const config = OUTCOMES[outcome] || { label: outcome, tone: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${config.tone}`}>
      {config.label}
      {detail ? ` (${detail})` : ""}
    </span>
  );
}

export default function BillingSettlementsPage() {
  const { role } = useAdminAuth();
  const [entities, setEntities] = useState([]);
  const [entity, setEntity] = useState("");
  const [text, setText] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [pending, setPending] = useState([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [error, setError] = useState("");

  const entityLabel = entities.find((item) => item.code === entity)?.label || "la filiale";

  useEffect(() => {
    ordersService
      .listSettlementEntities()
      .then((data) => {
        setEntities(data.entities || []);
        setEntity((current) => current || data.entities?.[0]?.code || "");
      })
      .catch(() => setError("Impossible de charger les filiales."));
  }, []);

  const loadPending = useCallback(async () => {
    if (!entity) return;
    setLoadingPending(true);
    try {
      const data = await ordersService.listSettlementPending({ entity });
      setPending(data.orders || []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les commandes à facturer.");
    } finally {
      setLoadingPending(false);
    }
  }, [entity]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const submit = async (event) => {
    event.preventDefault();
    if (!text.trim() || !entity) return;
    setSubmitting(true);
    setError("");
    try {
      const data = await ordersService.markSettlementBatch({ entity, text, reference });
      setResult(data);
      const ok = (data.results || []).every((row) => ["MARKED", "MARKED_AND_SETTLED", "ALREADY_MARKED"].includes(row.outcome));
      if (ok && !data.unrecognized?.length) setText("");
      loadPending();
    } catch (e) {
      setError(e?.response?.data?.message || "Le lot n'a pas pu être enregistré.");
    } finally {
      setSubmitting(false);
    }
  };

  const unmark = async (order) => {
    if (!window.confirm(`Retirer ${order.preorderNumber} des commandes réglées par ${entityLabel} ?`)) return;
    try {
      await ordersService.unmarkSettlement(order.id);
      loadPending();
    } catch (e) {
      setError(e?.response?.data?.message || "Le marquage n'a pas pu être retiré.");
    }
  };

  const counts = (result?.results || []).reduce((acc, row) => {
    acc[row.outcome] = (acc[row.outcome] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Commandes réglées par {entityLabel}</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Collez la liste de numéros de précommande transmise par le client. Ces commandes se facturent
              ensuite normalement : à la facturation elles passent directement en « Payée », sans lien de
              paiement ni SMS, et partent en préparation. Rien n'est encaissé en caisse ici.
            </p>
          </div>
          {SETTLEMENT_REPORT_ROLES.includes(role) ? (
            <Link
              to="/reports/settlements"
              className="self-start whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Voir le rapport
            </Link>
          ) : null}
        </div>

        <form onSubmit={submit} className="mt-4 space-y-3">
          {entities.length > 1 ? (
            <label className="block text-sm">
              <span className="font-medium text-gray-700">Filiale qui règle</span>
              <select
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                className="mt-1 block rounded-xl border border-gray-300 px-3 py-2 text-sm"
              >
                {entities.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Numéros de précommande</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={"PO-CIV-20261030-0012\nPO-CIV-20261030-0015, PO-CIV-20261030-0021…"}
              className="mt-1 block w-full rounded-xl border border-gray-300 px-3 py-2 font-mono text-sm"
            />
            <span className="mt-1 block text-xs text-gray-500">
              Séparateurs libres (retours à la ligne, virgules, espaces). Les doublons sont ignorés.
            </span>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Référence de confirmation de la comptabilité (facultatif)</span>
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1 block w-full max-w-md rounded-xl border border-gray-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={submitting || !text.trim() || !entity}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? "Enregistrement…" : "Marquer ces commandes"}
          </button>
        </form>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      ) : null}

      {result ? (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3 text-sm text-gray-700">
            <span className="font-semibold text-gray-900">Résultat du lot</span> :{" "}
            {(counts.MARKED || 0) + (counts.MARKED_AND_SETTLED || 0)} marquée(s)
            {counts.ALREADY_MARKED ? `, ${counts.ALREADY_MARKED} déjà marquée(s)` : ""}
            {result.results.length - (counts.MARKED || 0) - (counts.MARKED_AND_SETTLED || 0) - (counts.ALREADY_MARKED || 0)
              ? `, ${result.results.length - (counts.MARKED || 0) - (counts.MARKED_AND_SETTLED || 0) - (counts.ALREADY_MARKED || 0)} à vérifier`
              : ""}
            {result.unrecognized?.length ? (
              <div className="mt-1 text-xs text-amber-800">
                Texte non reconnu comme numéro : {result.unrecognized.slice(0, 20).join(", ")}
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Précommande</th>
                  <th className="px-4 py-2 font-medium">FBO</th>
                  <th className="px-4 py-2 text-right font-medium">Montant</th>
                  <th className="px-4 py-2 font-medium">Statut</th>
                  <th className="px-4 py-2 font-medium">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => (
                  <tr key={row.preorderNumber} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono text-xs">
                      {row.id ? (
                        <Link to={`/orders/${row.id}`} className="text-blue-700 hover:underline">
                          {row.preorderNumber}
                        </Link>
                      ) : (
                        row.preorderNumber
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {row.fboNomComplet || "—"}
                      {row.fboNumero ? <div className="text-xs text-gray-500">{row.fboNumero}</div> : null}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{row.amountFcfa != null ? formatFcfa(row.amountFcfa) : "—"}</td>
                    <td className="px-4 py-2">{STATUS_LABELS[row.status] || row.status || "—"}</td>
                    <td className="px-4 py-2">
                      <OutcomeBadge outcome={row.outcome} detail={row.detail} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <div className="font-semibold text-gray-900">Marquées, à facturer ({pending.length})</div>
            <div className="text-xs text-gray-500">
              Elles restent dans la file de facturation et ne sont jamais annulées automatiquement.
            </div>
          </div>
          <button
            type="button"
            onClick={loadPending}
            disabled={loadingPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Rafraîchir
          </button>
        </div>
        {pending.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Précommande</th>
                  <th className="px-4 py-2 font-medium">FBO</th>
                  <th className="px-4 py-2 text-right font-medium">Montant estimé</th>
                  <th className="px-4 py-2 font-medium">Facturier</th>
                  <th className="px-4 py-2 font-medium">Marquée le</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {pending.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100">
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link to={`/orders/${order.id}`} className="text-blue-700 hover:underline">
                        {order.preorderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2">
                      {order.fboNomComplet || "—"}
                      <div className="text-xs text-gray-500">{order.fboNumero}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{formatFcfa(order.totalFcfa)}</td>
                    <td className="px-4 py-2 text-gray-700">
                      {order.assignedInvoicer?.fullName || order.assignedInvoicer?.email || "Non attribuée"}
                    </td>
                    <td className="px-4 py-2 text-gray-700">
                      {formatDateTime(order.settlementMarkedAt)}
                      {order.settlementReference ? (
                        <div className="text-xs text-gray-500">Réf. {order.settlementReference}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => unmark(order)}
                        className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Retirer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            {loadingPending ? "Chargement…" : "Aucune commande marquée en attente de facturation."}
          </p>
        )}
      </div>
    </div>
  );
}
