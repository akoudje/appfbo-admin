import React, { useMemo } from "react";

function formatDateTime(value) {
  if (!value) return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function formatFcfa(value, currencyCode = "XOF") {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "—";
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: currencyCode || "XOF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  } catch {
    return `${num} ${currencyCode || "XOF"}`;
  }
}

function safeStringify(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "Payload non sérialisable";
  }
}

function humanizeEnum(value) {
  if (!value) return "—";
  return String(value)
    .trim()
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

const EVENT_UI = {
  PAYMENT_INITIATED: { label: "Paiement initié", icon: "🚀", tone: "blue" },
  PROVIDER_SESSION_CREATED: { label: "Session provider créée", icon: "🧩", tone: "blue" },
  CHECKOUT_LINK_READY: { label: "Lien de paiement généré", icon: "🔗", tone: "blue" },
  STATUS_SYNCED: { label: "Statut synchronisé", icon: "🔄", tone: "gray" },
  WEBHOOK_RECEIVED: { label: "Webhook reçu", icon: "📩", tone: "gray" },
  WEBHOOK_INVALID_SIGNATURE: { label: "Webhook signature invalide", icon: "🚫", tone: "red" },
  WEBHOOK_PROCESSED: { label: "Webhook traité", icon: "⚙️", tone: "gray" },
  WEBHOOK_PREORDER_UNRESOLVED: { label: "Webhook sans commande résolue", icon: "❓", tone: "amber" },
  TRANSACTION_CAPTURED: { label: "Transaction capturée", icon: "🧾", tone: "blue" },
  PAYER_PHONE_CAPTURED: { label: "Numéro payeur capturé", icon: "📱", tone: "emerald" },
  PAYMENT_CONFIRMED: { label: "Paiement confirmé", icon: "✅", tone: "emerald" },
  PAYMENT_EXPIRED: { label: "Paiement expiré", icon: "⏰", tone: "amber" },
  PAYMENT_CANCELLED: { label: "Paiement annulé", icon: "🛑", tone: "red" },
  PAYMENT_FAILED: { label: "Paiement échoué", icon: "❌", tone: "red" },
  DETAILS_ENRICHED: { label: "Détails enrichis", icon: "🧠", tone: "violet" },
  SIMULATION_TRIGGERED: { label: "Simulation lancée", icon: "🧪", tone: "amber" },
  SIMULATION_RESULT_APPLIED: { label: "Simulation appliquée", icon: "🧪", tone: "amber" },
};

const SOURCE_UI = {
  INITIATE: { label: "INITIATE", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  SYNC: { label: "SYNC", cls: "bg-gray-100 text-gray-700 border-gray-200" },
  WEBHOOK: { label: "WEBHOOK", cls: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  SIMULATION: { label: "SIMULATION", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  ENRICHMENT: { label: "ENRICHMENT", cls: "bg-violet-100 text-violet-700 border-violet-200" },
  SYSTEM: { label: "SYSTEM", cls: "bg-slate-100 text-slate-700 border-slate-200" },
};

const STATUS_UI = {
  INITIATED: "bg-gray-100 text-gray-700 border-gray-200",
  PENDING_CUSTOMER_ACTION: "bg-amber-100 text-amber-800 border-amber-200",
  PROCESSING: "bg-blue-100 text-blue-700 border-blue-200",
  SUCCEEDED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  EXPIRED: "bg-orange-100 text-orange-700 border-orange-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  REFUNDED: "bg-violet-100 text-violet-700 border-violet-200",
  PARTIALLY_REFUNDED: "bg-violet-100 text-violet-700 border-violet-200",
  CREATED: "bg-gray-100 text-gray-700 border-gray-200",
  PROVIDER_SESSION_CREATED: "bg-blue-100 text-blue-700 border-blue-200",
  REDIRECT_READY: "bg-blue-100 text-blue-700 border-blue-200",
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
};

function toneClasses(tone) {
  const map = {
    gray: {
      dot: "bg-gray-300 border-gray-400",
      card: "border-gray-200 bg-gray-50",
    },
    blue: {
      dot: "bg-blue-400 border-blue-500",
      card: "border-blue-200 bg-blue-50",
    },
    emerald: {
      dot: "bg-emerald-400 border-emerald-500",
      card: "border-emerald-200 bg-emerald-50",
    },
    amber: {
      dot: "bg-amber-400 border-amber-500",
      card: "border-amber-200 bg-amber-50",
    },
    red: {
      dot: "bg-red-400 border-red-500",
      card: "border-red-200 bg-red-50",
    },
    violet: {
      dot: "bg-violet-400 border-violet-500",
      card: "border-violet-200 bg-violet-50",
    },
  };
  return map[tone] || map.gray;
}

function CopyValue({ value }) {
  const str = String(value || "").trim();
  if (!str || str === "—") return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard?.writeText(str);
    } catch {
      // noop
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="text-gray-400 hover:text-gray-600 transition-colors"
      title="Copier"
    >
      📋
    </button>
  );
}

function MetaRow({ label, value, copyable = false }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex items-start justify-between gap-2 text-xs">
      <span className="text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="min-w-0 flex items-center gap-1.5">
        <span className="font-medium text-gray-800 break-all text-right">{value}</span>
        {copyable ? <CopyValue value={value} /> : null}
      </div>
    </div>
  );
}

export default function PaymentTimeline({
  items = [],
  loading = false,
  error = "",
}) {
  const list = useMemo(() => {
    const source = Array.isArray(items) ? items : [];
    return source
      .slice()
      .sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
  }, [items]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-900">
          🕒 Timeline paiement
        </h4>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-sm text-gray-500">Chargement des événements transactionnels…</div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm p-3">
            {error}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 text-gray-600 text-sm p-3">
            Aucun événement transactionnel.
          </div>
        ) : (
          <ul className="space-y-3">
            {list.map((item) => {
              const eventKey = String(item?.eventType || "").toUpperCase();
              const sourceKey = String(item?.source || "SYSTEM").toUpperCase();
              const statusKey =
                String(item?.status || item?.attemptStatus || "").toUpperCase();
              const eventMeta = EVENT_UI[eventKey] || {
                label: humanizeEnum(eventKey),
                icon: "🧾",
                tone: "gray",
              };
              const sourceMeta = SOURCE_UI[sourceKey] || SOURCE_UI.SYSTEM;
              const tone = toneClasses(eventMeta.tone);
              const statusBadgeClass =
                STATUS_UI[statusKey] || "bg-gray-100 text-gray-700 border-gray-200";
              const providerStatus = item?.providerStatus || null;
              const amount =
                item?.amountFcfa === null || item?.amountFcfa === undefined
                  ? null
                  : formatFcfa(item.amountFcfa, item?.currencyCode || "XOF");

              return (
                <li key={item?.id || `${eventKey}-${item?.createdAt}`} className="relative pl-8">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gray-200" />
                  <div
                    className={`absolute left-0 top-1 h-4 w-4 rounded-full border-2 ${tone.dot}`}
                    aria-hidden="true"
                  />

                  <div className={`rounded-lg border p-3 ${tone.card}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-900 flex items-center gap-1.5">
                          <span>{eventMeta.icon}</span>
                          <span>{eventMeta.label}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {formatDateTime(item?.createdAt)}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${sourceMeta.cls}`}
                        >
                          {sourceMeta.label}
                        </span>

                        {statusKey ? (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusBadgeClass}`}
                          >
                            {humanizeEnum(statusKey)}
                          </span>
                        ) : null}

                        {providerStatus ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium bg-white text-gray-700 border-gray-300">
                            Provider: {providerStatus}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                      <MetaRow label="Session" value={item?.providerSessionId || null} copyable />
                      <MetaRow label="Transaction" value={item?.providerTransactionId || null} copyable />
                      <MetaRow label="Numéro payeur" value={item?.providerPayerPhone || null} copyable />
                      <MetaRow label="Provider" value={item?.provider || null} />
                      <MetaRow label="Montant" value={amount} />
                    </div>

                    {item?.note ? (
                      <div className="mt-2 text-xs text-gray-700 bg-white/80 border border-white rounded-md p-2 whitespace-pre-wrap">
                        {item.note}
                      </div>
                    ) : null}

                    {item?.payloadJson ? (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                          Voir payload brut
                        </summary>
                        <pre className="mt-2 max-h-56 overflow-auto rounded-md border border-gray-200 bg-white p-2 text-[11px] text-gray-700">
                          {safeStringify(item.payloadJson)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

