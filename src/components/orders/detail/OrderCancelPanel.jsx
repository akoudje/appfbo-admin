// src/components/orders/detail/OrderCancelPanel.jsx
import { useState } from "react";

function Alert({ tone = "red", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return (
    <div className={`card p-3 border ${tones[tone] || tones.red}`}>
      {title ? <div className="font-semibold text-sm mb-1">{title}</div> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

export default function OrderCancelPanel({
  order,
  saving,
  canCancel,
  cancelReason,
  setCancelReason,
  onCancel,
  canReactivate = false,
  onReactivate,
  canRegularizeLateCash = false,
  onRegularizeLateCash,
}) {
  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-2">
        <div className="font-semibold text-red-700">Annulation</div>
        <div className="text-sm text-gray-500">
          Action exceptionnelle. Utiliser uniquement en cas d’erreur, abandon,
          rupture ou incident.
        </div>
      </div>

      <Alert tone="red" title="Attention">
        L’annulation clôt ce dossier. Le stock déjà réservé est réintégré une
        seule fois. Si un règlement existe, son traitement reste distinct de
        l’annulation.
      </Alert>

      <div className="card p-4 space-y-4">
        <div className="font-semibold">Motif d’annulation</div>

        <Field label="Motif (obligatoire)">
          <textarea
            className="input min-h-[110px]"
            value={cancelReason}
            maxLength={1000}
            required
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Paiement non reçu / erreur / rupture stock..."
            disabled={!canCancel || saving}
          />
        </Field>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={onCancel}
            disabled={!canCancel || saving || !cancelReason.trim()}
          >
            {saving ? "..." : "Annuler la commande"}
          </button>

          <span className="text-xs text-gray-500">
            Actif tant que la commande n’est pas clôturée ou déjà annulée
          </span>
        </div>
      </div>

      {order?.cancelReason ? (
        <div className="card p-4 space-y-2">
          <div className="font-semibold">Dernier motif enregistré</div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap">
            {order.cancelReason}
          </div>
        </div>
      ) : null}

      {canReactivate ? (
        <div className="card p-4 space-y-3 border border-amber-200 bg-amber-50">
          <div>
            <div className="font-semibold text-amber-900">
              Réactiver (fermeture de caisse)
            </div>
            <div className="text-sm text-amber-800">
              Cette commande a été annulée automatiquement par une fermeture
              de caisse, pas par une décision métier. La réactiver la remet
              dans l'espace caisse de l'agent de vente qui l'avait traitée,
              avec le même statut qu'avant l'annulation.
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={onReactivate}
            disabled={saving}
          >
            {saving ? "..." : "Réactiver la commande"}
          </button>
        </div>
      ) : null}

      {canRegularizeLateCash ? (
        <LateCashRegularization order={order} saving={saving} onSubmit={onRegularizeLateCash} />
      ) : null}
    </div>
  );
}

// Valeur par défaut d'un <input type="datetime-local"> (heure locale du poste).
function toLocalInputValue(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function LateCashRegularization({ order, saving, onSubmit }) {
  const amount = Number(order?.as400InvoiceTotalFcfa || order?.totalFcfa || 0);
  const agentName = order?.assignedInvoicer?.fullName || order?.assignedInvoicer?.email || "";
  const [deliveredAt, setDeliveredAt] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const minDelivered = toLocalInputValue(order?.invoicedAt ? new Date(order.invoicedAt) : null);
  const maxDelivered = toLocalInputValue(new Date());
  const ready = Boolean(deliveredAt && receiptNumber.trim() && amount > 0);

  const submit = async () => {
    const ok = await onSubmit?.({
      receiptNumber: receiptNumber.trim(),
      amountReceivedFcfa: amount,
      deliveredAt: new Date(deliveredAt).toISOString(),
      agentName,
    });
    if (ok) {
      setDeliveredAt("");
      setReceiptNumber("");
    }
  };

  return (
    <div className="card p-4 space-y-3 border border-blue-200 bg-blue-50">
      <div>
        <div className="font-semibold text-blue-900">
          Encaissement reçu après la fermeture de caisse
        </div>
        <div className="text-sm text-blue-800 space-y-1">
          <p>
            À utiliser quand la commande a été servie et remise au client, mais
            que l’argent est arrivé après la fermeture de caisse, souvent le
            lendemain. Ne pas utiliser « Réactiver » dans ce cas : le lendemain,
            la commande serait aussitôt ré-annulée faute de paiement.
          </p>
          <p>
            La commande passe « Livrée » à la date de remise indiquée. Le
            paiement espèces est enregistré maintenant dans la caisse du jour de{" "}
            <strong>{agentName || "l’agent de vente"}</strong>, la caisse de la
            veille n’est pas modifiée. Le stock est débité. Aucun message n’est
            envoyé au client.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Date et heure de remise au client">
          <input
            type="datetime-local"
            className="input"
            value={deliveredAt}
            min={minDelivered}
            max={maxDelivered}
            onChange={(e) => setDeliveredAt(e.target.value)}
            disabled={saving}
          />
        </Field>
        <Field label="N° de reçu caisse">
          <input
            className="input"
            value={receiptNumber}
            maxLength={100}
            onChange={(e) => setReceiptNumber(e.target.value)}
            placeholder="Ex. RC-…"
            disabled={saving}
          />
        </Field>
        <Field label="Montant encaissé (montant facturé)">
          <div className="input bg-white/60 tabular-nums">
            {amount.toLocaleString("fr-FR")} FCFA
          </div>
        </Field>
      </div>

      <button
        type="button"
        className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={submit}
        disabled={saving || !ready}
      >
        {saving ? "..." : "Régulariser l’encaissement"}
      </button>
    </div>
  );
}
