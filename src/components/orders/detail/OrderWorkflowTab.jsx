// src/components/orders/detail/OrderWorkflowTab.jsx
// Onglet affichant les informations liées au workflow de facturation d'une commande : statut, dates clés, assignation, etc.

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function Badge({ children, color = "gray" }) {
  const map = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    red: "bg-red-100 text-red-700 border-red-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${
        map[color] || map.gray
      }`}
    >
      {children}
    </span>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value || "—"}</span>
    </div>
  );
}

export default function OrderWorkflowTab({ order }) {
  const invoicer = order?.assignedInvoicer;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* état du workflow */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          État du workflow
        </h3>

        <Row
          label="Statut facturation"
          value={<Badge color="blue">{order?.billingWorkStatus}</Badge>}
        />

        <Row
          label="Priorité"
          value={<Badge color="amber">{order?.billingPriority}</Badge>}
        />

        <Row
          label="Entrée dans la queue"
          value={formatDateTime(order?.billingQueueEnteredAt)}
        />

        <Row
          label="Assigné le"
          value={formatDateTime(order?.assignedAt)}
        />

        <Row
          label="Début traitement"
          value={formatDateTime(order?.billingStartedAt)}
        />

        <Row
          label="Dernière activité"
          value={formatDateTime(order?.billingLastActivityAt)}
        />

        <Row
          label="Terminé le"
          value={formatDateTime(order?.billingCompletedAt)}
        />

        <Row
          label="Escaladé le"
          value={formatDateTime(order?.billingEscalatedAt)}
        />

        <Row
          label="SLA deadline"
          value={formatDateTime(order?.billingSlaDeadlineAt)}
        />
      </div>

      {/* assignation */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-800">
          Assignation
        </h3>

        <Row
          label="Facturier assigné"
          value={invoicer ? invoicer.fullName : "Non assigné"}
        />

        <Row
          label="Email"
          value={invoicer?.email}
        />

        <Row
          label="Rôle"
          value={invoicer?.role}
        />

        <Row
          label="Assigné par"
          value={order?.assignedByAdmin?.fullName}
        />

        <Row
          label="Date assignation"
          value={formatDateTime(order?.assignedAt)}
        />
      </div>
    </div>
  );
}