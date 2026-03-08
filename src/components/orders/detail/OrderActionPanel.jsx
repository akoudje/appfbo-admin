// src/components/orders/detail/OrderActionPanel.jsx

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${
        tones[tone] || tones.gray
      }`}
    >
      {children}
    </span>
  );
}

export default function OrderActionPanel({ order, nextAction, saving }) {
  if (!nextAction) return null;

  return (
    <div className="card p-4 border border-gray-200">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold">{nextAction.title}</div>
            <Badge tone={nextAction.tone || "gray"}>{order?.status}</Badge>
          </div>
          <div className="text-sm text-gray-600 mt-1">{nextAction.desc}</div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {nextAction.primaryLabel ? (
            <button
              className="btn-primary"
              onClick={nextAction.primaryAction}
              disabled={!nextAction.enabled || saving}
            >
              {saving ? "..." : nextAction.primaryLabel}
            </button>
          ) : (
            <button className="btn" disabled>
              Aucune action
            </button>
          )}
        </div>
      </div>
    </div>
  );
}