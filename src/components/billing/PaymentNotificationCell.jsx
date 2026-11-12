// Onglet « En attente paiement » : la notification de paiement est-elle partie ?
// Une ligne par canal (SMS, WhatsApp, email) et le bouton « Renvoyer ».
import RequirePermission from "../auth/RequirePermission";
import { Permission } from "../../auth/permissions";

const CHANNEL_LABELS = { SMS: "SMS", WHATSAPP: "WhatsApp", EMAIL: "Email" };

const STATE_STYLES = {
  SENT: { label: "Envoyée", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "En file d'envoi", className: "bg-blue-50 text-blue-700 border-blue-200" },
  FAILED: { label: "Échec d'envoi", className: "bg-red-50 text-red-700 border-red-200" },
  NEVER: { label: "Jamais envoyée", className: "bg-amber-50 text-amber-800 border-amber-200" },
};

const CHANNEL_STATUS_LABELS = {
  SENT: "envoyé",
  DELIVERED: "reçu",
  READ: "lu",
  QUEUED: "en file",
  DRAFT: "en file",
  FAILED: "échec",
  CANCELLED: "annulé",
};

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const sameDay = date.toDateString() === new Date().toDateString();
  return sameDay
    ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function PaymentNotificationCell({ status, loading = false, resending = false, onResend }) {
  if (loading && !status) {
    return <div className="text-xs text-gray-400">Chargement…</div>;
  }
  if (!status) {
    return <div className="text-xs text-gray-400">—</div>;
  }
  const style = STATE_STYLES[status.state] || STATE_STYLES.NEVER;
  const channels = Object.entries(status.channels || {});

  return (
    <div className="min-w-[11rem] space-y-1.5">
      <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${style.className}`}>
        {style.label}
      </span>
      {status.lastAt ? (
        <div className="text-xs text-gray-500">
          Dernier envoi {formatTime(status.lastAt)}
          {status.count > 1 ? ` · ${status.count} envois` : ""}
        </div>
      ) : null}
      {channels.length ? (
        <ul className="space-y-0.5 text-xs">
          {channels.map(([channel, info]) => {
            const failed = ["FAILED", "CANCELLED"].includes(info.status);
            return (
              <li key={channel} className={failed ? "text-red-700" : "text-gray-600"} title={info.errorMessage || undefined}>
                {CHANNEL_LABELS[channel] || channel} : {CHANNEL_STATUS_LABELS[info.status] || info.status}
                {info.at ? ` (${formatTime(info.at)})` : ""}
              </li>
            );
          })}
        </ul>
      ) : null}
      {status.lastError ? (
        <div className="max-w-[14rem] truncate text-xs text-red-700" title={status.lastError}>
          {status.lastError}
        </div>
      ) : null}
      <RequirePermission permissions={[Permission.INVOICE_CREATE, Permission.PAYMENT_FOLLOWUP]}>
        <button
          type="button"
          onClick={onResend}
          disabled={resending}
          className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-wait disabled:opacity-60"
        >
          {resending ? "Envoi…" : "Renvoyer"}
        </button>
      </RequirePermission>
    </div>
  );
}
