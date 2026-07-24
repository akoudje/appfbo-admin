// admin-app/src/utils/cashierReceipt.js
// Logique de génération du reçu caisse (utilisée à la fois pour l'impression
// d'un reçu unique depuis CashierWorkspacePage et pour l'impression groupée
// de tous les reçus payés de la journée).

export function formatFcfa(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function humanizeEnum(value) {
  if (!value) return "-";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export function displayAdminName(value) {
  return value?.fullName || value?.email || value?.id || "-";
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function resolveReceiptAmount(row = {}) {
  return (
    row.cashierTransaction?.amountReceivedFcfa ||
    row.activePayment?.amountPaidFcfa ||
    row.activePayment?.amountExpectedFcfa ||
    row.amountExpectedFcfa ||
    row.totalFcfa ||
    0
  );
}

export function isSwitchedToCash(row = {}) {
  const logs = Array.isArray(row.logs) ? row.logs : [];
  return logs.some((log) => {
    const meta = log?.meta || {};
    return (
      log?.action === "WAIT_CUSTOMER_DATA" &&
      meta.toPreorderPaymentMode === "ESPECES" &&
      meta.fromPreorderPaymentMode &&
      meta.fromPreorderPaymentMode !== "ESPECES"
    );
  });
}

export function resolveOriginalPaymentMode(row = {}) {
  const logs = Array.isArray(row.logs) ? row.logs : [];
  const switchLog = logs.find((log) => {
    const meta = log?.meta || {};
    return (
      log?.action === "WAIT_CUSTOMER_DATA" &&
      meta.toPreorderPaymentMode === "ESPECES" &&
      meta.fromPreorderPaymentMode &&
      meta.fromPreorderPaymentMode !== "ESPECES"
    );
  });

  return switchLog?.meta?.fromPreorderPaymentMode || row.preorderPaymentMode || row.paymentProvider || "";
}

export const RECEIPT_STYLE_CSS = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #111827;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 11px;
  }
  .receipt {
    width: 70mm;
    margin: 0 auto;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .receipt + .receipt {
    margin-top: 8mm;
    page-break-before: always;
    break-before: page;
  }
  .brand {
    border-bottom: 1px solid #111827;
    padding-bottom: 8px;
    text-align: center;
  }
  .logo-row {
    align-items: center;
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-bottom: 6px;
  }
  .forever-brand {
    align-items: center;
    color: #000;
    display: inline-flex;
    gap: 4px;
    line-height: 1;
  }
  .forever-logo {
    filter: grayscale(1) contrast(4) brightness(0);
    max-height: 14px;
    max-width: 13mm;
    object-fit: contain;
    -webkit-filter: grayscale(1) contrast(4) brightness(0);
  }
  .forever-text {
    color: #000;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: .12em;
  }
  .wave-logo {
    max-height: 22px;
    max-width: 18mm;
    object-fit: contain;
  }
  .logo-divider {
    background: #d1d5db;
    display: inline-block;
    height: 18px;
    width: 1px;
  }
  .brand p {
    margin: 4px 0 0;
    color: #4b5563;
    font-size: 10px;
  }
  .title {
    margin: 10px 0;
    border: 1px solid #111827;
    padding: 6px;
    text-align: center;
    font-size: 13px;
    font-weight: 700;
  }
  .row {
    display: grid;
    grid-template-columns: 28mm 1fr;
    gap: 4px;
    border-bottom: 1px dashed #d1d5db;
    padding: 5px 0;
  }
  .label {
    color: #4b5563;
    font-weight: 700;
  }
  .value {
    overflow-wrap: anywhere;
    text-align: right;
    font-weight: 700;
  }
  .amount {
    margin: 10px 0;
    border: 2px solid #111827;
    padding: 8px;
    text-align: center;
  }
  .amount .value {
    display: block;
    text-align: center;
    font-size: 18px;
  }
  .footer {
    margin-top: 12px;
    color: #4b5563;
    text-align: center;
    font-size: 10px;
  }
  .no-print {
    margin-top: 12px;
    text-align: center;
  }
  button {
    border: 0;
    background: #059669;
    color: white;
    cursor: pointer;
    font-weight: 700;
    padding: 8px 12px;
  }
  @media print {
    .no-print { display: none; }
    .forever-logo {
      filter: grayscale(1) contrast(4) brightness(0);
      -webkit-filter: grayscale(1) contrast(4) brightness(0);
    }
  }
`;

/**
 * Construit le markup HTML du bloc "receipt" (sans doctype/head) pour une
 * commande donnée. Réutilisé pour l'impression unique et l'impression
 * groupée de tous les reçus payés.
 */
export function buildReceiptBodyHtml(row, admin = {}) {
  const cashierTx = row.cashierTransaction || {};
  const orderNumber =
    row.parcelNumber ||
    row.preorderNumber ||
    row.paymentCollectionCode ||
    row.factureReference ||
    row.id;
  const switchedToCash = isSwitchedToCash(row);
  const originalPaymentMode = resolveOriginalPaymentMode(row);
  const paymentMode = switchedToCash
    ? `${humanizeEnum(originalPaymentMode)} validé à la caisse`
    : humanizeEnum(row.preorderPaymentMode || row.paymentProvider);
  const isWave =
    String(row.paymentProvider || "").toUpperCase() === "WAVE" ||
    String(row.preorderPaymentMode || "").toUpperCase() === "WAVE" ||
    String(row.activePayment?.provider || "").toUpperCase() === "WAVE";
  const waveDetails = {
    payerPhone:
      row.payerPhone ||
      row.latestAttempt?.providerPayerPhone ||
      row.activePayment?.providerPayerPhone ||
      "-",
    transactionId:
      row.activePayment?.providerTxnId ||
      row.latestAttempt?.providerTransactionId ||
      row.cashierTransaction?.providerReference ||
      "-",
    sessionId:
      row.activePayment?.providerReference ||
      row.latestAttempt?.providerSessionId ||
      "-",
    providerStatus:
      row.latestAttempt?.providerStatusLabel ||
      row.activePayment?.status ||
      row.paymentStatus ||
      "-",
  };
  const paidAt =
    row.manualPaymentValidatedAt ||
    row.paidAt ||
    row.activePayment?.paidAt ||
    cashierTx.createdAt ||
    new Date().toISOString();
  const cashierName = displayAdminName(
    row.validatedBy ||
      row.manualPaymentValidatedBy ||
      cashierTx.cashier ||
      admin,
  );

  const receiptTitle = switchedToCash
    ? "VALIDATION DE PAIEMENT"
    : isWave
      ? "REÇU PAIEMENT WAVE"
      : "REÇU ENCAISSEMENT CAISSE";
  const receiptSubtitle = switchedToCash
    ? "Validation caisse d'un paiement déjà effectué"
    : isWave
      ? "Paiement électronique confirmé"
      : "Encaissement au comptoir";

  const lines = [
    ["Commande", orderNumber],
    ["Client", row.fboNomComplet || "-"],
    ["FBO", row.fboNumero || "-"],
    ["Mode paiement", paymentMode],
    ...(switchedToCash ? [["Mode d'origine", humanizeEnum(originalPaymentMode)]] : []),
    ["Montant payé", formatFcfa(resolveReceiptAmount(row))],
    ["Code caisse", row.paymentCollectionCode || "-"],
    ["Facture AS400", row.factureReference || "-"],
    ["N° reçu caisse", cashierTx.receiptNumber || "-"],
    ["Poste caisse", cashierTx.cashDeskLabel || "-"],
    ...(isWave
      ? [
          ["Transaction Wave", waveDetails.transactionId],
          ["Session Wave", waveDetails.sessionId],
          ["Numéro payeur Wave", waveDetails.payerPhone],
          ["Statut provider", waveDetails.providerStatus],
        ]
      : []),
    ["Validé par", cashierName],
    ["Date paiement", formatDateTime(paidAt)],
  ];

  return `
    <main class="receipt">
      <header class="brand">
        <div class="logo-row">
          <span class="forever-brand" aria-label="Forever">
            <img class="forever-logo" src="/logo-forever.png" alt="" />
            <span class="forever-text">FOREVER</span>
          </span>
          ${isWave ? '<span class="logo-divider"></span><img class="wave-logo" src="/wave.png" alt="Wave" />' : ""}
        </div>
        <p>${escapeHtml(receiptSubtitle)}</p>
      </header>
      <div class="title">${escapeHtml(receiptTitle)}</div>
      <section class="amount">
        <span class="label">Montant payé</span>
        <span class="value">${escapeHtml(formatFcfa(resolveReceiptAmount(row)))}</span>
      </section>
      ${lines
        .filter(([label]) => label !== "Montant payé")
        .map(
          ([label, value]) => `
            <div class="row">
              <div class="label">${escapeHtml(label)}</div>
              <div class="value">${escapeHtml(value)}</div>
            </div>
          `,
        )
        .join("")}
      <p class="footer">
        Document généré depuis l'espace caisse le ${escapeHtml(formatDateTime(new Date()))}.
      </p>
    </main>
  `;
}
