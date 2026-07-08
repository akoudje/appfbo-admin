// admin-app/src/components/billing/BillingQueueStats.jsx
// Composant d'affichage des statistiques de la queue de facturation.

function StatCard({ label, value, tone = "gray" }) {
  const tones = {
    gray: "border-gray-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default function BillingQueueStats({ stats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="En attente de traitement" value={stats.queue} tone="blue" />
      <StatCard label="Mes dossiers" value={stats.my} tone="gray" />
      <StatCard label="Attente paiement" value={stats.waitingPayment} tone="amber" />
      <StatCard label="Urgences / contentieux" value={stats.escalated} tone="red" />
    </div>
  );
}
