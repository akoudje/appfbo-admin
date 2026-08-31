import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, RefreshCw, X } from "lucide-react";
import { ordersService } from "../services/ordersService";

function formatFcfa(value) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short" }).format(new Date(value));
}

function inputClass() {
  return "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";
}

function PenaltyModal({ order, saving, error, onClose, onSubmit }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ amountFcfa: amount, note });
        }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Enregistrer une pénalité</h2>
            <p className="mt-1 text-sm text-gray-500">
              {order.parcelNumber || order.preorderNumber} — {order.fboNomComplet}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
          Le montant est enregistré sur la commande à titre de suivi ; il n'est pas
          répercuté automatiquement sur la facturation. À collecter/appliquer manuellement
          selon la politique en vigueur.
        </p>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-700">Montant (FCFA)</label>
          <input
            type="number"
            min="0"
            required
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass()}
            placeholder="Ex: 2000"
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700">Note (optionnel)</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass()}
            placeholder="Motif, référence, contexte..."
          />
        </div>

        {error ? (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving || !amount}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PickupOverduePage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [penaltyTarget, setPenaltyTarget] = useState(null);
  const [penaltySaving, setPenaltySaving] = useState(false);
  const [penaltyError, setPenaltyError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await ordersService.getOverduePickups();
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les colis en retard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submitPenalty({ amountFcfa, note }) {
    if (!penaltyTarget) return;
    try {
      setPenaltySaving(true);
      setPenaltyError("");
      await ordersService.applyPickupPenalty(penaltyTarget.id, { amountFcfa, note });
      setPenaltyTarget(null);
      setInfo(`Pénalité enregistrée pour ${penaltyTarget.parcelNumber || penaltyTarget.preorderNumber}.`);
      await load();
    } catch (e) {
      setPenaltyError(e?.response?.data?.message || "Impossible d'enregistrer la pénalité.");
    } finally {
      setPenaltySaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Colis en retard de retrait</h1>
          <p className="mt-1 text-sm text-gray-500">
            Commandes prêtes non retirées au-delà du délai — rappel et signalement automatiques,
            pénalité enregistrée manuellement au cas par cas.
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

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
          Colis en retard
        </div>
        <div className="mt-1 text-2xl font-bold text-amber-950">{rows.length}</div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}
      {info ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{info}</div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex h-48 items-center justify-center text-gray-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Chargement...
          </div>
        ) : rows.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Aucun colis en retard de retrait pour l'instant.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Colis / commande</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Prêt depuis</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Pénalité</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3">
                      <Link
                        to={`/orders/${row.id}?tab=fulfillment`}
                        className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                      >
                        {row.parcelNumber || row.preorderNumber}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500">{row.factureReference || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.fboNomComplet || "-"}</div>
                      <div className="text-xs text-gray-500">
                        FBO {row.fboNumero || "-"} • {row.pointDeVente || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {row.daysLate} jour{row.daysLate > 1 ? "s" : ""}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">Prêt le {formatDate(row.preparedAt)}</div>
                    </td>
                    <td className="px-4 py-3">{formatFcfa(row.totalFcfa)}</td>
                    <td className="px-4 py-3">
                      {row.pickupPenaltyFcfa != null ? (
                        <div>
                          <div className="font-semibold text-gray-900">{formatFcfa(row.pickupPenaltyFcfa)}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(row.pickupPenaltyAppliedAt)}
                            {row.pickupPenaltyAppliedByAdmin?.fullName
                              ? ` • ${row.pickupPenaltyAppliedByAdmin.fullName}`
                              : ""}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Aucune</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setPenaltyTarget(row)}
                          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
                        >
                          {row.pickupPenaltyFcfa != null ? "Modifier pénalité" : "Enregistrer pénalité"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PenaltyModal
        order={penaltyTarget}
        saving={penaltySaving}
        error={penaltyError}
        onClose={() => {
          setPenaltyTarget(null);
          setPenaltyError("");
        }}
        onSubmit={submitPenalty}
      />
    </div>
  );
}
