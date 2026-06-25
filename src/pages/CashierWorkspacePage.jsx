import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAdminAuth from "../hooks/useAdminAuth";
import { cashierService } from "../services/cashierService";
import { ordersService } from "../services/ordersService";
import useSoundAlerts from "../hooks/useSoundAlerts";
import useRealtimeAlerts from "../hooks/useRealtimeAlerts";
import { ackRealtimeAlertPlayback } from "../services/realtimeAlertsService";

const CASHIER_PRESET_STORAGE_PREFIX = "cashier_workspace_preset_v2";

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function safeReadStorage(key, fallback = "ALL") {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function safeWriteStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage failures.
  }
}

function formatFcfa(value) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XOF",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function humanizeEnum(value) {
  if (!value) return "-";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function resolveAssetUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;

  const defaultApi =
    typeof window !== "undefined" && window.location.hostname === "localhost"
      ? "http://localhost:4000/api"
      : "https://appfbo-backend.onrender.com/api";
  const apiBase = import.meta.env.VITE_API_BASE_URL || defaultApi;
  const origin = String(apiBase || "").replace(/\/api\/?$/, "");

  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw}`;
}

function isImageProof(url = "") {
  return /\.(png|jpg|jpeg|webp|gif)(\?|#|$)/i.test(String(url || ""));
}

function isPdfProof(url = "") {
  return /\.pdf(\?|#|$)/i.test(String(url || ""));
}

function printProof(url) {
  if (!url || typeof window === "undefined") return;

  const popup = window.open("", "_blank", "width=980,height=800");
  if (!popup) return;

  const safeUrl = String(url).replace(/"/g, "&quot;");
  const isPdf = isPdfProof(url);
  const content = isPdf
    ? `<iframe src="${safeUrl}" style="width:100%;height:100%;border:0;"></iframe>`
    : `<img src="${safeUrl}" alt="Preuve paiement" style="max-width:100%;max-height:100%;object-fit:contain;" />`;

  popup.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Preuve de paiement</title>
    <style>
      html, body { margin: 0; height: 100%; background: #111; display:flex; align-items:center; justify-content:center; }
    </style>
  </head>
  <body>${content}</body>
</html>`);
  popup.document.close();
  popup.focus();
  popup.addEventListener("load", () => {
    setTimeout(() => {
      try {
        popup.print();
      } catch {
        // noop
      }
    }, 500);
  });
}

function mergeRowsById(groups = []) {
  const map = new Map();
  groups.flat().forEach((row) => {
    if (row?.id) map.set(row.id, row);
  });
  return Array.from(map.values());
}

function SummaryCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

function TabButton({ active, children, onClick, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-gray-900 text-white"
          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <span>{children}</span>
      {typeof count === "number" ? (
        <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/15" : "bg-gray-100"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function QuickButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-blue-600 text-white"
          : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function statusTone(status) {
  const s = String(status || "").toUpperCase();
  if (["PAID", "READY", "FULFILLED"].includes(s)) return "bg-emerald-100 text-emerald-700";
  if (["PAYMENT_PENDING", "INVOICED"].includes(s)) return "bg-amber-100 text-amber-700";
  if (s === "CANCELLED") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-700";
}

function displayAdminName(value) {
  return value?.fullName || value?.email || value?.id || "-";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function resolveReceiptAmount(row = {}) {
  return (
    row.cashierTransaction?.amountReceivedFcfa ||
    row.activePayment?.amountPaidFcfa ||
    row.activePayment?.amountExpectedFcfa ||
    row.amountExpectedFcfa ||
    row.totalFcfa ||
    0
  );
}

function printCashierReceipt(row, admin = {}) {
  if (!row?.id || typeof window === "undefined") return false;

  const popup = window.open("", "_blank", "width=420,height=720");
  if (!popup) return false;

  const cashierTx = row.cashierTransaction || {};
  const orderNumber =
    row.parcelNumber ||
    row.preorderNumber ||
    row.paymentCollectionCode ||
    row.factureReference ||
    row.id;
  const paymentMode = humanizeEnum(row.preorderPaymentMode || row.paymentProvider);
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

  const lines = [
    ["Commande", orderNumber],
    ["Client", row.fboNomComplet || "-"],
    ["FBO", row.fboNumero || "-"],
    ["Mode paiement", paymentMode],
    ["Montant payé", formatFcfa(resolveReceiptAmount(row))],
    ["Code caisse", row.paymentCollectionCode || "-"],
    ["Facture AS400", row.factureReference || "-"],
    ["N° reçu caisse", cashierTx.receiptNumber || "-"],
    ["Poste caisse", cashierTx.cashDeskLabel || "-"],
    ["Validé par", cashierName],
    ["Date paiement", formatDateTime(paidAt)],
  ];

  popup.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Reçu paiement ${escapeHtml(orderNumber)}</title>
    <style>
      @page { size: 80mm auto; margin: 5mm; }
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
      }
      .brand {
        border-bottom: 1px solid #111827;
        padding-bottom: 8px;
        text-align: center;
      }
      .logo-row {
        align-items: center;
        display: flex;
        gap: 10px;
        justify-content: center;
        margin-bottom: 6px;
      }
      .forever-logo {
        max-height: 18px;
        max-width: 38mm;
        object-fit: contain;
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
      }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header class="brand">
        <div class="logo-row">
          <img class="forever-logo" src="/forever-corporate-logo-black.png" alt="Forever" />
          <span class="logo-divider"></span>
          <img class="wave-logo" src="/wave.png" alt="Wave" />
        </div>
        <p>Reçu de paiement caisse</p>
      </header>
      <div class="title">PAIEMENT CONFIRMÉ</div>
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
      <div class="no-print">
        <button type="button" onclick="window.print()">Imprimer</button>
      </div>
    </main>
    <script>
      window.addEventListener("load", function () {
        setTimeout(function () { window.print(); }, 250);
      });
    </script>
  </body>
</html>`);
  popup.document.close();
  popup.focus();
  return true;
}

function ProcessingTable({ rows, busyId, onCashPay, onVerify, onPrepare, onSyncWave, onOpenDetails, onPrintReceipt }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Commande</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Aucune commande.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const paymentMode = String(row.preorderPaymentMode || "").toUpperCase();
                const isCash = paymentMode.includes("ESPE") || paymentMode.includes("CASH");
                const isWave = String(row.paymentProvider || "").toUpperCase() === "WAVE";
                const canCashPay = isCash && row.paymentStatus !== "PAID";
                const canVerify = !isCash && !isWave && row.status === "PAYMENT_PENDING" && row.paymentStatus !== "PAID";
                const canPrepare = row.status === "PAID";
                const canSyncWave = isWave && row.paymentStatus !== "PAID";
                const canPrintReceipt = row.paymentStatus === "PAID" || row.status === "PAID";
                const disabled = busyId === row.id;

                return (
                  <tr key={row.id} className="border-t border-gray-100 align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{row.parcelNumber || row.preorderNumber || row.paymentCollectionCode || row.factureReference || row.id}</div>
                      <div className="text-xs text-gray-500">
                        Code caisse: {row.paymentCollectionCode || "-"} • AS400: {row.factureReference || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.fboNomComplet || "-"}</div>
                      <div className="text-xs text-gray-500">FBO {row.fboNumero || "-"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{humanizeEnum(row.preorderPaymentMode)}</div>
                      <div className="text-xs text-gray-500">{row.paymentProvider || "-"}</div>
                      {row.validatedBy || row.cashierTransaction?.cashier ? (
                        <div className="mt-1 text-xs text-emerald-700">
                          Validé par {displayAdminName(row.validatedBy || row.cashierTransaction?.cashier)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{formatFcfa(row.amountExpectedFcfa || row.totalFcfa)}</div>
                      <div className="text-xs text-gray-500">Facturée le {formatDateTime(row.invoicedAt)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone(row.paymentStatus || row.status)}`}>
                        {humanizeEnum(row.paymentStatus || row.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canCashPay ? (
                          <button type="button" onClick={() => onCashPay(row)} disabled={disabled} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Encaisser</button>
                        ) : null}
                        {canVerify ? (
                          <button type="button" onClick={() => onVerify(row)} disabled={disabled} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Confirmer</button>
                        ) : null}
                        {canSyncWave ? (
                          <button type="button" onClick={() => onSyncWave(row)} disabled={disabled} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">Sync Wave</button>
                        ) : null}
                        {canPrepare ? (
                          <button type="button" onClick={() => onPrepare(row)} disabled={disabled} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Lancer prep</button>
                        ) : null}
                        {canPrintReceipt ? (
                          <button type="button" onClick={() => onPrintReceipt(row)} disabled={disabled} className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Imprimer reçu</button>
                        ) : null}
                        <button type="button" onClick={() => onOpenDetails(row.id)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">Voir</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ArchiveTable({ rows, emptyLabel, onOpenDetails, onOpenOrder, onPrintReceipt }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Commande</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Paiement</th>
              <th className="px-4 py-3">Caissière</th>
              <th className="px-4 py-3">Montant</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">{emptyLabel}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{row.parcelNumber || row.preorderNumber || row.paymentCollectionCode || row.factureReference || row.id}</div>
                    <div className="text-xs text-gray-500">{humanizeEnum(row.status)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{row.fboNomComplet || "-"}</div>
                    <div className="text-xs text-gray-500">FBO {row.fboNumero || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{humanizeEnum(row.preorderPaymentMode)}</div>
                    <div className="text-xs text-gray-500">{humanizeEnum(row.paymentStatus)} / {row.paymentProvider || "-"}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {displayAdminName(row.validatedBy || row.manualPaymentValidatedBy || row.cashierTransaction?.cashier)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Validé: {formatDateTime(row.manualPaymentValidatedAt || row.paidAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{formatFcfa(row.totalFcfa)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    <div>Créée: {formatDateTime(row.createdAt)}</div>
                    <div>Payée: {formatDateTime(row.paidAt)}</div>
                    <div>Prête: {formatDateTime(row.preparedAt)}</div>
                    <div>Clôturée: {formatDateTime(row.fulfilledAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onPrintReceipt(row)} className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white">Imprimer reçu</button>
                      <button type="button" onClick={() => onOpenDetails(row.id)} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700">Voir</button>
                      <button type="button" onClick={() => onOpenOrder(row.id)} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white">Fiche</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashCollectionDialog({
  open,
  values,
  onChange,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
          <h3 className="text-base font-semibold text-gray-900">Encaissement espèces</h3>
          <p className="mt-1 text-xs text-gray-500">
            Renseigne les informations caisse pour valider l'encaissement.
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Numéro de reçu caisse</label>
              <input
                value={values.receiptNumber}
                onChange={(e) => onChange("receiptNumber", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ex: RC-2026-00124"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Poste de caisse</label>
              <input
                value={values.cashDeskLabel}
                onChange={(e) => onChange("cashDeskLabel", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Ex: Caisse principale"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Montant reçu (FCFA)</label>
              <input
                value={values.amountReceivedFcfa}
                onChange={(e) => onChange("amountReceivedFcfa", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                inputMode="numeric"
                placeholder="Ex: 15000"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrderDrawer({ open, loading, order, onClose, onOpenOrder }) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const attempt = order?.activePayment?.attempts?.[0] || null;
  const cashierTx = order?.cashierTransactions?.[0] || null;
  const validatedBy = order?.manualPaymentValidatedBy || cashierTx?.cashier || null;
  const latestBankProof = Array.isArray(order?.bankPaymentProofs) ? order.bankPaymentProofs[0] : null;
  const [proofBlobUrl, setProofBlobUrl] = useState("");
  const [proofBlobMimeType, setProofBlobMimeType] = useState("");
  const [proofBlobLoading, setProofBlobLoading] = useState(false);
  const [proofBlobError, setProofBlobError] = useState("");

  const legacyProofUrl = resolveAssetUrl(order?.manualPaymentProofUrl || "");
  const proofUrl = proofBlobUrl || legacyProofUrl;
  const proofRef = latestBankProof?.reference || order?.manualPaymentReference || "-";
  const proofNote = latestBankProof?.note || order?.manualPaymentProofNote || "";

  useEffect(() => {
    let objectUrl = "";
    let active = true;

    async function loadProofBlob() {
      if (!order?.id || (!latestBankProof?.id && !order?.manualPaymentProofUrl)) {
        setProofBlobUrl("");
        setProofBlobMimeType("");
        setProofBlobError("");
        setProofBlobLoading(false);
        return;
      }

      try {
        setProofBlobLoading(true);
        setProofBlobError("");
        const response = latestBankProof?.id
          ? await ordersService.downloadBankProofFile(order.id, latestBankProof.id)
          : await ordersService.downloadLegacyManualProofFile(order.id);

        const mimeType = String(
          response?.headers?.["content-type"] ||
            latestBankProof?.fileMimeType ||
            "application/octet-stream",
        );
        const blob = new Blob([response.data], { type: mimeType });
        objectUrl = URL.createObjectURL(blob);
        if (!active) return;
        setProofBlobUrl(objectUrl);
        setProofBlobMimeType(mimeType);
      } catch (e) {
        if (!active) return;
        setProofBlobUrl("");
        setProofBlobMimeType("");
        setProofBlobError(e?.response?.data?.message || "Impossible de charger la preuve sécurisée.");
      } finally {
        if (active) setProofBlobLoading(false);
      }
    }

    loadProofBlob();

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [order?.id, latestBankProof?.id, latestBankProof?.fileMimeType, order?.manualPaymentProofUrl]);

  const showPdfPreview = proofBlobUrl
    ? String(proofBlobMimeType || "").toLowerCase().includes("pdf")
    : isPdfProof(proofUrl);
  const showImagePreview = proofBlobUrl
    ? String(proofBlobMimeType || "").toLowerCase().startsWith("image/")
    : isImageProof(proofUrl);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Détail commande caisse</h3>
            <div className="text-xs text-gray-500">Consultation complète après encaissement incluse</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm">Fermer</button>
        </div>

        {loading ? (
          <div className="p-4 text-sm text-gray-500">Chargement...</div>
        ) : !order ? (
          <div className="p-4 text-sm text-gray-500">Aucune donnée.</div>
        ) : (
          <div className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <SummaryCard label="Commande" value={order.parcelNumber || order.preorderNumber || order.id} />
              <SummaryCard label="Montant" value={formatFcfa(order.totalFcfa)} />
            </div>

            <div className="rounded-xl border border-gray-200 p-4 text-sm">
              <div className="grid gap-2 md:grid-cols-2">
                <div><strong>Client:</strong> {order.fboNomComplet || "-"} (FBO {order.fboNumero || "-"})</div>
                <div><strong>Statut:</strong> {humanizeEnum(order.status)} / {humanizeEnum(order.paymentStatus)}</div>
                <div><strong>Mode paiement:</strong> {humanizeEnum(order.preorderPaymentMode)} ({order.paymentProvider || "-"})</div>
                <div><strong>Téléphone payeur:</strong> {attempt?.providerPayerPhone || "-"}</div>
                <div><strong>N° reçu caisse:</strong> {cashierTx?.receiptNumber || "-"}</div>
                <div><strong>Poste caisse:</strong> {cashierTx?.cashDeskLabel || "-"}</div>
                <div><strong>Validé par:</strong> {displayAdminName(validatedBy)}</div>
                <div><strong>Code caisse:</strong> {order.paymentCollectionCode || "-"}</div>
                <div><strong>Facture AS400:</strong> {order.factureReference || "-"}</div>
                <div><strong>Paiement confirmé:</strong> {formatDateTime(order.manualPaymentValidatedAt || order.paidAt)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4 text-sm">
              <div className="mb-2 text-sm font-semibold text-gray-900">Preuve de paiement</div>
              {proofBlobLoading ? (
                <div className="text-gray-500">Chargement sécurisé de la preuve…</div>
              ) : proofUrl ? (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-2">
                    <div><strong>Référence:</strong> {proofRef}</div>
                    <div><strong>Déposée le:</strong> {formatDateTime(latestBankProof?.submittedAt || order?.manualPaymentReceivedAt)}</div>
                  </div>

                  {proofNote ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                      {proofNote}
                    </div>
                  ) : null}

                  {showPdfPreview ? (
                    <div className="h-72 overflow-hidden rounded-lg border border-gray-200 bg-white">
                      <iframe title="Aperçu preuve PDF" src={proofUrl} className="h-full w-full border-0" />
                    </div>
                  ) : showImagePreview ? (
                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white p-2">
                      <img src={proofUrl} alt="Preuve de paiement" className="max-h-72 w-full object-contain" />
                    </div>
                  ) : (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      Aperçu non disponible pour ce format. Ouvrez le fichier pour vérification.
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Ouvrir la preuve
                    </a>
                    <button
                      type="button"
                      onClick={() => printProof(proofUrl)}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Imprimer la preuve
                    </button>
                  </div>

                  {proofBlobError ? (
                    <div className="text-xs text-red-600">{proofBlobError}</div>
                  ) : null}
                </div>
              ) : (
                <div className="text-gray-500">Aucune preuve bancaire déposée pour cette commande.</div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200">
              <div className="border-b bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">Produits de la commande</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Produit</th>
                      <th className="px-3 py-2">Qté</th>
                      <th className="px-3 py-2">Total ligne</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-center text-gray-500">Aucun produit</td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-mono text-xs">{item.productSkuSnapshot || item.product?.sku || "-"}</td>
                          <td className="px-3 py-2">{item.productNameSnapshot || item.product?.nom || "Produit"}</td>
                          <td className="px-3 py-2 font-semibold">{Number(item.qty || 0)}</td>
                          <td className="px-3 py-2">{formatFcfa(item.lineTotalFcfa)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onOpenOrder(order.id)} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white">
                Ouvrir la fiche complète
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

export default function CashierWorkspacePage() {
  const navigate = useNavigate();
  const { admin, role } = useAdminAuth();
  const presetStorageKey = useMemo(() => `${CASHIER_PRESET_STORAGE_PREFIX}:${role || "UNKNOWN"}`, [role]);
  const searchDebounceInitializedRef = useRef(false);
  const cashDialogResolverRef = useRef(null);
  const loadRef = useRef(null);
  const firstAlertLoadRef = useRef(true);
  const previousAlertSnapshotRef = useRef(null);
  const attentionTimerRef = useRef(null);
  const sound = useSoundAlerts("cashier");

  useRealtimeAlerts({
    onEvent: async (event) => {
      const eventKey = String(event?.eventKey || "");
      if (eventKey === "cashier_collect_new") {
        const played = await sound.notify("cashier_collect_new", {
          signature: `rt:${eventKey}:${event?.orderId || event?.at || ""}`,
          cooldownMs: 20000,
        });
        raiseAttentionAlert("collect", 1, "realtime");
        if (played) {
          ackRealtimeAlertPlayback({
            workspace: "cashier",
            eventKey,
            orderId: event?.orderId || null,
            played: true,
          }).catch(() => {});
        }
        loadRef.current?.({ silent: true });
        return;
      }
      if (eventKey === "cashier_launch_new") {
        const played = await sound.notify("cashier_launch_new", {
          signature: `rt:${eventKey}:${event?.orderId || event?.at || ""}`,
          cooldownMs: 15000,
        });
        raiseAttentionAlert("launch", 1, "realtime");
        if (played) {
          ackRealtimeAlertPlayback({
            workspace: "cashier",
            eventKey,
            orderId: event?.orderId || null,
            played: true,
          }).catch(() => {});
        }
        loadRef.current?.({ silent: true });
      }
    },
  });

  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [, setAttentionAlert] = useState(null);

  const [activeTab, setActiveTab] = useState("processing");
  const [quickPreset, setQuickPreset] = useState("ALL");

  const [query, setQuery] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [completedRows, setCompletedRows] = useState([]);
  const [searchRows, setSearchRows] = useState([]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerOrder, setDrawerOrder] = useState(null);
  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashDialogValues, setCashDialogValues] = useState({
    receiptNumber: "",
    cashDeskLabel: "",
    amountReceivedFcfa: "",
  });

  const toCollect = workspace?.toCollect || [];
  const toLaunchPreparation = workspace?.toLaunchPreparation || [];
  const validationSummary = workspace?.validationSummary || {};
  const canViewConsolidated = Boolean(workspace?.permissions?.canViewConsolidated);
  const personalValidationSummary = validationSummary.personal || validationSummary;
  const generalValidationSummary = validationSummary.general || validationSummary;
  const displayedValidationSummary = canViewConsolidated ? generalValidationSummary : personalValidationSummary;
  const validationPeriodLabel = dateFrom || dateTo ? "sur période" : "aujourd'hui";
  const activeFilterCount = [query, paymentMode, dateFrom, dateTo].filter(Boolean).length;

  const raiseAttentionAlert = (kind = "collect", count = 1, source = "poll") => {
    if (attentionTimerRef.current) {
      clearTimeout(attentionTimerRef.current);
      attentionTimerRef.current = null;
    }

    const safeCount = Math.max(1, Number(count) || 1);
    const isLaunch = kind === "launch";
    setAttentionAlert({
      source,
      tone: isLaunch ? "blue" : "indigo",
      soundEventKey: isLaunch ? "cashier_launch_new" : "cashier_collect_new",
      title: isLaunch
        ? "Nouvelle commande à lancer en préparation"
        : "Nouveau paiement à traiter en caisse",
      message: isLaunch
        ? `${safeCount} commande${safeCount > 1 ? "s" : ""} payée${safeCount > 1 ? "s" : ""} attend${safeCount > 1 ? "ent" : ""} le lancement de la préparation.`
        : `${safeCount} commande${safeCount > 1 ? "s" : ""} nécessite${safeCount > 1 ? "nt" : ""} un encaissement ou une confirmation de paiement.`,
    });

    attentionTimerRef.current = setTimeout(() => {
      setAttentionAlert(null);
      attentionTimerRef.current = null;
    }, 45000);
  };

  const load = async (overrides = {}) => {
    const silent = Boolean(overrides.silent);
    try {
      if (!silent) setLoading(true);
      setError("");
      const qValue = overrides.query ?? query;
      const paymentModeValue = overrides.paymentMode ?? paymentMode;
      const fromValue = overrides.dateFrom ?? dateFrom;
      const toValue = overrides.dateTo ?? dateTo;

      const common = {
        q: qValue || undefined,
        paymentMode: paymentModeValue || undefined,
        dateFrom: fromValue || undefined,
        dateTo: toValue || undefined,
      };

      const [workspaceRes, paidRes, readyRes, fulfilledRes, searchRes] = await Promise.all([
        cashierService.getWorkspace(common),
        ordersService.getAll({ ...common, status: "PAID", page: 1, pageSize: 60, sort: "updatedAt", dir: "desc" }),
        ordersService.getAll({ ...common, status: "READY", page: 1, pageSize: 60, sort: "updatedAt", dir: "desc" }),
        ordersService.getAll({ ...common, status: "FULFILLED", page: 1, pageSize: 60, sort: "updatedAt", dir: "desc" }),
        qValue?.trim()
          ? ordersService.getAll({ ...common, page: 1, pageSize: 80, sort: "updatedAt", dir: "desc" })
          : Promise.resolve({ data: [] }),
      ]);

      const defaultScope = !qValue && !paymentModeValue && !fromValue && !toValue;

      if (!defaultScope) {
        firstAlertLoadRef.current = true;
        previousAlertSnapshotRef.current = null;
      } else {
        const snapshot = {
          toCollect: new Set((workspaceRes?.toCollect || []).map((row) => row.id)),
          toLaunch: new Set((workspaceRes?.toLaunchPreparation || []).map((row) => row.id)),
        };

        if (!firstAlertLoadRef.current && previousAlertSnapshotRef.current) {
          const prev = previousAlertSnapshotRef.current;
          const newCollectCount = [...snapshot.toCollect].filter((id) => !prev.toCollect.has(id)).length;
          const newLaunchCount = [...snapshot.toLaunch].filter((id) => !prev.toLaunch.has(id)).length;

          if (newLaunchCount > 0) {
            sound.notify("cashier_launch_new", {
              signature: `launch:${newLaunchCount}:${snapshot.toLaunch.size}`,
              cooldownMs: 30000,
            });
            raiseAttentionAlert("launch", newLaunchCount, "poll");
          } else if (newCollectCount > 0) {
            sound.notify("cashier_collect_new", {
              signature: `collect:${newCollectCount}:${snapshot.toCollect.size}`,
              cooldownMs: 45000,
            });
            raiseAttentionAlert("collect", newCollectCount, "poll");
          }
        }

        firstAlertLoadRef.current = false;
        previousAlertSnapshotRef.current = snapshot;
      }

      setWorkspace(workspaceRes);
      setCompletedRows(
        Array.isArray(workspaceRes?.journal) && workspaceRes.journal.length > 0
          ? workspaceRes.journal
          : mergeRowsById([paidRes?.data || [], readyRes?.data || [], fulfilledRes?.data || []]),
      );
      setSearchRows(Array.isArray(searchRes?.data) ? searchRes.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger l'espace caisse.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
      loadRef.current?.({ silent: true });
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (attentionTimerRef.current) {
        clearTimeout(attentionTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!searchDebounceInitializedRef.current) {
        searchDebounceInitializedRef.current = true;
        return;
      }
      load({ query });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    const savedPreset = safeReadStorage(presetStorageKey, "ALL");
    const today = getTodayIsoDate();
    if (savedPreset === "TODAY") {
      setQuickPreset("TODAY");
      setPaymentMode("");
      setDateFrom(today);
      setDateTo(today);
      load({ paymentMode: "", dateFrom: today, dateTo: today });
      return;
    }
    if (savedPreset === "CASH") {
      setQuickPreset("CASH");
      setPaymentMode("ESPECES");
      setDateFrom("");
      setDateTo("");
      load({ paymentMode: "ESPECES", dateFrom: "", dateTo: "" });
      return;
    }
    if (savedPreset === "WAVE") {
      setQuickPreset("WAVE");
      setPaymentMode("WAVE");
      setDateFrom("");
      setDateTo("");
      load({ paymentMode: "WAVE", dateFrom: "", dateTo: "" });
      return;
    }
    setQuickPreset("ALL");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    load({ paymentMode: "", dateFrom: "", dateTo: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetStorageKey]);

  useEffect(() => {
    safeWriteStorage(presetStorageKey, quickPreset);
  }, [presetStorageKey, quickPreset]);

  const applyPreset = (preset) => {
    const today = getTodayIsoDate();
    if (preset === "TODAY") {
      setQuickPreset("TODAY");
      setPaymentMode("");
      setDateFrom(today);
      setDateTo(today);
      load({ paymentMode: "", dateFrom: today, dateTo: today });
      return;
    }
    if (preset === "CASH") {
      setQuickPreset("CASH");
      setPaymentMode("ESPECES");
      setDateFrom("");
      setDateTo("");
      load({ paymentMode: "ESPECES", dateFrom: "", dateTo: "" });
      return;
    }
    if (preset === "WAVE") {
      setQuickPreset("WAVE");
      setPaymentMode("WAVE");
      setDateFrom("");
      setDateTo("");
      load({ paymentMode: "WAVE", dateFrom: "", dateTo: "" });
      return;
    }
    setQuickPreset("ALL");
    setPaymentMode("");
    setDateFrom("");
    setDateTo("");
    load({ paymentMode: "", dateFrom: "", dateTo: "" });
  };

  const runAction = async (orderId, action) => {
    try {
      setBusyId(orderId);
      setError("");
      setInfo("");
      await action();
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Action impossible.");
    } finally {
      setBusyId("");
    }
  };

  const askCashCollection = (row) =>
    new Promise((resolve) => {
      cashDialogResolverRef.current = resolve;
      setCashDialogValues({
        receiptNumber: String(row?.cashierTransaction?.receiptNumber || row?.paymentCollectionCode || row?.factureReference || "").trim(),
        cashDeskLabel: String(row?.cashierTransaction?.cashDeskLabel || "Caisse principale").trim(),
        amountReceivedFcfa: String(row?.amountExpectedFcfa || row?.totalFcfa || "").trim(),
      });
      setCashDialogOpen(true);
    });

  const closeCashDialog = (payload = null) => {
    setCashDialogOpen(false);
    const resolver = cashDialogResolverRef.current;
    cashDialogResolverRef.current = null;
    if (typeof resolver === "function") resolver(payload);
  };

  const openDetails = async (orderId) => {
    try {
      setDrawerOpen(true);
      setDrawerLoading(true);
      const data = await ordersService.getById(orderId);
      setDrawerOrder(data);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger le détail commande.");
    } finally {
      setDrawerLoading(false);
    }
  };

  const handlePrintReceipt = (row) => {
    const printed = printCashierReceipt(row, admin);
    if (!printed) {
      setError("Impossible d'ouvrir la fenêtre d'impression. Vérifie que le navigateur autorise les popups.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Espace Caisse</h1>
          <p className="mt-1 text-sm text-gray-500">Interface simplifiée: traiter, consulter les terminées, rechercher toute commande.</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
          <div className="font-semibold text-gray-900">{admin?.fullName || "Caissière"}</div>
          <div className="text-gray-500">{humanizeEnum(role)}</div>
        </div>
      </div>

      <div className={canViewConsolidated ? "grid gap-4 md:grid-cols-4" : "grid gap-4 md:grid-cols-3"}>
        <SummaryCard label="À encaisser" value={workspace?.collectionSummary?.total || 0} hint="Paiements à traiter" />
        <SummaryCard label="À lancer préparation" value={workspace?.launchSummary?.total || 0} hint="Déjà payées" />
        <SummaryCard
          label={canViewConsolidated ? "Validé par moi" : `Validé ${validationPeriodLabel}`}
          value={formatFcfa(personalValidationSummary.totalReceivedFcfa || 0)}
          hint={`${personalValidationSummary.total || 0} facture${Number(personalValidationSummary.total || 0) > 1 ? "s" : ""} validée${Number(personalValidationSummary.total || 0) > 1 ? "s" : ""}`}
        />
        {canViewConsolidated ? (
          <SummaryCard
            label="Total général caisse"
            value={formatFcfa(generalValidationSummary.totalReceivedFcfa || 0)}
            hint={`${generalValidationSummary.total || 0} facture${Number(generalValidationSummary.total || 0) > 1 ? "s" : ""} validée${Number(generalValidationSummary.total || 0) > 1 ? "s" : ""}`}
          />
        ) : null}
      </div>

      {Array.isArray(displayedValidationSummary.byPaymentMode) && displayedValidationSummary.byPaymentMode.length > 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-emerald-950">
                Bilan caisse {dateFrom || dateTo ? "de la période" : "du jour"}
              </div>
              <div className="mt-1 text-xs text-emerald-800">
                {canViewConsolidated
                  ? "Total général des paiements validés par toutes les caissières."
                  : "Total des paiements validés par vous."}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {displayedValidationSummary.byPaymentMode.map((item) => (
                <span
                  key={item.paymentMode}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800"
                >
                  {humanizeEnum(item.paymentMode)}: {formatFcfa(item.amountFcfa)}
                </span>
              ))}
            </div>
          </div>
          {Array.isArray(displayedValidationSummary.byCashier) && displayedValidationSummary.byCashier.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-emerald-200 pt-3">
              {displayedValidationSummary.byCashier.map((item) => (
                <span
                  key={item.cashierId}
                  className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-900"
                >
                  {item.cashierName}: {formatFcfa(item.amountFcfa)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative xl:col-span-2">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Code caisse, nom, facture AS400, précommande, colis, téléphone, reçu"
              className="w-full rounded-xl border border-gray-300 py-2 pl-9 pr-3 text-sm"
            />
          </div>
          <select
            value={paymentMode}
            onChange={(e) => {
              const next = e.target.value;
              setPaymentMode(next);
              setQuickPreset("CUSTOM");
              load({ paymentMode: next });
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">Tous paiements</option>
            <option value="ESPECES">Espèces</option>
            <option value="WAVE">Wave</option>
            <option value="ORANGE_MONEY">Orange Money</option>
            <option value="BANK_TRANSFER">Virement bancaire</option>
            <option value="ECOBANK_PAY">Ecobank Pay</option>
            <option value="PI_SPI">PI SPI</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              const next = e.target.value;
              setDateFrom(next);
              setQuickPreset("CUSTOM");
              load({ dateFrom: next });
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            type="date"
            min={dateFrom || undefined}
            value={dateTo}
            onChange={(e) => {
              const next = e.target.value;
              setDateTo(next);
              setQuickPreset("CUSTOM");
              load({ dateTo: next });
            }}
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <QuickButton active={quickPreset === "ALL"} onClick={() => applyPreset("ALL")}>Tous</QuickButton>
            <QuickButton active={quickPreset === "TODAY"} onClick={() => applyPreset("TODAY")}>Aujourd'hui</QuickButton>
            <QuickButton active={quickPreset === "CASH"} onClick={() => applyPreset("CASH")}>Espèces</QuickButton>
            <QuickButton active={quickPreset === "WAVE"} onClick={() => applyPreset("WAVE")}>Wave</QuickButton>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={load} disabled={loading} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{loading ? "Chargement..." : "Appliquer"}</button>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setPaymentMode("");
                setDateFrom("");
                setDateTo("");
                setQuickPreset("ALL");
                load({ query: "", paymentMode: "", dateFrom: "", dateTo: "" });
              }}
              disabled={loading}
              className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Réinitialiser
            </button>
          </div>
        </div>
        <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
          {toCollect.length + toLaunchPreparation.length} commande{toCollect.length + toLaunchPreparation.length > 1 ? "s" : ""} à traiter, {completedRows.length} terminée{completedRows.length > 1 ? "s" : ""}, {searchRows.length} résultat{searchRows.length > 1 ? "s" : ""} de recherche
          {activeFilterCount > 0
            ? ` avec ${activeFilterCount} filtre${activeFilterCount > 1 ? "s" : ""} actif${activeFilterCount > 1 ? "s" : ""}.`
            : " sans filtre actif."}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <TabButton active={activeTab === "processing"} onClick={() => setActiveTab("processing")} count={toCollect.length + toLaunchPreparation.length}>À traiter</TabButton>
        <TabButton active={activeTab === "completed"} onClick={() => setActiveTab("completed")} count={completedRows.length}>Terminées</TabButton>
        <TabButton active={activeTab === "search"} onClick={() => setActiveTab("search")} count={searchRows.length}>Recherche</TabButton>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {info ? <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">{info}</div> : null}

      {activeTab === "processing" ? (
        <div className="space-y-4">
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">À encaisser / confirmer</h2>
            <ProcessingTable
              rows={toCollect}
              busyId={busyId}
              onOpenDetails={openDetails}
              onPrintReceipt={handlePrintReceipt}
              onCashPay={(row) =>
                runAction(row.id, async () => {
                  const payload = await askCashCollection(row);
                  if (!payload) return;
                  await ordersService.pay(row.id, {
                    reference: row.factureReference || row.preorderNumber || row.id,
                    providerReference:
                      row.paymentCollectionCode || row.factureReference || row.preorderNumber || row.id,
                    note: "Encaissement espèces depuis l'espace caisse",
                    ...payload,
                  });
                  printCashierReceipt(
                    {
                      ...row,
                      status: "PAID",
                      paymentStatus: "PAID",
                      paidAt: new Date().toISOString(),
                      manualPaymentValidatedAt: new Date().toISOString(),
                      cashierTransaction: {
                        ...(row.cashierTransaction || {}),
                        receiptNumber: payload.receiptNumber,
                        cashDeskLabel: payload.cashDeskLabel || row.cashierTransaction?.cashDeskLabel,
                        amountReceivedFcfa: payload.amountReceivedFcfa,
                        cashier: admin,
                        createdAt: new Date().toISOString(),
                      },
                      validatedBy: admin,
                    },
                    admin,
                  );
                  setInfo("Paiement espèces enregistré.");
                })
              }
              onVerify={(row) =>
                runAction(row.id, async () => {
                  await ordersService.verifyPayment(row.id, {
                    note: "Paiement confirmé depuis l'espace caisse",
                  });
                  setInfo("Paiement confirmé.");
                })
              }
              onPrepare={(row) =>
                runAction(row.id, async () => {
                  await cashierService.prepareForPacking(row.id, {
                    packingNote: "Commande validée par la caisse pour préparation",
                  });
                  setInfo("Commande transmise au préparateur.");
                })
              }
              onSyncWave={(row) =>
                runAction(row.id, async () => {
                  await ordersService.syncWavePaymentStatus(row.id);
                  setInfo("Statut Wave synchronisé.");
                })
              }
            />
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-gray-900">À lancer en préparation</h2>
            <ProcessingTable
              rows={toLaunchPreparation}
              busyId={busyId}
              onOpenDetails={openDetails}
              onPrintReceipt={handlePrintReceipt}
              onCashPay={() => {}}
              onVerify={() => {}}
              onPrepare={(row) =>
                runAction(row.id, async () => {
                  await cashierService.prepareForPacking(row.id, {
                    packingNote: "Commande validée par la caisse pour préparation",
                  });
                  setInfo("Commande transmise au préparateur.");
                })
              }
              onSyncWave={() => {}}
            />
          </section>
        </div>
      ) : null}

      {activeTab === "completed" ? (
        <ArchiveTable
          rows={completedRows}
          emptyLabel="Aucune commande terminée avec ces filtres."
          onOpenDetails={openDetails}
          onOpenOrder={(id) => navigate(`/orders/${id}?tab=payment`)}
          onPrintReceipt={handlePrintReceipt}
        />
      ) : null}

      {activeTab === "search" ? (
        <ArchiveTable
          rows={searchRows}
          emptyLabel={query?.trim() ? "Aucun résultat pour cette recherche." : "Saisis une recherche pour interroger toutes les commandes."}
          onOpenDetails={openDetails}
          onOpenOrder={(id) => navigate(`/orders/${id}?tab=payment`)}
          onPrintReceipt={handlePrintReceipt}
        />
      ) : null}

      <OrderDrawer
        open={drawerOpen}
        loading={drawerLoading}
        order={drawerOrder}
        onClose={() => {
          setDrawerOpen(false);
          setDrawerOrder(null);
        }}
        onOpenOrder={(id) => navigate(`/orders/${id}?tab=payment`)}
      />

      <CashCollectionDialog
        open={cashDialogOpen}
        values={cashDialogValues}
        onChange={(field, value) =>
          setCashDialogValues((prev) => ({
            ...prev,
            [field]: value,
          }))
        }
        onCancel={() => closeCashDialog(null)}
        onConfirm={() => {
          const receiptNumber = String(cashDialogValues.receiptNumber || "").trim();
          const amountReceivedFcfa = String(cashDialogValues.amountReceivedFcfa || "").trim();
          if (!receiptNumber || !amountReceivedFcfa) {
            setError("Le numéro de reçu et le montant reçu sont obligatoires.");
            return;
          }
          closeCashDialog({
            receiptNumber,
            cashDeskLabel: String(cashDialogValues.cashDeskLabel || "").trim() || undefined,
            amountReceivedFcfa,
          });
        }}
      />
    </div>
  );
}
