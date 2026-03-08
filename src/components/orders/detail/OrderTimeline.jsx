// src/components/orders/detail/OrderTimeline.jsx

import { formatDateTime } from "../../../lib/format";

function cx(...arr) {
  return arr.filter(Boolean).join(" ");
}

export default function OrderTimeline({ steps, status }) {
  return (
    <div className="card p-4">
      <div className="font-semibold mb-3">Traitement</div>

      <div
        className={cx(
          "grid grid-cols-1 gap-2",
          steps.length === 5 ? "md:grid-cols-5" : "md:grid-cols-6"
        )}
      >
        {steps.map((st) => (
          <div
            key={st.key}
            className={cx(
              "rounded-xl border p-3 text-sm",
              st.done ? "border-emerald-200 bg-emerald-50" : "border-gray-200 bg-white"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium">{st.label}</div>
              <div className={cx("text-xs", st.done ? "text-emerald-700" : "text-gray-500")}>
                {st.done ? "OK" : "—"}
              </div>
            </div>

            <div className="text-xs text-gray-500 mt-1">
              {st.at ? formatDateTime(st.at) : "—"}
            </div>
          </div>
        ))}
      </div>

      {status === "CANCELLED" && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Commande annulée
        </div>
      )}
    </div>
  );
}