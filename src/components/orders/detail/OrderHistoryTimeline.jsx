// src/components/orders/detail/OrderHistoryTimeline.jsx

import { formatDateTime } from "@/lib/format";
import { getOrderHistoryItem } from "@/lib/orders/orderHistory.helpers";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

function toneClasses(tone) {
  const map = {
    gray: "border-gray-200 bg-white",
    blue: "border-blue-200 bg-blue-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
  };
  return map[tone] || map.gray;
}

function iconWrapClasses(tone) {
  const map = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-800",
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
  };
  return map[tone] || map.gray;
}

export default function OrderHistoryTimeline({ logs }) {
  const sorted = [...(logs || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  if (!sorted.length) {
    return <div className="card p-4 text-sm text-gray-500">Aucun historique</div>;
  }

  return (
    <div className="space-y-3">
      {sorted.map((log) => {
        const item = getOrderHistoryItem(log);

        return (
          <div
            key={log.id}
            className={cx("card p-4 border", toneClasses(item.tone))}
          >
            <div className="flex items-start gap-3">
              <div
                className={cx(
                  "w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0",
                  iconWrapClasses(item.tone)
                )}
              >
                {item.icon}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-xs text-gray-500">
                    {formatDateTime(log.createdAt)}
                  </div>
                </div>

                {log.note ? (
                  <div className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                    {log.note}
                  </div>
                ) : null}

                {item.details?.length ? (
                  <div className="mt-2 space-y-1">
                    {item.details.map((line, idx) => (
                      <div key={idx} className="text-xs text-gray-600">
                        {line}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}