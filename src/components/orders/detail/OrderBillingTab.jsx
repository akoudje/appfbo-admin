// src/components/orders/detail/OrderBillingTab.jsx

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

function formatFcfa(value) {
  return `${new Intl.NumberFormat("fr-FR").format(Number(value || 0))} FCFA`;
}

export default function OrderBillingTab({
  order,
  saving,
  canInvoice,
  invoiceRef,
  setInvoiceRef,
  invoiceWaTo,
  setInvoiceWaTo,
  paymentLink,
  setPaymentLink,
  invoiceNote,
  setInvoiceNote,
  onInvoice,
  onCopyWhatsApp,
  isCash,
  isAutoPayment,
}) {
  const hasInvoice = ["INVOICED", "PAYMENT_PROOF_RECEIVED", "PAID", "READY", "FULFILLED"].includes(
    order?.status
  );

  return (
    <div className="space-y-4">
      <div className="card p-4 space-y-3">
        <div className="font-semibold">Facturation</div>
        <div className="text-sm text-gray-500">
          Préfacture, contact WhatsApp, message client et lien de paiement.
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Statut commande" value={order?.status || "—"} />
          <Row label="Montant à payer" value={formatFcfa(order?.totalFcfa)} />
          <Row label="Mode de paiement" value={order?.paymentMode || "—"} />
          <Row label="Référence facture" value={order?.factureReference || "—"} />
        </div>
      </div>

      {isCash && (
        <Alert tone="amber" title="Facturation — Paiement espèces">
          Cette commande est en <b>paiement espèces</b>. Aucune URL de paiement ne sera générée.
          Le message WhatsApp invitera le FBO à se présenter au bureau pour régler.
        </Alert>
      )}

      {!isCash && isAutoPayment && hasInvoice && (
        <Alert tone="blue" title="Facturation — Paiement en ligne automatique">
          Cette commande utilise un <b>lien PayDunya</b> généré automatiquement à la facturation.
          Le message WhatsApp contient déjà ce lien.
        </Alert>
      )}

      {!isCash && !isAutoPayment && (
        <Alert tone="gray" title="Facturation — Mode manuel">
          Cette commande n’utilise pas de lien de paiement automatique. Le traitement du paiement
          passera ensuite par la réception d’une preuve puis une validation manuelle.
        </Alert>
      )}

      <div className="card p-4 space-y-4">
        <div className="font-semibold">Préfacture</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Référence préfacture (optionnel)">
            <input
              className="input"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="PF-2026-00012"
              disabled={!canInvoice || saving}
            />
          </Field>

          <Field label="WhatsApp To (optionnel)">
            <input
              className="input"
              value={invoiceWaTo}
              onChange={(e) => setInvoiceWaTo(e.target.value)}
              placeholder="+225..."
              disabled={!canInvoice || saving}
            />
          </Field>
        </div>

        <Field
          label={
            isCash
              ? "Lien de paiement"
              : isAutoPayment || hasInvoice
                ? "Lien de paiement généré"
                : "Lien de paiement"
          }
        >
          <input
            className="input"
            value={paymentLink || order?.paymentLink || ""}
            onChange={(e) => setPaymentLink?.(e.target.value)}
            placeholder={
              isCash
                ? "Pas de lien pour un paiement espèces"
                : "Le lien sera généré automatiquement"
            }
            disabled
          />
        </Field>

        <Field label="Note de facturation (optionnel)">
          <textarea
            className="input min-h-[100px]"
            value={invoiceNote}
            onChange={(e) => setInvoiceNote(e.target.value)}
            placeholder={
              isCash
                ? "Préfacture prête. Paiement au bureau."
                : "Préfacture prête. Lien de paiement envoyé."
            }
            disabled={!canInvoice || saving}
          />
        </Field>

        <div className="flex gap-2 flex-wrap items-center">
          <button
            className="btn-primary"
            onClick={onInvoice}
            disabled={!canInvoice || saving}
          >
            {saving ? "..." : "Facturer / Envoyer"}
          </button>

          <span className="text-xs text-gray-500">
            Actif uniquement si statut = SUBMITTED
          </span>
        </div>
      </div>

      <div className="card p-4 space-y-4">
        <div className="font-semibold">Message WhatsApp au FBO</div>

        <div className="rounded-xl border p-3 bg-gray-50">
          {order?.whatsappMessage ? (
            <div className="text-xs text-gray-700 whitespace-pre-wrap">
              {order.whatsappMessage}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              Aucun message WhatsApp généré pour le moment.
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className="btn"
            onClick={onCopyWhatsApp}
            disabled={!order?.whatsappMessage}
          >
            Copier WhatsApp
          </button>

          {order?.paymentLink ? (
            <a
              className="btn"
              href={order.paymentLink}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir le lien de paiement
            </a>
          ) : null}
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="font-semibold">Informations de facturation enregistrées</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Row label="Référence facture" value={order?.factureReference || "—"} />
          <Row label="WhatsApp To" value={order?.factureWhatsappTo || "—"} />
          <Row
            label="Lien paiement"
            value={
              order?.paymentLink ? (
                <a
                  className="underline"
                  href={order.paymentLink}
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
          <Row label="Référence paiement" value={order?.paymentRef || "—"} />
        </div>

        {order?.invoicedAt ? (
          <div className="text-xs text-gray-500">
            Facturée le{" "}
            <span className="font-medium">
              {new Date(order.invoicedAt).toLocaleString("fr-FR")}
            </span>
            {order?.invoicedBy ? (
              <>
                {" "}par <span className="font-medium">{order.invoicedBy}</span>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}