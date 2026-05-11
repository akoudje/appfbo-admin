import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { paymentLinkRequestsService } from "../services/paymentLinkRequestsService";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "En attente" },
  { value: "IN_REVIEW", label: "En traitement" },
  { value: "RESOLVED", label: "Traitées" },
  { value: "REJECTED", label: "Rejetées" },
  { value: "ALL", label: "Toutes" },
];

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFcfa(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export default function PaymentLinkRequestsPage() {
  const [status, setStatus] = useState("PENDING");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "PENDING").length,
    [items],
  );

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await paymentLinkRequestsService.list({ status });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les demandes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  async function updateRequest(id, nextStatus) {
    try {
      setActionId(id);
      await paymentLinkRequestsService.update(id, { status: nextStatus });
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de mettre à jour la demande.");
    } finally {
      setActionId("");
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Demandes de lien de paiement</h1>
          <p className="mt-1 text-sm text-gray-500">
            Demandes envoyées depuis l'aide FBO lorsque le client n'a pas reçu son lien.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            En attente
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-950">{pendingCount}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Filtre courant
          </div>
          <div className="mt-1 text-lg font-bold text-gray-950">
            {STATUS_OPTIONS.find((item) => item.value === status)?.label || status}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              status === option.value
                ? "bg-[#FFC600] text-black"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement...
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Aucune demande.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Commande</th>
                  <th className="px-4 py-3">FBO</th>
                  <th className="px-4 py-3">Téléphones</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link
                        to={`/orders/${item.preorderId}`}
                        className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                      >
                        {item.preorderNumber || item.preorder?.preorderNumber || item.preorderId}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatFcfa(item.preorder?.totalFcfa)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">
                        {item.preorder?.fboNomComplet || "-"}
                      </div>
                      <div className="text-xs text-gray-500">{item.fboNumero}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>Commande : {item.originalPhone || "-"}</div>
                      <div className="mt-1 font-semibold text-gray-900">
                        WhatsApp demandé : {item.requestedWhatsappPhone || item.originalPhone || "-"}
                      </div>
                      {item.note ? (
                        <div className="mt-1 max-w-xs text-xs text-gray-500">{item.note}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {item.status === "PENDING" ? (
                          <button
                            type="button"
                            onClick={() => updateRequest(item.id, "IN_REVIEW")}
                            disabled={actionId === item.id}
                            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                          >
                            Traiter
                          </button>
                        ) : null}
                        {!["RESOLVED", "REJECTED"].includes(item.status) ? (
                          <>
                            <button
                              type="button"
                              onClick={() => updateRequest(item.id, "RESOLVED")}
                              disabled={actionId === item.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Résolu
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRequest(item.id, "REJECTED")}
                              disabled={actionId === item.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Rejeter
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
