// admin-app/src/components/preparation/PreparationQueueStats.jsx
// statistiques de la file de préparation : nombre de commandes à préparer, prêtes, clôturées et total suivi. Affiche des cartes avec les chiffres et les couleurs selon le statut.

function StatCard({ label, value, tone = "gray" }) {
  const tones = {
    gray: "border-gray-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    indigo: "border-indigo-200 bg-indigo-50",
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}

export default function PreparationQueueStats({ stats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="À préparer" value={stats.toPrepare} tone="amber" />
      <StatCard label="Prêtes" value={stats.ready} tone="indigo" />
      <StatCard label="Clôturées" value={stats.fulfilled} tone="emerald" />
      <StatCard label="Total suivi" value={stats.total} tone="gray" />
    </div>
  );
}