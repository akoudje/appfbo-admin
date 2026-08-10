import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Link as LinkIcon, Plus, Printer, QrCode, RefreshCw, Search, Send, X } from "lucide-react";
import { externalPaymentLinksService } from "../services/externalPaymentLinksService";

const PAGE_SIZE = 50;
const POLL_INTERVAL_MS = 15000;
const FILTER_DEBOUNCE_MS = 400;

const EXPIRY_OPTIONS = [
  { value: "", label: "Sans expiration" },
  { value: "1", label: "1 heure" },
  { value: "4", label: "4 heures" },
  { value: "24", label: "24 heures" },
  { value: "72", label: "3 jours" },
];

function emptyForm() {
  return {
    customerPhone: "",
    baseAmountFcfa: "",
    paymentMethod: "WAVE",
    invoiceReference: "",
    title: "Paiement commande Forever",
    instructions: "",
    expiresInHours: "24",
  };
}

function inputClass() {
  return "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";
}

function formatFcfa(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function computeWaveFee(value) {
  const base = Number.parseInt(value, 10);
  if (!Number.isFinite(base) || base <= 0) return 0;
  return Math.ceil(base * 0.01);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getExternalWaveDetails(link = {}) {
  const payload = link.providerPayloadJson || {};
  return {
    provider: link.provider || link.paymentMethod || "WAVE",
    statusLabel:
      link.providerStatusLabel ||
      payload.payment_status_label ||
      payload.checkout_status_label ||
      payload.payment_status ||
      payload.checkout_status ||
      link.providerStatus ||
      link.status ||
      "—",
    sessionId:
      link.providerSessionId ||
      payload.id ||
      payload.checkout_session?.id ||
      "—",
    transactionId:
      link.providerTransactionId ||
      payload.transaction_id ||
      payload.checkout_session?.transaction_id ||
      "—",
    payerPhone:
      link.providerPayerPhone ||
      payload.payer_phone ||
      payload.customer_msisdn ||
      payload.phone_number ||
      payload.payment_method?.phone_number ||
      payload.checkout_session?.payer_phone ||
      "—",
    paidAt:
      link.paidAt ||
      payload.when_completed ||
      payload.completed_at ||
      payload.paid_at ||
      null,
  };
}

function printExternalWaveReceipt(link = {}) {
  if (!link?.id || typeof window === "undefined") return false;
  const details = getExternalWaveDetails(link);
  const popup = window.open("", "_blank", "width=430,height=720");
  if (!popup) return false;

  const rows = [
    ["Référence", link.reference || "-"],
    ["Facture", link.invoiceReference || "-"],
    ["Client", link.customerName || "-"],
    ["Téléphone client", link.customerPhone || "-"],
    ["FBO", link.customerFboNumber || "-"],
    ["Source", link.source === "QR_FORM" ? "QR" : "Admin"],
    ["Provider", details.provider],
    ["Statut Wave", details.statusLabel],
    ["Session Wave", details.sessionId],
    ["Transaction Wave", details.transactionId],
    ["Numéro payeur Wave", details.payerPhone],
    ["Date paiement", formatDateTime(details.paidAt)],
  ];

  popup.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Reçu paiement ${escapeHtml(link.reference || "")}</title>
    <style>
      @page { size: 80mm auto; margin: 5mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 11px; }
      .receipt { width: 70mm; margin: 0 auto; }
      .brand { border-bottom: 1px solid #111827; padding-bottom: 8px; text-align: center; }
      .logo-row { align-items: center; display: flex; gap: 10px; justify-content: center; margin-bottom: 6px; }
      .forever-text { color: #000; font-family: Georgia, "Times New Roman", serif; font-size: 14px; font-weight: 700; letter-spacing: .12em; }
      .wave-logo { max-height: 22px; max-width: 18mm; object-fit: contain; }
      .divider { background: #d1d5db; display: inline-block; height: 18px; width: 1px; }
      .brand p { margin: 4px 0 0; color: #4b5563; font-size: 10px; }
      .title { margin: 10px 0; border: 1px solid #111827; padding: 6px; text-align: center; font-size: 13px; font-weight: 700; }
      .amount { margin: 10px 0; border: 2px solid #111827; padding: 8px; text-align: center; }
      .amount .value { display: block; text-align: center; font-size: 18px; font-weight: 700; }
      .breakdown { margin: 8px 0 10px; border: 1px solid #d1d5db; padding: 6px; }
      .breakdown-row { display: flex; justify-content: space-between; gap: 8px; padding: 3px 0; }
      .row { display: grid; grid-template-columns: 28mm 1fr; gap: 4px; border-bottom: 1px dashed #d1d5db; padding: 5px 0; }
      .label { color: #4b5563; font-weight: 700; }
      .value { overflow-wrap: anywhere; text-align: right; font-weight: 700; }
      .footer { margin-top: 12px; color: #4b5563; text-align: center; font-size: 10px; }
      .no-print { margin-top: 12px; text-align: center; }
      button { border: 0; background: #059669; color: white; cursor: pointer; font-weight: 700; padding: 8px 12px; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <main class="receipt">
      <header class="brand">
        <div class="logo-row">
          <span class="forever-text">FOREVER</span>
          <span class="divider"></span>
          <img class="wave-logo" src="/wave.png" alt="Wave" />
        </div>
        <p>Reçu de paiement hors précommande</p>
      </header>
      <div class="title">PAIEMENT WAVE CONFIRMÉ</div>
      <section class="amount">
        <span class="label">Montant payé</span>
        <span class="value">${escapeHtml(formatFcfa(link.amountFcfa))}</span>
      </section>
      <section class="breakdown">
        <div class="breakdown-row"><span>Montant initial</span><strong>${escapeHtml(formatFcfa(link.baseAmountFcfa || link.amountFcfa))}</strong></div>
        <div class="breakdown-row"><span>Frais Wave</span><strong>${escapeHtml(formatFcfa(link.serviceFeeFcfa))}</strong></div>
      </section>
      ${rows
        .map(
          ([label, value]) => `
            <div class="row">
              <div class="label">${escapeHtml(label)}</div>
              <div class="value">${escapeHtml(value)}</div>
            </div>
          `,
        )
        .join("")}
      <p class="footer">Document généré depuis l'espace admin le ${escapeHtml(formatDateTime(new Date()))}.</p>
      <div class="no-print"><button type="button" onclick="window.print()">Imprimer</button></div>
    </main>
    <script>
      window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 250); });
    </script>
  </body>
</html>`);
  popup.document.close();
  popup.focus();
  return true;
}

function expiryInfo(link) {
  if (!link.expiresAt) return { label: "Sans expiration", className: "text-gray-400" };
  const date = new Date(link.expiresAt);
  if (Number.isNaN(date.getTime())) return { label: "—", className: "text-gray-400" };
  const isPast = date.getTime() < Date.now();
  if (isPast && link.status === "ACTIVE") {
    return { label: `Expiré le ${formatDateTime(date)}`, className: "font-semibold text-red-600" };
  }
  return { label: formatDateTime(date), className: isPast ? "text-gray-400" : "text-gray-600" };
}

function creatorLabel(link) {
  return link.createdBy?.fullName || link.createdBy?.email || (link.source === "QR_FORM" ? "Kiosque QR" : "—");
}

function statusClass(status) {
  const map = {
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    PAID: "border-blue-200 bg-blue-50 text-blue-700",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
    EXPIRED: "border-gray-200 bg-gray-50 text-gray-500",
    DRAFT: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return map[status] || map.DRAFT;
}

function smsStatusClass(status) {
  const map = {
    SENT: "border-emerald-200 bg-emerald-50 text-emerald-700",
    FAILED: "border-red-200 bg-red-50 text-red-700",
    PENDING: "border-amber-200 bg-amber-50 text-amber-700",
  };
  return map[status] || "border-gray-200 bg-gray-50 text-gray-500";
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export default function ExternalPaymentLinksPage() {
  const [links, setLinks] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ activeCount: 0, paidCount: 0, paidAmountFcfa: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [resendDraft, setResendDraft] = useState({ id: "", phone: "" });
  const [attachDraft, setAttachDraft] = useState({ id: "", preorderNumber: "" });
  const [qrConfig, setQrConfig] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const feePreview = computeWaveFee(form.baseAmountFcfa);
  const totalPreview = (Number.parseInt(form.baseAmountFcfa, 10) || 0) + feePreview;

  const totals = useMemo(
    () => ({
      count: total,
      active: stats.activeCount,
      paid: stats.paidCount,
      paidAmount: stats.paidAmountFcfa,
    }),
    [total, stats],
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  async function load({ silent = false } = {}) {
    try {
      if (!silent) setLoading(true);
      if (!silent) setError("");
      const response = await externalPaymentLinksService.list({
        q: debouncedQuery || undefined,
        status: status || undefined,
        page,
        pageSize: PAGE_SIZE,
      });
      setLinks(response?.data || []);
      setTotal(response?.total || 0);
      setStats(response?.stats || { activeCount: 0, paidCount: 0, paidAmountFcfa: 0 });
    } catch (err) {
      if (!silent) setError(err?.response?.data?.message || "Chargement impossible.");
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Recherche texte : on laisse l'utilisateur taper librement et on ne
  // déclenche la requête qu'une fois la saisie stabilisée.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  // Tout changement de filtre repart de la première page.
  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, status]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, status, page]);

  // Rafraîchissement silencieux tant qu'il reste des liens actifs en attente
  // de paiement — évite d'avoir à recharger la page manuellement pour voir
  // un paiement Wave se confirmer.
  useEffect(() => {
    if (!totals.active) return undefined;
    const interval = setInterval(() => {
      load({ silent: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.active, debouncedQuery, status, page]);

  useEffect(() => {
    let mounted = true;
    externalPaymentLinksService.getQrConfig()
      .then(async (config) => {
        const dataUrl = await QRCode.toDataURL(config.url, {
          width: 320,
          margin: 2,
          color: { dark: "#000000", light: "#FFFFFF" },
        });
        if (!mounted) return;
        setQrConfig(config);
        setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (mounted) setQrConfig(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  async function createLink(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const created = await externalPaymentLinksService.create({
        invoiceReference: form.invoiceReference,
        baseAmountFcfa: form.baseAmountFcfa,
        customerPhone: form.customerPhone,
        expiresInHours: form.expiresInHours || undefined,
      });
      setForm(emptyForm());
      const smsMessage = created.smsResult?.accepted
        ? ` SMS envoyé au ${created.smsTo || form.customerPhone}.`
        : ` SMS non envoyé : ${created.smsResult?.errorMessage || created.smsLastError || "erreur inconnue"}.`;
      setMessage(`Lien généré : ${created.publicUrl}.${smsMessage}`);
      setShowCreateModal(false);
      if (page !== 1) {
        setPage(1);
      } else {
        await load();
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Création du lien impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function resendSms(link, phone = "") {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await externalPaymentLinksService.resendSms(link.id, {
        phone: phone || undefined,
      });
      setMessage(
        updated.smsResult?.accepted
          ? `SMS renvoyé au ${updated.smsTo || phone || link.customerPhone}.`
          : `SMS non envoyé : ${updated.smsResult?.errorMessage || updated.smsLastError || "erreur inconnue"}.`,
      );
      setResendDraft({ id: "", phone: "" });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Renvoi SMS impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function syncWave(link) {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await externalPaymentLinksService.syncWave(link.id);
      setMessage(
        updated.status === "PAID"
          ? `Paiement confirmé pour ${updated.reference}.`
          : `Synchronisation effectuée. Statut Wave: ${updated.providerStatus || updated.status}.`,
      );
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Synchronisation Wave impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function attachToOrder(link, preorderNumber = "") {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const result = await externalPaymentLinksService.attachToOrder(link.id, {
        preorderNumber,
      });
      setMessage(result?.message || `Paiement ${link.reference} rattaché à la commande.`);
      setAttachDraft({ id: "", preorderNumber: "" });
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Rattachement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(link.publicUrl);
      setMessage("Lien copié.");
    } catch {
      setMessage(link.publicUrl);
    }
  }

  async function copyText(value, label = "Copié.") {
    try {
      await navigator.clipboard.writeText(value || "");
      setMessage(label);
    } catch {
      setMessage(value || "");
    }
  }

  async function cancelLink(link) {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await externalPaymentLinksService.updateStatus(link.id, "CANCELLED");
      setMessage(`Lien ${link.reference} annulé.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
          Paiements externes
        </p>
        <h1 className="text-2xl font-bold text-gray-950">Liens hors précommande</h1>
        <p className="mt-1 text-sm text-gray-500">
          Générez un lien Wave avec majoration automatique de 1% de frais.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 break-all">{message}</div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Liens" value={totals.count} />
        <Stat label="Actifs" value={totals.active} />
        <Stat label="Payés" value={totals.paid} />
        <Stat label="Montant payé" value={formatFcfa(totals.paidAmount)} />
      </div>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-2xl bg-white p-3 text-amber-700">
              <QrCode className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-950">QR de génération Wave</h2>
              <p className="mt-1 text-sm text-gray-600">
                À imprimer ou afficher en caisse pour générer rapidement un lien depuis un téléphone.
              </p>
              {qrConfig?.url ? (
                <div className="mt-2 truncate rounded-lg bg-white px-3 py-2 font-mono text-xs text-gray-600">
                  {qrConfig.url}
                </div>
              ) : (
                <div className="mt-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-red-600">
                  Token QR non configuré côté backend.
                </div>
              )}
            </div>
          </div>
          {qrDataUrl ? (
            <div className="flex flex-wrap items-center gap-3">
              <img src={qrDataUrl} alt="QR génération lien Wave" className="h-28 w-28 rounded-xl border border-amber-200 bg-white p-2" />
              <div className="grid gap-2">
                <button type="button" onClick={() => copyText(qrConfig.url, "URL QR copiée.")} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-gray-800">
                  <Copy className="h-4 w-4" />
                  Copier l'URL
                </button>
                <a href={qrDataUrl} download="qr-generation-lien-wave.png" className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-xs font-bold text-white">
                  <Download className="h-4 w-4" />
                  Télécharger QR
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Liens générés</h2>
              <p className="text-sm text-gray-500">Suivi des paiements Wave hors précommande.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
                <Plus className="h-4 w-4" />
                Nouveau lien
              </button>
              <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Recherche..." className="bg-transparent text-sm outline-none" />
              </label>
              <select className={inputClass()} value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">Tous</option>
                <option value="ACTIVE">Actifs</option>
                <option value="PAID">Payés</option>
                <option value="CANCELLED">Annulés</option>
                <option value="EXPIRED">Expirés</option>
              </select>
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                title="Actualiser maintenant"
                className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Actualiser
              </button>
            </div>
          </div>
          {totals.active ? (
            <p className="mt-2 text-xs text-gray-400">
              Actualisation automatique toutes les {Math.round(POLL_INTERVAL_MS / 1000)} s tant que des liens sont actifs.
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Référence</th>
                  <th className="px-3 py-2">Source</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Validité</th>
                  <th className="px-3 py-2">Confirmation</th>
                  <th className="px-3 py-2">SMS</th>
                  <th className="px-3 py-2">Créé le</th>
                  <th className="px-3 py-2">Créé par</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <div className="font-mono text-xs">{link.reference}</div>
                      <div className="text-xs text-gray-500">Facture {link.invoiceReference || "—"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-xs font-semibold text-gray-600">
                        {link.source === "QR_FORM" ? "QR" : "Admin"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{link.customerPhone || "—"}</div>
                      <div className="text-xs text-gray-500">Téléphone FBO</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold">{formatFcfa(link.amountFcfa)}</div>
                      <div className="text-xs text-gray-500">
                        Base {formatFcfa(link.baseAmountFcfa || link.amountFcfa)} + frais {formatFcfa(link.serviceFeeFcfa)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(link.status)}`}>{link.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <div className={`text-xs ${expiryInfo(link).className}`}>{expiryInfo(link).label}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-1">
                        <div className={link.status === "PAID" ? "font-semibold text-emerald-700" : "font-semibold text-gray-500"}>
                          {link.status === "PAID" ? "Paiement confirmé" : "Non confirmé"}
                        </div>
                        <div className="text-xs text-gray-500">{link.paidAt ? formatDateTime(link.paidAt) : link.providerStatus || "—"}</div>
                        {link.providerTransactionId ? (
                          <div className="max-w-[180px] truncate font-mono text-xs text-gray-500" title={link.providerTransactionId}>{link.providerTransactionId}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-1">
                        <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${smsStatusClass(link.smsStatus)}`}>
                          {link.smsStatus || "—"}
                        </span>
                        <div className="text-xs text-gray-500">{link.smsTo || "Aucun numéro"}</div>
                        {link.smsLastError ? (
                          <div className="max-w-[220px] truncate text-xs text-red-600" title={link.smsLastError}>{link.smsLastError}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2">{formatDateTime(link.createdAt)}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{creatorLabel(link)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => copyLink(link)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
                          <Copy className="h-3.5 w-3.5" />
                          Copier
                        </button>
                        {link.publicUrl ? (
                          <a href={link.publicUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Ouvrir
                          </a>
                        ) : null}
                        {link.status === "ACTIVE" ? (
                          <button type="button" onClick={() => syncWave(link)} disabled={saving || !link.providerSessionId} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-2 py-1 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Synchroniser
                          </button>
                        ) : null}
                        {link.status === "ACTIVE" ? (
                          <button type="button" onClick={() => setResendDraft({ id: link.id, phone: link.smsTo || link.customerPhone || "" })} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 disabled:opacity-50">
                            <Send className="h-3.5 w-3.5" />
                            Renvoyer SMS
                          </button>
                        ) : null}
                        {link.status === "ACTIVE" ? (
                          <button type="button" onClick={() => cancelLink(link)} disabled={saving} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">
                            Annuler
                          </button>
                        ) : null}
                        {link.status === "PAID" ? (
                          <button type="button" onClick={() => printExternalWaveReceipt(link)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                            <Printer className="h-3.5 w-3.5" />
                            Reçu
                          </button>
                        ) : null}
                        {link.status === "PAID" ? (
                          <button type="button" onClick={() => setAttachDraft({ id: link.id, preorderNumber: "" })} disabled={saving} className="rounded-lg border border-emerald-200 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50">
                            Rattacher commande
                          </button>
                        ) : null}
                      </div>
                      {resendDraft.id === link.id ? (
                        <div className="mt-2 flex min-w-[280px] flex-wrap gap-2 rounded-xl border border-amber-100 bg-amber-50 p-2">
                          <input className="min-w-0 flex-1 rounded-lg border border-amber-200 px-2 py-1 text-xs outline-none focus:border-amber-400" value={resendDraft.phone} onChange={(e) => setResendDraft({ id: link.id, phone: e.target.value })} placeholder="Autre numéro" />
                          <button type="button" onClick={() => resendSms(link, resendDraft.phone)} disabled={saving} className="rounded-lg bg-amber-500 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                            Envoyer
                          </button>
                          <button type="button" onClick={() => setResendDraft({ id: "", phone: "" })} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">
                            Fermer
                          </button>
                        </div>
                      ) : null}
                      {attachDraft.id === link.id ? (
                        <div className="mt-2 flex min-w-[320px] flex-wrap gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-2">
                          <input
                            className="min-w-0 flex-1 rounded-lg border border-emerald-200 px-2 py-1 text-xs outline-none focus:border-emerald-400"
                            value={attachDraft.preorderNumber}
                            onChange={(e) => setAttachDraft({ id: link.id, preorderNumber: e.target.value })}
                            placeholder="PO-CIV-20260615-0051"
                          />
                          <button
                            type="button"
                            onClick={() => attachToOrder(link, attachDraft.preorderNumber)}
                            disabled={saving || !attachDraft.preorderNumber.trim()}
                            className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            Rattacher
                          </button>
                          <button type="button" onClick={() => setAttachDraft({ id: "", preorderNumber: "" })} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600">
                            Fermer
                          </button>
                        </div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {!links.length && !loading ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-gray-500">Aucun lien externe.</td>
                  </tr>
                ) : null}
                {loading ? (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-gray-500">Chargement...</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500">
            <span>
              {total > 0
                ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} sur ${total}`
                : "Aucun résultat"}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Précédent
              </button>
              <span className="text-xs font-semibold text-gray-600">
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={createLink} className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold">Générer un lien</h2>
                <p className="mt-1 text-sm text-gray-500">Le lien sera envoyé automatiquement par SMS.</p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <Field label="Réf. facture">
                <input className={inputClass()} value={form.invoiceReference} onChange={(e) => setForm({ ...form, invoiceReference: e.target.value })} />
              </Field>
              <Field label="Montant sans frais">
                <input type="number" min="1" className={inputClass()} value={form.baseAmountFcfa} onChange={(e) => setForm({ ...form, baseAmountFcfa: e.target.value })} />
              </Field>
              <Field label="Téléphone FBO">
                <input className={inputClass()} value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
              </Field>
              <Field label="Validité du lien">
                <select className={inputClass()} value={form.expiresInHours} onChange={(e) => setForm({ ...form, expiresInHours: e.target.value })}>
                  {EXPIRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </Field>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-gray-600">Frais Wave 1%</span>
                  <span className="font-bold">{formatFcfa(feePreview)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-3 text-base">
                  <span className="font-bold">Total à payer</span>
                  <span className="font-black">{formatFcfa(totalPreview)}</span>
                </div>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">
                Paiement Wave uniquement
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setShowCreateModal(false)} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
                Annuler
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                <LinkIcon className="h-4 w-4" />
                Générer le lien
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
