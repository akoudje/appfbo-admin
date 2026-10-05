import { useCallback, useEffect, useId, useRef, useState } from "react";
import QRCode from "qrcode";
import { AlertTriangle, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, Link as LinkIcon, Plus, Printer, QrCode, RefreshCw, Search, Send, X } from "lucide-react";
import { externalPaymentLinksService } from "../services/externalPaymentLinksService";
import CashRegisterStatusPanel from "../components/cashier/CashRegisterStatusPanel";

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
  const base = Number(value);
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

function printQrPoster(qrDataUrl) {
  if (!qrDataUrl || typeof window === "undefined") return false;
  const popup = window.open("", "_blank", "width=480,height=720");
  if (!popup) return false;

  popup.document.write(`<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Affiche paiement Wave</title>
    <style>
      @page { size: A5; margin: 8mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #111827; font-family: Arial, Helvetica, sans-serif; }
      .poster { display: flex; flex-direction: column; align-items: center; gap: 14px; padding: 10px; text-align: center; }
      .logo-row { align-items: center; display: flex; gap: 12px; justify-content: center; }
      .forever-text { color: #000; font-family: Georgia, "Times New Roman", serif; font-size: 22px; font-weight: 700; letter-spacing: .12em; }
      .wave-logo { max-height: 30px; max-width: 26mm; object-fit: contain; }
      .divider { background: #d1d5db; display: inline-block; height: 26px; width: 1px; }
      h1 { margin: 4px 0 0; font-size: 28px; font-weight: 800; }
      .subtitle { margin: 0; font-size: 15px; color: #4b5563; font-weight: 600; }
      .qr { border: 3px solid #111827; border-radius: 16px; padding: 12px; margin: 10px 0; }
      .qr img { display: block; width: 62mm; height: 62mm; }
      .steps { width: 100%; max-width: 88mm; margin: 0 auto; text-align: left; border: 1px solid #d1d5db; border-radius: 12px; padding: 12px 16px; }
      .steps li { margin: 6px 0; font-size: 13px; line-height: 1.4; }
      .fee-note { margin-top: 6px; border: 1px solid #10b981; background: #ecfdf5; color: #047857; border-radius: 10px; padding: 8px 12px; font-size: 12px; font-weight: 700; max-width: 88mm; }
      .no-print { margin-top: 14px; }
      button { border: 0; background: #059669; color: white; cursor: pointer; font-weight: 700; padding: 10px 16px; border-radius: 8px; }
      @media print { .no-print { display: none; } }
    </style>
  </head>
  <body>
    <main class="poster">
      <div class="logo-row">
        <span class="forever-text">FOREVER</span>
        <span class="divider"></span>
        <img class="wave-logo" src="/wave.png" alt="Wave" />
      </div>
      <h1>Payez par Wave</h1>
      <p class="subtitle">Scannez ce code avec votre téléphone</p>
      <div class="qr"><img src="${qrDataUrl}" alt="QR paiement Wave" /></div>
      <ol class="steps">
        <li>Scannez le QR code ci-dessus avec l'appareil photo de votre téléphone.</li>
        <li>Renseignez la référence et le montant indiqués sur votre facture.</li>
        <li>Appuyez sur « Payer maintenant » pour valider avec Wave.</li>
      </ol>
      <p class="fee-note">Les frais Wave (1%) sont calculés et affichés avant votre paiement.</p>
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


const STATUS_LABELS = { ACTIVE: "En attente", PAID: "Payé", EXPIRED: "Expiré", CANCELLED: "Annulé", DRAFT: "Brouillon" };
const SMS_LABELS = { SENT: "Envoyé", DELIVERED: "Livré", FAILED: "Échec", PENDING: "En attente" };
const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50";

function Field({ label, children }) {
  return <label className="block space-y-1"><span className="text-sm font-medium text-gray-700">{label}</span>{children}</label>;
}

function Modal({ title, children, onClose, busy = false }) {
  const titleId = useId();
  const panel = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const first = panel.current?.querySelector("input:not([readonly]), select") || panel.current?.querySelector("button, a[href]");
    first?.focus();
    return () => { document.body.style.overflow = oldOverflow; previous?.focus(); };
  }, []);
  function handleKey(event) {
    if (event.key === "Escape" && !busy) onClose();
    if (event.key !== "Tab") return;
    const elements = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]')];
    const first = elements[0], last = elements.at(-1);
    if (!elements.length) { event.preventDefault(); panel.current.focus(); }
    else if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
    <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={handleKey} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
      <div className="mb-4 flex items-center justify-between gap-3"><h2 id={titleId} className="text-lg font-bold">{title}</h2><button type="button" aria-label="Fermer la fenêtre" disabled={busy} onClick={onClose} className={actionClass}><X className="h-4 w-4" /></button></div>
      {children}
    </div>
  </div>;
}

function Stat({ label, value }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-4"><div className="text-sm text-gray-500">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}

export default function ExternalPaymentLinksPage() {
  const [links, setLinks] = useState([]);
  const [stats, setStats] = useState({ activeCount: 0, paidCount: 0, paidAmountFcfa: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState({ status: "", source: "", createdFrom: "", createdTo: "", watch: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshError, setRefreshError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notice, setNotice] = useState(null);
  const [modal, setModal] = useState(null);
  const [modalError, setModalError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [createdLink, setCreatedLink] = useState(null);
  const [phone, setPhone] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [pending, setPending] = useState(new Set());
  const locks = useRef(new Set());
  const request = useRef(0);
  const reading = useRef(0);
  const [qrConfig, setQrConfig] = useState(null);
  const [qrImages, setQrImages] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const busy = modal && (pending.has(modal.link?.id || "create") || (createdLink && pending.has(createdLink.id)));
  const latestLoad = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, FILTER_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);
  function updateFilter(name, value) { setFilters((prev) => ({ ...prev, [name]: value, ...(name === "watch" && value ? { status: "" } : {}) })); setPage(1); }
  const load = useCallback(async ({ silent = false } = {}) => {
    const version = ++request.current;
    reading.current += 1;
    if (!silent) { setLoading(true); setError(""); }
    try {
      const result = await externalPaymentLinksService.list({ q: debouncedQuery || undefined, ...filters, status: filters.watch ? undefined : filters.status || undefined, watch: filters.watch ? 1 : undefined, page, pageSize: PAGE_SIZE });
      if (version !== request.current) return;
      const pages = Math.max(1, Math.ceil((result.total || 0) / PAGE_SIZE));
      if (page > pages) { setPage(pages); return; }
      setLinks(result.data || []); setTotal(result.total || 0); setStats(result.stats || {});
      setLastUpdated(new Date()); setRefreshError("");
    } catch (err) {
      if (version !== request.current) return;
      const message = err?.response?.data?.message || "Chargement impossible. Réessayez.";
      if (silent) setRefreshError("Actualisation interrompue. Les données affichées peuvent être anciennes."); else setError(message);
    } finally { reading.current -= 1; if (version === request.current) setLoading(false); }
  }, [debouncedQuery, filters, page]);
  useEffect(() => { latestLoad.current = load; load(); return () => { request.current += 1; }; }, [load]);
  useEffect(() => {
    const interval = setInterval(() => { if (!document.hidden && locks.current.size === 0 && reading.current === 0) load({ silent: true }); }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load, stats.activeCount]);

  const loadQr = useCallback(async () => {
    setQrLoading(true); setQrError("");
    try {
      const config = await externalPaymentLinksService.getQrConfig();
      const options = { width: 480, margin: 2 };
      const [agent, customer] = await Promise.all([QRCode.toDataURL(config.url, options), config.directUrl ? QRCode.toDataURL(config.directUrl, options) : null]);
      setQrConfig(config); setQrImages({ agent, customer });
    } catch { setQrError("Les outils QR sont indisponibles. Réessayez ou contactez un administrateur."); }
    finally { setQrLoading(false); }
  }, []);

  useEffect(() => {
    if (modal?.kind !== "attach") return undefined;
    let active = true;
    setOrders([]); setOrderLoading(orderQuery.trim().length >= 2);
    const timer = setTimeout(async () => {
      if (orderQuery.trim().length < 2) return;
      try { const result = await externalPaymentLinksService.findAttachOrders(orderQuery.trim()); if (active) setOrders(result.data || []); }
      catch (err) { if (active) setModalError(err?.response?.data?.message || "Recherche impossible."); }
      finally { if (active) setOrderLoading(false); }
    }, FILTER_DEBOUNCE_MS);
    return () => { active = false; clearTimeout(timer); };
  }, [modal?.kind, orderQuery]);

  function openModal(kind, link = null) {
    setModalError(""); setModal({ kind, link }); setCreatedLink(null); setSelectedOrder(null); setOrderQuery("");
    if (kind === "create") setForm(emptyForm());
    if (kind === "resend") setPhone(link.smsTo || link.customerPhone || "");
    if (kind === "qr" && !qrImages) loadQr();
  }
  function closeModal() { if (!busy) { setModal(null); setModalError(""); } }
  async function runAction(key, action) {
    if (locks.current.has(key)) return;
    locks.current.add(key); setPending(new Set(locks.current)); setModalError(""); setError("");
    try { await action(); }
    catch (err) { const message = err?.response?.data?.message || err.message || "Opération impossible."; if (modal) setModalError(message); else setError(message); }
    finally { locks.current.delete(key); setPending(new Set(locks.current)); }
  }
  async function copy(value) {
    try { await navigator.clipboard.writeText(value); setNotice({ text: "Lien copié.", tone: "success" }); }
    catch { setNotice({ text: `Copie automatique indisponible. Sélectionnez ce lien : ${value}`, tone: "warning" }); }
  }
  function smsNotice(link) {
    return link.smsResult?.accepted ? { text: `SMS envoyé au ${link.smsTo || link.customerPhone}.`, tone: "success" } : { text: `Lien disponible, mais SMS non envoyé : ${link.smsResult?.errorMessage || link.smsLastError || "erreur d’envoi"}. Vous pouvez réessayer.`, tone: "warning" };
  }
  function createLink(event) {
    event.preventDefault();
    if (!form.invoiceReference.trim()) { setModalError("La référence de facture est obligatoire."); return; }
    if (!Number.isSafeInteger(Number(form.baseAmountFcfa)) || Number(form.baseAmountFcfa) <= 0) { setModalError("Saisissez un montant entier positif en FCFA."); return; }
    if (!/^\+?\d{8,15}$/.test(form.customerPhone.replace(/[\s().-]/g, ""))) { setModalError("Saisissez un téléphone valide de 8 à 15 chiffres."); return; }
    runAction("create", async () => {
      const link = await externalPaymentLinksService.create({ invoiceReference: form.invoiceReference.trim(), baseAmountFcfa: Number(form.baseAmountFcfa), customerPhone: form.customerPhone.trim(), expiresInHours: form.expiresInHours || undefined });
      setCreatedLink(link); setNotice(smsNotice(link)); setPage(1); await latestLoad.current({ silent: true });
    });
  }
  function resend(link, recipient) { return runAction(link.id, async () => { const result = await externalPaymentLinksService.resendSms(link.id, { phone: recipient || undefined }); setNotice(smsNotice(result)); if (modal?.kind === "create") setCreatedLink(result); else setModal(null); await latestLoad.current({ silent: true }); }); }
  const attachedLink = modal?.kind === "attach" ? modal.link : null;
  const baseAmount = attachedLink ? Number(attachedLink.baseAmountFcfa || (attachedLink.amountFcfa - (attachedLink.serviceFeeFcfa || 0))) : 0;
  const amountMatches = selectedOrder && Number(selectedOrder.totalFcfa) > 0 && Number(selectedOrder.totalFcfa) === baseAmount;

  return <div className="space-y-4">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-gray-950">Paiements Wave hors précommande</h1><p className="mt-1 text-sm text-gray-500">Créez un lien, suivez le paiement et rattachez-le à une commande.</p></div>
      <div className="flex flex-wrap gap-2"><button type="button" onClick={() => openModal("qr")} className={actionClass}><QrCode className="h-4 w-4" />Outils QR</button><button type="button" onClick={() => openModal("create")} className={`${actionClass} !bg-gray-900 !text-white`}><Plus className="h-4 w-4" />Nouveau lien</button></div>
    </header>
    <CashRegisterStatusPanel />
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    {notice && <div role="status" className={`flex items-start justify-between gap-3 rounded-xl border p-3 text-sm break-words ${notice.tone === "warning" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}><span>{notice.text}</span><button type="button" aria-label="Fermer le message" onClick={() => setNotice(null)}><X className="h-4 w-4" /></button></div>}
    <div><p className="mb-2 text-xs text-gray-500">Indicateurs sur les résultats filtrés · montants encaissés incluant les frais Wave</p><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Stat label="Résultats" value={total} /><Stat label="En attente" value={stats.activeCount || 0} /><Stat label="Paiements confirmés" value={stats.paidCount || 0} /><Stat label="Montant encaissé" value={formatFcfa(stats.paidAmountFcfa)} /></div></div>
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold">Suivi des paiements</h2><button type="button" onClick={() => load()} disabled={loading} className={actionClass}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualiser</button></div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Rechercher"><div className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2"><Search className="h-4 w-4 shrink-0 text-gray-400" /><input aria-label="Rechercher par facture, référence, client ou téléphone" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Facture, référence, client…" className="min-w-0 w-full text-sm outline-none" /></div></Field>
        <Field label="Statut du paiement"><select className={inputClass()} value={filters.status} disabled={filters.watch} onChange={(e) => updateFilter("status", e.target.value)}><option value="">Tous les statuts</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
        <Field label="Origine"><select className={inputClass()} value={filters.source} onChange={(e) => updateFilter("source", e.target.value)}><option value="">Toutes les origines</option><option value="ADMIN">Agent</option><option value="QR_FORM">QR</option></select></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="Créé du"><input type="date" className={inputClass()} value={filters.createdFrom} max={filters.createdTo || undefined} onChange={(e) => updateFilter("createdFrom", e.target.value)} /></Field><Field label="Au"><input type="date" className={inputClass()} value={filters.createdTo} min={filters.createdFrom || undefined} onChange={(e) => updateFilter("createdTo", e.target.value)} /></Field></div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3"><button type="button" aria-pressed={filters.watch} onClick={() => updateFilter("watch", !filters.watch)} className={`${actionClass} ${filters.watch ? "!border-amber-300 !bg-amber-50 !text-amber-800" : ""}`}><AlertTriangle className="h-4 w-4" />À surveiller · expiration sous 2 h</button><button type="button" onClick={() => { setFilters({ status: "", source: "", createdFrom: "", createdTo: "", watch: false }); setQuery(""); setPage(1); }} className="text-sm font-medium text-gray-600 underline">Réinitialiser</button></div>
      <p role="status" className={`mt-3 text-xs ${refreshError ? "text-amber-700" : "text-gray-500"}`}>{refreshError || (lastUpdated ? `Dernière actualisation : ${lastUpdated.toLocaleTimeString("fr-FR")} · Suivi automatique toutes les 15 s` : "Chargement des paiements…")}</p>
      <div className="mt-4 overflow-x-auto" aria-busy={loading}><table className="w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr>{["Facture / référence", "Client", "Montant", "Paiement", "SMS", "Actions"].map((label) => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody>
        {links.map((link) => <tr key={link.id} className="border-t border-gray-100 align-top hover:bg-gray-50/50">
          <td className="px-3 py-3"><button type="button" onClick={() => openModal("detail", link)} className="min-h-11 text-left font-semibold text-indigo-700 underline">{link.invoiceReference || link.reference}</button><div className="font-mono text-xs text-gray-500">{link.reference}</div><div className="mt-1 text-xs text-gray-500">{link.source === "QR_FORM" ? "QR" : "Agent"} · {formatDateTime(link.createdAt)}</div>{link.attachedOrder && <div className="mt-1 text-xs font-medium text-emerald-700">Rattaché à {link.attachedOrder.preorderNumber}</div>}</td>
          <td className="px-3 py-3"><div className="font-semibold">{link.customerName && link.customerName !== link.customerPhone ? link.customerName : link.customerPhone || "—"}</div><div className="text-xs text-gray-500">{link.customerPhone}</div>{link.customerFboNumber && <div className="text-xs text-gray-500">FBO {link.customerFboNumber}</div>}</td>
          <td className="whitespace-nowrap px-3 py-3"><div className="font-semibold">{formatFcfa(link.amountFcfa)}</div><div className="text-xs text-gray-500">Facture {formatFcfa(link.baseAmountFcfa || link.amountFcfa)}</div><div className="text-xs text-gray-500">Frais {formatFcfa(link.serviceFeeFcfa)}</div></td>
          <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(link.status)}`}>{STATUS_LABELS[link.status] || link.status}</span><div className="mt-2 text-xs text-gray-500">{link.status === "PAID" ? formatDateTime(link.paidAt) : expiryInfo(link).label}</div></td>
          <td className="px-3 py-3"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${smsStatusClass(link.smsStatus)}`}>{SMS_LABELS[link.smsStatus] || "Non envoyé"}</span><div className="mt-2 text-xs text-gray-500">{link.smsTo || "—"}</div>{link.smsLastError && <div className="mt-1 max-w-48 text-xs text-red-600">{link.smsLastError}</div>}</td>
          <td className="px-3 py-3"><div className="flex min-w-56 flex-wrap gap-2">
            {link.status === "ACTIVE" && <><button type="button" disabled={pending.has(link.id) || !link.providerSessionId} onClick={() => runAction(link.id, async () => { const result = await externalPaymentLinksService.syncWave(link.id); setNotice({ text: result.status === "PAID" ? `Paiement confirmé pour ${link.reference}.` : `Paiement vérifié : ${STATUS_LABELS[result.status] || result.status}.`, tone: "success" }); await latestLoad.current({ silent: true }); })} className={actionClass}><RefreshCw className="h-4 w-4" />{pending.has(link.id) ? "En cours…" : "Vérifier Wave"}</button><button type="button" disabled={pending.has(link.id)} onClick={() => openModal("resend", link)} className={actionClass}><Send className="h-4 w-4" />Renvoyer SMS</button></>}
            {link.status === "PAID" && <><button type="button" onClick={() => { if (!printExternalWaveReceipt(link)) setError("Autorisez les fenêtres pour imprimer le reçu."); }} className={`${actionClass} !border-emerald-200 !text-emerald-700`}><Printer className="h-4 w-4" />Reçu</button>{!link.attachedOrder && <button type="button" disabled={pending.has(link.id)} onClick={() => openModal("attach", link)} className={actionClass}><LinkIcon className="h-4 w-4" />Rattacher commande</button>}</>}
            {link.publicUrl && link.status === "ACTIVE" && <button type="button" onClick={() => copy(link.publicUrl)} className={actionClass}><Copy className="h-4 w-4" />Copier le lien</button>}
            <button type="button" onClick={() => openModal("detail", link)} className={actionClass}>Détails</button>
            {["ACTIVE", "DRAFT"].includes(link.status) && <button type="button" disabled={pending.has(link.id)} onClick={() => openModal("cancel", link)} className={`${actionClass} !text-red-700`}>Annuler le lien</button>}
          </div></td>
        </tr>)}
        {!links.length && <tr><td colSpan={6} className="px-3 py-10 text-center text-gray-500">{loading ? "Chargement…" : error ? "La liste n’a pas pu être chargée." : "Aucun paiement ne correspond aux filtres."}</td></tr>}
      </tbody></table></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500"><span>{total ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)} sur ${total}` : "Aucun résultat"}</span><div className="flex items-center gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)} className={actionClass}><ChevronLeft className="h-4 w-4" />Précédent</button><span>Page {page} / {totalPages}</span><button type="button" disabled={loading || page >= totalPages} onClick={() => setPage((value) => value + 1)} className={actionClass}>Suivant<ChevronRight className="h-4 w-4" /></button></div></div>
    </section>

    {modal && <Modal title={{ create: createdLink ? "Lien créé" : "Créer un lien Wave", resend: "Renvoyer le SMS", attach: "Rattacher le paiement", detail: "Détails du paiement", qr: "Outils QR", cancel: "Annuler le lien de paiement" }[modal.kind]} onClose={closeModal} busy={busy}>
      {modalError && <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{modalError}</div>}
      {modal.kind === "create" && (createdLink ? <div className="space-y-4"><p className="text-sm">Facture {createdLink.invoiceReference} · <strong>{formatFcfa(createdLink.amountFcfa)}</strong></p><p role="status" className={`rounded-lg p-3 text-sm ${smsNotice(createdLink).tone === "warning" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>{smsNotice(createdLink).text}</p><input aria-label="Lien de paiement créé" readOnly value={createdLink.publicUrl} className={inputClass()} /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => copy(createdLink.publicUrl)} className={actionClass}>Copier le lien</button>{!createdLink.smsResult?.accepted && <button type="button" disabled={pending.has(createdLink.id)} onClick={() => resend(createdLink)} className={actionClass}>Réessayer le SMS</button>}<button type="button" onClick={closeModal} className={actionClass}>Terminer</button></div></div> : <form onSubmit={createLink} className="space-y-4"><p className="text-sm text-gray-500">Le lien sera envoyé par SMS. Les frais Wave de 1 % sont ajoutés au montant de la facture.</p><Field label="Référence de facture *"><input required maxLength={100} className={inputClass()} value={form.invoiceReference} onChange={(e) => setForm({ ...form, invoiceReference: e.target.value })} /></Field><Field label="Montant de la facture hors frais (FCFA) *"><input required type="number" min="1" step="1" className={inputClass()} value={form.baseAmountFcfa} onChange={(e) => setForm({ ...form, baseAmountFcfa: e.target.value })} /></Field><Field label="Téléphone du destinataire *"><input required type="tel" inputMode="tel" autoComplete="tel" placeholder="Ex. 0700000000" className={inputClass()} value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} /></Field><Field label="Validité du lien"><select className={inputClass()} value={form.expiresInHours} onChange={(e) => setForm({ ...form, expiresInHours: e.target.value })}>{EXPIRY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field><div className="rounded-xl bg-amber-50 p-3"><div className="flex justify-between text-sm"><span>Frais Wave · 1 %</span><span>{formatFcfa(computeWaveFee(form.baseAmountFcfa))}</span></div><div className="mt-2 flex justify-between font-bold"><span>Total à payer</span><span>{formatFcfa((Number(form.baseAmountFcfa) || 0) + computeWaveFee(form.baseAmountFcfa))}</span></div></div><button disabled={busy} className={`${actionClass} w-full !bg-gray-900 !text-white`}>{busy ? "Création…" : "Créer et envoyer par SMS"}</button></form>)}
      {modal.kind === "resend" && <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!/^\+?\d{8,15}$/.test(phone.replace(/[\s().-]/g, ""))) { setModalError("Saisissez un numéro valide de 8 à 15 chiffres."); return; } resend(modal.link, phone); }}><p className="text-sm">Facture {modal.link.invoiceReference} · {formatFcfa(modal.link.amountFcfa)}</p><Field label="Téléphone du destinataire"><input required type="tel" className={inputClass()} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field><button disabled={busy} className={actionClass}>{busy ? "Envoi…" : "Envoyer le SMS"}</button></form>}
      {modal.kind === "attach" && <div className="space-y-4"><p className="text-sm">Paiement {modal.link.reference} · montant hors frais <strong>{formatFcfa(baseAmount)}</strong></p><Field label="Rechercher une commande non soldée"><input className={inputClass()} value={orderQuery} onChange={(e) => { setOrderQuery(e.target.value); setSelectedOrder(null); setModalError(""); }} placeholder="Numéro de commande, facture, nom ou FBO" /></Field><div role="status" className="text-sm text-gray-500">{orderLoading ? "Recherche…" : orderQuery.trim().length < 2 ? "Saisissez au moins 2 caractères." : !orders.length ? "Aucune commande non soldée trouvée." : "Sélectionnez la commande concernée."}</div><div className="space-y-2">{orders.map((order) => <button key={order.id} type="button" aria-pressed={selectedOrder?.id === order.id} onClick={() => setSelectedOrder(order)} className={`w-full rounded-xl border p-3 text-left ${selectedOrder?.id === order.id ? "border-indigo-400 bg-indigo-50" : "border-gray-200"}`}><div className="font-semibold">{order.preorderNumber} · {formatFcfa(order.totalFcfa)}</div><div className="text-sm text-gray-600">{order.fboNomComplet} · FBO {order.fboNumero} · Facture {order.factureReference || "—"}</div></button>)}</div>{selectedOrder && <div className={`rounded-xl p-3 text-sm ${amountMatches ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}><p>Facture commande : {formatFcfa(selectedOrder.totalFcfa)}</p><p>Paiement hors frais : {formatFcfa(baseAmount)}</p><p>Frais Wave : {formatFcfa(modal.link.serviceFeeFcfa)}</p><p className="mt-2 font-semibold">{amountMatches ? "Montants identiques. Cette commande sera marquée payée." : `Écart de ${formatFcfa(baseAmount - Number(selectedOrder.totalFcfa))}. Rattachement bloqué.`}</p></div>}<button type="button" disabled={busy || !amountMatches} onClick={() => runAction(modal.link.id, async () => { const result = await externalPaymentLinksService.attachToOrder(modal.link.id, { preorderNumber: selectedOrder.preorderNumber }); setNotice({ text: result.message, tone: "success" }); setModal(null); await latestLoad.current({ silent: true }); })} className={`${actionClass} w-full !bg-gray-900 !text-white`}>{busy ? "Rattachement…" : "Confirmer le rattachement"}</button></div>}
      {modal.kind === "cancel" && <div className="space-y-4"><p>Annuler le lien de la facture <strong>{modal.link.invoiceReference || modal.link.reference}</strong> de <strong>{formatFcfa(modal.link.amountFcfa)}</strong> ? Le client ne pourra plus l’utiliser pour payer.</p><button type="button" disabled={busy} onClick={() => runAction(modal.link.id, async () => { await externalPaymentLinksService.updateStatus(modal.link.id, "CANCELLED"); setNotice({ text: `Lien ${modal.link.reference} annulé.`, tone: "success" }); setModal(null); await latestLoad.current({ silent: true }); })} className={`${actionClass} !border-red-200 !text-red-700`}>{busy ? "Annulation…" : "Confirmer l’annulation"}</button></div>}
      {modal.kind === "detail" && <div className="space-y-4"><dl className="divide-y divide-gray-100">{[["Facture", modal.link.invoiceReference], ["Référence", modal.link.reference], ["Client", modal.link.customerName], ["Téléphone client", modal.link.customerPhone], ["Statut", STATUS_LABELS[modal.link.status]], ["Créé par", creatorLabel(modal.link)], ["Créé le", formatDateTime(modal.link.createdAt)], ["Validité", expiryInfo(modal.link).label], ["Montant facture", formatFcfa(modal.link.baseAmountFcfa || modal.link.amountFcfa)], ["Frais Wave", formatFcfa(modal.link.serviceFeeFcfa)], ["Total", formatFcfa(modal.link.amountFcfa)], ["Commande rattachée", modal.link.attachedOrder?.preorderNumber], ["Session Wave", getExternalWaveDetails(modal.link).sessionId], ["Transaction Wave", getExternalWaveDetails(modal.link).transactionId], ["Téléphone payeur Wave", getExternalWaveDetails(modal.link).payerPhone], ["Paiement confirmé le", formatDateTime(modal.link.paidAt)]].map(([label, value]) => <div key={label} className="grid grid-cols-[1fr_1.5fr] gap-3 py-2 text-sm"><dt className="text-gray-500">{label}</dt><dd className="break-all font-medium">{value || "—"}</dd></div>)}</dl>{modal.link.publicUrl && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => copy(modal.link.publicUrl)} className={actionClass}><Copy className="h-4 w-4" />Copier le lien</button><a href={modal.link.publicUrl} target="_blank" rel="noreferrer" className={actionClass}><ExternalLink className="h-4 w-4" />Ouvrir</a></div>}</div>}
      {modal.kind === "qr" && <div className="space-y-4">{qrLoading && <p role="status">Chargement des QR…</p>}{qrError && <div role="alert" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{qrError}<button type="button" onClick={loadQr} className={`${actionClass} mt-2`}>Réessayer</button></div>}{qrImages && <>{[{ title: "Générer un lien depuis un téléphone", description: "Pour un agent : renseignez la facture, puis partagez le lien au client.", image: qrImages.agent, url: qrConfig.url, name: "qr-generation-wave.png" }, { title: "Paiement client en libre-service", description: "Pour le client : scannez, renseignez votre facture et payez avec Wave.", image: qrImages.customer, url: qrConfig.directUrl, name: "qr-paiement-wave.png" }].map((qr) => <section key={qr.title} className="rounded-xl border border-gray-200 p-4"><h3 className="font-semibold">{qr.title}</h3><p className="mt-1 text-sm text-gray-500">{qr.description}</p>{qr.image ? <><img src={qr.image} alt={qr.title} className="mx-auto my-3 h-40 w-40" /><div className="flex flex-wrap gap-2"><button type="button" onClick={() => copy(qr.url)} className={actionClass}>Copier le lien</button><a download={qr.name} href={qr.image} className={actionClass}><Download className="h-4 w-4" />Télécharger QR</a>{qr.image === qrImages.customer && <button type="button" onClick={() => { if (!printQrPoster(qrImages.customer)) setModalError("Autorisez les fenêtres pour imprimer l’affiche."); }} className={actionClass}><Printer className="h-4 w-4" />Imprimer l’affiche</button>}</div></> : <p className="mt-2 text-sm text-amber-700">QR client indisponible.</p>}</section>)}</>}</div>}
    </Modal>}
  </div>;
}
