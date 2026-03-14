// admin-app/src/components/billing/BillingQueueTable.jsx
// Tableau de la file de facturation.

import OrderBillingBadge from "../orders/OrderBillingBadge";
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

  return d.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function PriorityBadge({ priority }) {
  const tones = {
    LOW: "bg-gray-100 text-gray-700 border-gray-200",
    NORMAL: "bg-blue-50 text-blue-700 border-blue-200",
    HIGH: "bg-amber-50 text-amber-700 border-amber-200",
    URGENT: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
        tones[priority] || tones.NORMAL
      }`}
    >
      {priority || "—"}
    </span>
  );
}

function OrderStatusBadge({ status }) {
  const tones = {
    SUBMITTED: "bg-blue-50 text-blue-700 border-blue-200",
    INVOICED: "bg-purple-50 text-purple-700 border-purple-200",
    PAYMENT_PENDING: "bg-amber-50 text-amber-700 border-amber-200",
    PAID: "bg-green-50 text-green-700 border-green-200",
    READY: "bg-indigo-50 text-indigo-700 border-indigo-200",
    FULFILLED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
        tones[status] || "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {status || "—"}
    </span>
  );
}

export default function BillingQueueTable({
  rows,
  loading,
  onOpen,
  onStart,
  onRelease,
  onEscalate,
}) {
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
              <th className="px-4 py-3 font-medium">Priorité</th>
              <th className="px-4 py-3 font-medium">FBO</th>
              <th className="px-4 py-3 font-medium">N° FBO</th>
              <th className="px-4 py-3 font-medium">Point de vente</th>
              <th className="px-4 py-3 font-medium">Montant</th>
              <th className="px-4 py-3 font-medium">Commande</th>
              <th className="px-4 py-3 font-medium">Facturation</th>
              <th className="px-4 py-3 font-medium">Assigné à</th>
              <th className="px-4 py-3 font-medium">Entrée queue</th>
              <th className="px-4 py-3 font-medium">SLA</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => {
              const assignedName =
                row?.assignedInvoicer?.fullName ||
                row?.assignedInvoicer?.email ||
                "—";

              return (
                <tr key={row.id} className="border-t border-gray-100 text-gray-800">
                  <td className="px-4 py-3">
                    <PriorityBadge priority={row.billingPriority} />
                  </td>

                  <td className="px-4 py-3 font-medium">{row.fboNomComplet || "—"}</td>

                  <td className="px-4 py-3">{row.fboNumero || "—"}</td>

                  <td className="px-4 py-3">{row.pointDeVente || "—"}</td>

                  <td className="px-4 py-3">{formatFcfa(row.totalFcfa)}</td>

                  <td className="px-4 py-3">
                    <OrderStatusBadge status={row.status} />
                  </td>

                  <td className="px-4 py-3">
                    <OrderBillingBadge status={row.billingWorkStatus} />
                  </td>

                  <td className="px-4 py-3">{assignedName}</td>

                  <td className="px-4 py-3">{formatDateTime(row.billingQueueEnteredAt)}</td>

                  <td className="px-4 py-3">{formatDateTime(row.billingSlaDeadlineAt)}</td>

                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <RequirePermission permission={Permission.PREORDER_READ}>
                        <button
                          onClick={() => onOpen(row)}
                          className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          type="button"
                        >
                          Ouvrir
                        </button>
                      </RequirePermission>

                      <RequirePermission permission={Permission.INVOICE_CREATE}>
                        <button
                          onClick={() => onStart(row)}
                          className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
                          type="button"
                        >
                          Démarrer
                        </button>
                      </RequirePermission>

                      <RequirePermission permission={Permission.INVOICE_CREATE}>
                        <button
                          onClick={() => onRelease(row)}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
                          type="button"
                        >
                          Libérer
                        </button>
                      </RequirePermission>

                      <RequirePermission permission={Permission.INVOICE_CREATE}>
                        <button
                          onClick={() => onEscalate(row)}
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                          type="button"
                        >
                          Escalader
                        </button>
                      </RequirePermission>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}