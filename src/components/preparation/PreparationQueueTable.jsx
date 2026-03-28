import { Link } from "react-router-dom";
import OrderPaymentBadge from "../orders/OrderPaymentBadge";
import RequirePermission from "../auth/RequirePermission";
import { Permission } from "../../auth/permissions";

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

function OrderStatusBadge({ status }) {
  const tones = {
    PAID: "bg-green-50 text-green-700 border-green-200",
    READY: "bg-indigo-50 text-indigo-700 border-indigo-200",
    FULFILLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${tones[status] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {status || "—"}
    </span>
  );
}

export default function PreparationQueueTable({ rows, loading, onOpen, onPrepare }) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 shadow-sm">
        Chargement…
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        Aucun dossier à afficher.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Colis / commande</th>
              <th className="px-4 py-3 font-medium">Client</th>
              <th className="px-4 py-3 font-medium">Paiement</th>
              <th className="px-4 py-3 font-medium">Progression</th>
              <th className="px-4 py-3 font-medium">État</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-gray-100 text-gray-800 align-top">
                <td className="px-4 py-3">
                  <div className="font-medium">
                    {row.parcelNumber || row.preorderNumber || row.factureReference || row.id}
                  </div>
                  <div className="text-xs text-gray-500">{row.factureReference || "—"}</div>
                </td>

                <td className="px-4 py-3">
                  <div className="font-medium">{row.fboNomComplet || "—"}</div>
                  <div className="text-xs text-gray-500">
                    FBO {row.fboNumero || "—"} • {row.pointDeVente || "—"}
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="font-medium">{formatFcfa(row.totalFcfa)}</div>
                  <div className="mt-1">
                    <OrderPaymentBadge status={row.paymentStatus} />
                  </div>
                </td>

                <td className="px-4 py-3">
                  <div className="text-sm">Payée le {formatDateTime(row.paidAt)}</div>
                  <div className="text-xs text-gray-500">
                    Lancement {formatDateTime(row.preparationLaunchedAt)}
                  </div>
                  {row.preparedAt ? (
                    <div className="text-xs text-gray-500">
                      Prête le {formatDateTime(row.preparedAt)}
                    </div>
                  ) : null}
                </td>

                <td className="px-4 py-3">
                  <OrderStatusBadge status={row.status} />
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">
                    {row.status === "PAID" && row.preparationLaunchedAt ? (
                      <RequirePermission permission={Permission.PREPARATION_UPDATE}>
                        <button
                          onClick={() => onPrepare(row)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                          type="button"
                        >
                          Préparer
                        </button>
                      </RequirePermission>
                    ) : null}

                    <RequirePermission permission={Permission.PREORDER_READ}>
                      <Link
                        to={`/orders/${row.id}?tab=preparation`}
                        className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Détail
                      </Link>
                    </RequirePermission>

                    <RequirePermission permission={Permission.PREORDER_READ}>
                      <button
                        onClick={() => onOpen(row)}
                        className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                        type="button"
                      >
                        Ouvrir
                      </button>
                    </RequirePermission>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
