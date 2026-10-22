import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Package, RefreshCw, X } from "lucide-react";
import { ordersService } from "../services/ordersService";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(
    new Date(value),
  );
}

const STATUS_LABELS = {
  ISSUED: "Déclaré",
  READY_FOR_PICKUP: "Prêt au retrait",
  FULFILLED: "Remis",
  CANCELLED: "Annulé",
};

const STATUS_TONES = {
  ISSUED: "border-amber-200 bg-amber-50 text-amber-800",
  READY_FOR_PICKUP: "border-blue-200 bg-blue-50 text-blue-800",
  FULFILLED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  CANCELLED: "border-gray-200 bg-gray-50 text-gray-600",
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_TONES[status] || STATUS_TONES.ISSUED}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function FulfillModal({ credit, saving, error, onClose, onSubmit }) {
  const [pickupCode, setPickupCode] = useState("");
  const [pickupRecipientName, setPickupRecipientName] = useState("");

  if (!credit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit({ pickupCode, pickupRecipientName });
        }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Remettre l'avoir</h2>
            <p className="mt-1 text-sm text-gray-500">
              {credit.parcelNumber} — {credit.productNameSnapshot} x {credit.qty}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-700">Code de retrait</label>
          <input
            required
            autoFocus
            value={pickupCode}
            onChange={(e) => setPickupCode(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            placeholder="Code transmis au client"
          />
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-medium text-gray-700">Nom du récupérant</label>
          <input
            required
            value={pickupRecipientName}
            onChange={(e) => setPickupRecipientName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            placeholder="Nom de la personne qui récupère"
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
            disabled={saving || !pickupCode.trim() || !pickupRecipientName.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Confirmer la remise
          </button>
        </div>
      </form>
    </div>
  );
}

export default function BackorderCreditsPage() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [preparingId, setPreparingId] = useState("");
  const [fulfillTarget, setFulfillTarget] = useState(null);
  const [fulfillSaving, setFulfillSaving] = useState(false);
  const [fulfillError, setFulfillError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const data = await ordersService.listBackorderCredits(
        status ? { status } : {},
      );
      setRows(Array.isArray(data?.data) ? data.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les avoirs produits.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function handlePrepare(credit) {
    try {
      setPreparingId(credit.id);
      setError("");
      await ordersService.prepareBackorderCredit(credit.id);
      setInfo(`Avoir ${credit.productNameSnapshot} marqué prêt au retrait, client notifié.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de préparer cet avoir.");
    } finally {
      setPreparingId("");
    }
  }

  async function submitFulfill(body) {
    if (!fulfillTarget) return;
    try {
      setFulfillSaving(true);
      setFulfillError("");
      await ordersService.fulfillBackorderCredit(fulfillTarget.id, body);
      setFulfillTarget(null);
      setInfo(`Avoir ${fulfillTarget.productNameSnapshot} remis au client.`);
      await load();
    } catch (e) {
      setFulfillError(e?.response?.data?.message || "Impossible de confirmer la remise.");
    } finally {
      setFulfillSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Avoirs produits</h1>
          <p className="mt-1 text-sm text-gray-500">
            Produits déclarés indisponibles à la préparation, suivis séparément jusqu'à leur
            remise au client dès réapprovisionnement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous statuts actifs</option>
            <option value="ISSUED">Déclaré</option>
            <option value="READY_FOR_PICKUP">Prêt au retrait</option>
            <option value="FULFILLED">Remis</option>
            <option value="CANCELLED">Annulé</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>
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
          <div className="p-8 text-center text-sm text-gray-500">Aucun avoir produit pour l'instant.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Produit</th>
                  <th className="px-4 py-3">Commande d'origine</th>
                  <th className="px-4 py-3">Motif</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Déclaré le</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((credit) => (
                  <tr key={credit.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 font-semibold text-gray-900">
                        <Package className="h-4 w-4 text-gray-400" />
                        {credit.productNameSnapshot}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Qté {credit.qty} {credit.parcelNumber ? `• Colis ${credit.parcelNumber}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/orders/${credit.preorderId}?tab=preparation`}
                        className="font-semibold text-blue-700 underline-offset-2 hover:underline"
                      >
                        {credit.preorder?.preorderNumber || credit.preorderId}
                      </Link>
                      <div className="mt-1 text-xs text-gray-500">
                        {credit.preorder?.fboNomComplet || "-"} • FBO {credit.preorder?.fboNumero || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs text-gray-700">{credit.reason}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={credit.status} />
                      {credit.status === "READY_FOR_PICKUP" && credit.pickupSecretCode ? (
                        <div className="mt-1 text-xs text-gray-500">Code: {credit.pickupSecretCode}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(credit.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {credit.status === "ISSUED" ? (
                          <button
                            type="button"
                            onClick={() => handlePrepare(credit)}
                            disabled={preparingId === credit.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
                          >
                            {preparingId === credit.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                            Préparer ce colis
                          </button>
                        ) : null}
                        {credit.status === "READY_FOR_PICKUP" ? (
                          <button
                            type="button"
                            onClick={() => setFulfillTarget(credit)}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                          >
                            Remettre au client
                          </button>
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

      <FulfillModal
        credit={fulfillTarget}
        saving={fulfillSaving}
        error={fulfillError}
        onClose={() => {
          setFulfillTarget(null);
          setFulfillError("");
        }}
        onSubmit={submitFulfill}
      />
    </div>
  );
}
