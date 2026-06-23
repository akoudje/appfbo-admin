// src/components/orders/detail/OrderHistoryTab.jsx

import OrderHistoryTimeline from "./OrderHistoryTimeline";

function filterLogsByRole(logs = [], role) {
  const items = Array.isArray(logs) ? logs : [];

  const billingActions = new Set([
    "ASSIGN_INVOICER",
    "RELEASE_INVOICER",
    "START_BILLING",
    "ESCALATE_BILLING",
    "WAIT_CUSTOMER_DATA",
    "INVOICE",
  ]);

  const cashierActions = new Set([
    "RECEIVE_MANUAL_PAYMENT_PROOF",
    "VALIDATE_MANUAL_PAYMENT",
    "PAYMENT_CONFIRMED",
    "LAUNCH_PREPARATION",
  ]);

  const preparationActions = new Set([
    "LAUNCH_PREPARATION",
    "PREPARE",
    "STOCK_DEBIT",
    "STOCK_CREDIT",
  ]);

  if (role === "INVOICER" || role === "BILLING_MANAGER") {
    return items.filter((log) => billingActions.has(log?.action));
  }

  if (role === "CAISSIERE" || role === "COUNTER_MANAGER" || role === "FINANCE_MANAGER") {
    return items.filter((log) => cashierActions.has(log?.action));
  }

  if (role === "ORDER_PREPARER" || role === "STOCK_MANAGER") {
    return items.filter((log) => preparationActions.has(log?.action));
  }

  return items;
}

function getHistoryTitle(role) {
  if (role === "INVOICER" || role === "BILLING_MANAGER") {
    return "Historique facturation";
  }
  if (role === "CAISSIERE" || role === "COUNTER_MANAGER" || role === "FINANCE_MANAGER") {
    return "Historique caisse";
  }
  if (role === "ORDER_PREPARER" || role === "STOCK_MANAGER") {
    return "Historique préparation";
  }
  return "Historique";
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

function channelLabel(channel) {
  const key = String(channel || "").trim().toUpperCase();
  if (key === "SMS") return "SMS";
  if (key === "WHATSAPP") return "WhatsApp";
  if (key === "EMAIL") return "Email";
  return key || "—";
}

function statusBadgeClass(status) {
  const key = String(status || "").trim().toUpperCase();
  if (["DELIVERED", "READ"].includes(key)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["SENT", "QUEUED", "DRAFT"].includes(key)) {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (["FAILED", "CANCELLED"].includes(key)) {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-gray-200 bg-gray-50 text-gray-700";
}

function extractDestination(message) {
  if (String(message?.channel || "").toUpperCase() === "EMAIL") {
    const emailEvt = (message?.events || []).find((evt) =>
      String(evt?.note || "").toLowerCase().includes("@"),
    );
    if (emailEvt?.note) return emailEvt.note;
  }
  return message?.toPhone || "—";
}

function NotificationHistory({ messages }) {
  const sorted = [...(Array.isArray(messages) ? messages : [])].sort(
    (a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
  );

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">Historique notifications</div>
        <div className="text-xs text-gray-500">{sorted.length} message(s)</div>
      </div>

      {!sorted.length ? (
        <div className="text-sm text-gray-500">Aucune notification</div>
      ) : (
        <div className="space-y-2">
          {sorted.map((message) => {
            const latestEvent = Array.isArray(message?.events)
              ? [...message.events].sort(
                  (a, b) =>
                    new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0),
                )[0]
              : null;

            return (
              <div
                key={message.id}
                className="rounded-xl border border-gray-200 bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">
                      {channelLabel(message?.channel)}
                    </span>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(
                        message?.status,
                      )}`}
                    >
                      {String(message?.status || "—").toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(message?.createdAt)}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-gray-600 sm:grid-cols-2">
                  <div>
                    <span className="text-gray-500">Objet:</span>{" "}
                    {String(message?.purpose || "—").replaceAll("_", " ")}
                  </div>
                  <div>
                    <span className="text-gray-500">Destinataire:</span>{" "}
                    {extractDestination(message)}
                  </div>
                  <div>
                    <span className="text-gray-500">Provider:</span>{" "}
                    {message?.provider || "—"}
                  </div>
                  <div>
                    <span className="text-gray-500">Dernier statut:</span>{" "}
                    {formatDateTime(message?.lastStatusAt)}
                  </div>
                </div>

                {message?.errorMessage ? (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
                    {message.errorMessage}
                  </div>
                ) : null}

                {latestEvent?.note ? (
                  <div className="mt-2 text-xs text-gray-500">
                    {latestEvent.note}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function OrderHistoryTab({ logs, role, messages }) {
  const filteredLogs = filterLogsByRole(logs, role);

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-2">
        <div className="font-semibold">{getHistoryTitle(role)}</div>
        <div className="text-sm text-gray-500">
          Journal métier des actions utiles pour cet espace de travail.
        </div>
      </div>

      <NotificationHistory messages={messages} />

      <OrderHistoryTimeline logs={filteredLogs} />
    </div>
  );
}
