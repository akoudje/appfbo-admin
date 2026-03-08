// src/components/orders/detail/OrderPaymentTab.jsx

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Alert({ tone = "blue", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    red: "border-red-200 bg-red-50 text-red-900",
    blue: "border-blue-200 bg-blue-50 text-blue-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
    gray: "border-gray-200 bg-gray-50 text-gray-900",
  };

  return (
    <div className={`card p-3 border ${tones[tone] || tones.blue}`}>
      {title ? <div className="font-semibold text-sm mb-1">{title}</div> : null}
      <div className="text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-right break-all">{value}</div>
    </div>
  );
}

export default function OrderPaymentTab({
  order,
  saving,
  isCash,
  isAutoPayment,
  canCashPay,
  canProof,
  canVerify,
  cashNote,
  setCashNote,
  proofUrl,
  setProofUrl,
  proofRef,
  setProofRef,
  proofNote,
  setProofNote,
  verifyNote,
  setVerifyNote,
  onCashPay,
  onProof,
  onVerify,
  reload,
}) {
  const status = order?.status;

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="font-semibold">Paiement</div>
        <div className="text-sm text-gray-500">
          Cet onglet centralise le traitement du paiement selon le mode choisi.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Mode de paiement" value={order?.paymentMode || "—"} />
          <Row label="Statut actuel" value={status || "—"} />
          <Row label="Référence paiement" value={order?.paymentRef || "—"} />
          <Row
            label="Date de paiement"
            value={
              order?.paidAt
                ? new Date(order.paidAt).toLocaleString("fr-FR")
                : "—"
            }
          />
        </div>
      </div>

      {isCash && (
        <div className="space-y-4">
          <Alert tone="amber" title="Paiement espèces">
            Ce paiement se fait <b>manuellement au bureau</b>. Après encaissement,
            l’admin doit marquer la commande comme payée.
          </Alert>

          <div className="card p-4 space-y-3">
            <div className="font-semibold">Encaissement</div>

            <Field label="Note encaissement (optionnel)">
              <textarea
                className="input min-h-[100px]"
                value={cashNote}
                onChange={(e) => setCashNote(e.target.value)}
                disabled={!canCashPay || saving}
                placeholder="Paiement reçu au comptoir..."
              />
            </Field>

            <div className="flex gap-2 flex-wrap items-center">
              <button
                className="btn-primary"
                onClick={onCashPay}
                disabled={!canCashPay || saving}
              >
                {saving ? "..." : "Encaisser espèces"}
              </button>

              <span className="text-xs text-gray-500">
                Actif si statut = SUBMITTED ou INVOICED
              </span>
            </div>
          </div>

          {order?.paymentVerifiedBy || order?.paidAt ? (
            <div className="card p-4 space-y-2">
              <div className="font-semibold">Traçabilité</div>
              <Row
                label="Paiement validé par"
                value={order?.paymentVerifiedBy || "—"}
              />
              <Row
                label="Paiement validé le"
                value={
                  order?.paidAt
                    ? new Date(order.paidAt).toLocaleString("fr-FR")
                    : "—"
                }
              />
            </div>
          ) : null}
        </div>
      )}

      {!isCash && isAutoPayment && (
        <div className="space-y-4">
          <Alert tone="blue" title="Paiement en ligne automatique (PayDunya)">
            Cette commande utilise un <b>lien de paiement PayDunya</b>.  
            Dès que le FBO paie, le statut passe automatiquement à <b>PAID</b>.
          </Alert>

          <div className="card p-4 space-y-3">
            <div className="font-semibold">Suivi du paiement en ligne</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Row label="Référence paiement" value={order?.paymentRef || "—"} />
              <Row label="Statut commande" value={order?.status || "—"} />
              <Row
                label="Paiement validé par"
                value={order?.paymentVerifiedBy || "—"}
              />
              <Row
                label="Paiement validé le"
                value={
                  order?.paidAt
                    ? new Date(order.paidAt).toLocaleString("fr-FR")
                    : "—"
                }
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {order?.paymentLink ? (
                <a
                  className="btn"
                  href={order.paymentLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir le lien PayDunya
                </a>
              ) : null}

              <button className="btn" onClick={reload} disabled={saving}>
                Rafraîchir le statut
              </button>
            </div>

            {status === "INVOICED" && (
              <div className="text-xs text-gray-500">
                En attente de confirmation automatique du paiement.
              </div>
            )}

            {status === "PAID" && (
              <div className="text-xs text-emerald-700">
                Paiement confirmé automatiquement. La commande peut maintenant être préparée.
              </div>
            )}
          </div>
        </div>
      )}

      {!isCash && !isAutoPayment && (
        <div className="space-y-4">
          <Alert tone="gray" title="Paiement manuel avec preuve">
            Ce flux est utilisé comme <b>fallback manuel</b> : le FBO paie hors
            lien automatique, puis envoie une preuve à l’admin.
          </Alert>

          <div className="card p-4 space-y-3">
            <div className="font-semibold">Étape 1 — Enregistrer la preuve</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Preuve URL (optionnel)">
                <input
                  className="input"
                  value={proofUrl}
                  onChange={(e) => setProofUrl(e.target.value)}
                  disabled={!canProof || saving}
                  placeholder="https://..."
                />
              </Field>

              <Field label="Référence transaction (optionnel)">
                <input
                  className="input"
                  value={proofRef}
                  onChange={(e) => setProofRef(e.target.value)}
                  disabled={!canProof || saving}
                  placeholder="WAVE-XXXX / OM-XXXX"
                />
              </Field>
            </div>

            <Field label="Note preuve (optionnel)">
              <textarea
                className="input min-h-[100px]"
                value={proofNote}
                onChange={(e) => setProofNote(e.target.value)}
                disabled={!canProof || saving}
                placeholder="Capture reçue par WhatsApp..."
              />
            </Field>

            <div className="flex gap-2 flex-wrap items-center">
              <button
                className="btn"
                onClick={onProof}
                disabled={!canProof || saving}
              >
                {saving ? "..." : "Marquer preuve reçue"}
              </button>

              <span className="text-xs text-gray-500">
                Actif si statut = INVOICED
              </span>
            </div>
          </div>

          <div className="card p-4 space-y-3">
            <div className="font-semibold">Étape 2 — Valider le paiement</div>

            <Field label="Note validation (optionnel)">
              <input
                className="input"
                value={verifyNote}
                onChange={(e) => setVerifyNote(e.target.value)}
                disabled={!canVerify || saving}
                placeholder="Paiement vérifié..."
              />
            </Field>

            <div className="flex gap-2 flex-wrap items-center">
              <button
                className="btn-primary"
                onClick={onVerify}
                disabled={!canVerify || saving}
              >
                {saving ? "..." : "Valider paiement"}
              </button>

              <span className="text-xs text-gray-500">
                Actif si statut = PAYMENT_PROOF_RECEIVED
              </span>
            </div>
          </div>

          {(order?.paymentProofUrl || order?.paymentRef || order?.paymentProofNote) && (
            <div className="card p-4 space-y-3">
              <div className="font-semibold">Informations de preuve enregistrées</div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Row
                  label="Preuve URL"
                  value={
                    order?.paymentProofUrl ? (
                      <a
                        className="underline"
                        href={order.paymentProofUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Ouvrir
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <Row label="Référence transaction" value={order?.paymentRef || "—"} />
              </div>

              {order?.paymentProofNote ? (
                <div className="text-sm text-gray-700 whitespace-pre-wrap border rounded-xl p-3 bg-gray-50">
                  {order.paymentProofNote}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}