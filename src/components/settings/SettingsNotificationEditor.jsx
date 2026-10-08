import { useRef, useState } from "react";
import { useConfirm } from "../../hooks/useDialogs";
const LABELS = {
  PREORDER_SUBMITTED: "Précommande reçue",
  INVOICE: "Facture disponible",
  INVOICE_WAVE: "Paiement Wave",
  INVOICE_CASH: "Paiement en espèces",
  INVOICE_BANK_TRANSFER: "Virement bancaire",
  ORDER_READY: "Colis prêt",
  PREPARATION_STARTED: "Préparation en cours",
  ORDER_FULFILLED: "Commande remise",
  REMINDER: "Rappel de paiement",
};
const SAMPLES = {
  customerName: "Aminata Koné",
  preorderNumber: "CIV-20261006-001",
  parcelNumber: "COL-001",
  invoiceRef: "CIV-20261006-001",
  paymentCollectionCode: "123456",
  totalFcfa: "25000",
  totalFcfaLabel: "25 000 FCFA",
  paymentLink: "https://exemple.test/payer",
  bankProofUploadLink: "https://exemple.test/preuve",
  pickupCode: "654321",
  supportPhone: "+225 00 00 00 00 00",
  pickupAddress: "Comptoir FOREVER",
  bankAccountLine: "Banque : FOREVER — compte de démonstration",
  bankAccountHolder: "FOREVER",
  bankAccountNumber: "Compte de démonstration",
  paymentExpiryHours: "2",
  paymentFlow: "WAVE",
  bankName: "Banque de démonstration",
  bankIban: "IBAN de démonstration",
  bankAccountDetails: "Compte de démonstration",
};
export default function SettingsNotificationEditor({
  templates,
  defaults,
  onSmsChange,
  onEmailChange,
  supportPhone,
}) {
  const confirm = useConfirm();
  const [channel, setChannel] = useState("sms");
  const [purpose, setPurpose] = useState(Object.keys(templates.sms)[0]);
  const [target, setTarget] = useState("body");
  const bodyRef = useRef(null),
    subjectRef = useRef(null);
  const keys = Object.keys(templates[channel] || {});
  const current = templates[channel]?.[purpose];
  const body = channel === "sms" ? current || "" : current?.body || "";
  const subject = current?.subject || "";
  const samples = {
    ...SAMPLES,
    supportPhone: supportPhone || SAMPLES.supportPhone,
  };
  const preview = (value) =>
    value.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (match, key) => samples[key] ?? match,
    );
  const unknown = [
    ...new Set(
      [...(subject + " " + body).matchAll(/\{\{\s*(\w+)\s*\}\}/g)]
        .map((match) => match[1])
        .filter((key) => !(key in SAMPLES)),
    ),
  ];
  const setValue = (field, value) =>
    channel === "sms"
      ? onSmsChange(purpose, value)
      : onEmailChange(purpose, field, value);
  function insert(key) {
    const field = channel === "email" ? target : "body",
      element = field === "subject" ? subjectRef.current : bodyRef.current,
      value = field === "subject" ? subject : body;
    const start = element?.selectionStart ?? value.length,
      end = element?.selectionEnd ?? start,
      token = "{{" + key + "}}";
    setValue(field, value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(start + token.length, start + token.length);
    });
  }
  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-2" role="group" aria-label="Canal du message">
          {["sms", "email"].map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={channel === value}
              onClick={() => {
                setChannel(value);
                setPurpose(Object.keys(templates[value] || {})[0]);
                setTarget("body");
              }}
              className={
                "rounded-lg border px-4 py-2 text-sm font-medium " +
                (channel === value
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white text-gray-700")
              }
            >
              {value === "sms" ? "SMS" : "Email"}
            </button>
          ))}
        </div>
        <label className="grid gap-1 text-xs font-medium text-gray-600">
          Événement
          <select
            className={inputClass}
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          >
            {keys.map((key) => (
              <option key={key} value={key}>
                {LABELS[key] || "Autre notification"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-900">Contenu du message</h3>
            <button
              type="button"
              className="text-xs text-gray-500 underline"
              onClick={async () => {
                if (
                  await confirm({
                    title: "Restaurer ce modèle ?",
                    message:
                      "Le texte par défaut remplacera votre modification pour cet événement.",
                    confirmLabel: "Restaurer",
                    tone: "warning",
                  })
                ) {
                  if (channel === "sms")
                    onSmsChange(purpose, defaults.sms[purpose] || "");
                  else {
                    onEmailChange(
                      purpose,
                      "subject",
                      defaults.email[purpose]?.subject || "",
                    );
                    onEmailChange(
                      purpose,
                      "body",
                      defaults.email[purpose]?.body || "",
                    );
                  }
                }
              }}
            >
              Restaurer ce modèle
            </button>
          </div>
          {channel === "email" ? (
            <label className="grid gap-1.5 text-sm font-medium">
              Sujet
              <input
                ref={subjectRef}
                value={subject}
                onFocus={() => setTarget("subject")}
                onChange={(event) => setValue("subject", event.target.value)}
                className={inputClass}
              />
            </label>
          ) : null}
          <label className="grid gap-1.5 text-sm font-medium">
            {channel === "sms" ? "Message SMS" : "Corps du message"}
            <textarea
              ref={bodyRef}
              rows={channel === "sms" ? 6 : 12}
              value={body}
              onFocus={() => setTarget("body")}
              onChange={(event) => setValue("body", event.target.value)}
              className={inputClass}
            />
          </label>
          {channel === "sms" ? (
            <p className="text-xs text-gray-500">
              {body.length} caractères dans le modèle. La longueur finale dépend
              des valeurs insérées et de l’encodage SMS.
            </p>
          ) : null}
          {unknown.length ? (
            <p role="alert" className="text-xs text-red-700">
              Variables non reconnues : {unknown.join(", ")}.
            </p>
          ) : null}
          <div>
            <p className="mb-2 text-xs font-medium text-gray-600">
              Insérer une variable à la position du curseur
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(SAMPLES).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => insert(key)}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-600"
                >
                  {"{{" + key + "}}"}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
          <h3 className="font-semibold text-gray-900">Aperçu client</h3>
          <p className="mt-1 text-xs text-gray-500">
            Données fictives · Aucun message n’est envoyé.
          </p>
          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {channel === "email" ? (
              <p className="mb-4 border-b border-gray-100 pb-3 text-sm font-semibold">
                {preview(subject)}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">
              {preview(body) || "Votre message apparaîtra ici."}
            </p>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Les changements sont appliqués après enregistrement des paramètres.
          </p>
        </section>
      </div>
    </div>
  );
}
