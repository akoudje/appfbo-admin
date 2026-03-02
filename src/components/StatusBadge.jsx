// admin-app/src/components/StatusBadge.jsx

const map = {
  DRAFT: { cls: "bg-gray-100 text-gray-700", label: "Brouillon" },
  SUBMITTED: { cls: "bg-blue-100 text-blue-800", label: "Soumise" },
  INVOICED: { cls: "bg-purple-100 text-purple-800", label: "Préfacturée" },

  PAYMENT_PROOF_RECEIVED: {
    cls: "bg-amber-100 text-amber-800",
    label: "Preuve reçue",
  },

  PAID: { cls: "bg-green-100 text-green-800", label: "Payée" },

  READY: { cls: "bg-sky-100 text-sky-800", label: "Colis prêt" },

  FULFILLED: { cls: "bg-emerald-100 text-emerald-800", label: "Clôturée" },

  CANCELLED: { cls: "bg-red-100 text-red-800", label: "Annulée" },
};

export default function StatusBadge({ status }) {
  const s = map[status] || { cls: "bg-gray-100 text-gray-700", label: status || "—" };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${s.cls}`}
      title={status}
    >
      {s.label}
    </span>
  );
}