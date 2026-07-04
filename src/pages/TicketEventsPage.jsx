import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Edit,
  Eye,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Ticket,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import { ticketEventsService } from "../services/ticketEventsService";

const TABS = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "tickets", label: "Tickets" },
  { key: "orders", label: "Achats" },
  { key: "checkin", label: "Contrôle accès" },
  { key: "settings", label: "Paramètres" },
];

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatFcfa(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTicketWaveDetails(order = {}) {
  const payload = order.providerPayloadJson || {};
  const wavePayload = payload._wave?.detailsPayload || payload._wave?.statusPayload || payload;
  return {
    provider: order.paymentProvider || order.paymentMethod || "—",
    statusLabel:
      order.providerStatusLabel ||
      wavePayload.payment_status_label ||
      wavePayload.checkout_status_label ||
      wavePayload.payment_status ||
      wavePayload.checkout_status ||
      order.paymentStatus ||
      "—",
    sessionId:
      order.providerSessionId ||
      wavePayload.id ||
      wavePayload.checkout_session?.id ||
      "—",
    transactionId:
      order.providerTransactionId ||
      order.paymentReference ||
      wavePayload.transaction_id ||
      wavePayload.checkout_session?.transaction_id ||
      "—",
    payerPhone:
      order.providerPayerPhone ||
      wavePayload.payer_phone ||
      wavePayload.customer_msisdn ||
      wavePayload.phone_number ||
      wavePayload.payment_method?.phone_number ||
      wavePayload.checkout_session?.payer_phone ||
      "—",
    paidAt:
      order.paidAt ||
      wavePayload.when_completed ||
      wavePayload.completed_at ||
      wavePayload.paid_at ||
      null,
    hasRawPayload: Boolean(order.providerPayloadJson),
  };
}

function printTicketWaveReceipt(order = {}) {
  if (!order?.id || typeof window === "undefined") return false;
  const details = getTicketWaveDetails(order);
  const popup = window.open("", "_blank", "width=430,height=720");
  if (!popup) return false;

  const rows = [
    ["Achat", order.orderNumber || "-"],
    ["Événement", order.event?.title || "-"],
    ["Acheteur", order.buyerFullName || "-"],
    ["Téléphone acheteur", order.buyerPhone || "-"],
    ["FBO", order.buyerFboNumber || order.buyerFboName || "-"],
    ["Tickets", String(order.tickets?.length || order.quantity || 0)],
    ["Type ticket", order.ticketType?.label || "-"],
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
    <title>Reçu ticket ${escapeHtml(order.orderNumber || "")}</title>
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
        <p>Reçu de paiement ticket</p>
      </header>
      <div class="title">PAIEMENT WAVE CONFIRMÉ</div>
      <section class="amount">
        <span class="label">Montant payé</span>
        <span class="value">${escapeHtml(formatFcfa(order.totalFcfa))}</span>
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

function inputClass() {
  return "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";
}

function statusBadge(status) {
  const classes = {
    PUBLISHED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DRAFT: "bg-gray-50 text-gray-700 border-gray-200",
    CLOSED: "bg-amber-50 text-amber-700 border-amber-200",
    CANCELLED: "bg-red-50 text-red-700 border-red-200",
    PAID: "bg-emerald-50 text-emerald-700 border-emerald-200",
    PENDING_PAYMENT: "bg-amber-50 text-amber-700 border-amber-200",
    EXPIRED: "bg-gray-50 text-gray-500 border-gray-200",
  };
  return classes[status] || "bg-gray-50 text-gray-700 border-gray-200";
}

function emptyTicketTypeForm() {
  return {
    id: "",
    label: "",
    description: "",
    priceFcfa: "",
    capacity: "",
    maxPerOrder: 10,
    active: true,
    sortOrder: 0,
  };
}

function ticketTypeToForm(type) {
  return {
    id: type?.id || "",
    label: type?.label || "",
    description: type?.description || "",
    priceFcfa: type?.priceFcfa ?? "",
    capacity: type?.capacity ?? "",
    maxPerOrder: type?.maxPerOrder || 10,
    active: type?.active !== false,
    sortOrder: type?.sortOrder || 0,
  };
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

export default function TicketEventsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(searchParams.get("eventId") || "");
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "overview");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [ticketTypeForm, setTicketTypeForm] = useState(emptyTicketTypeForm);
  const [checkInValue, setCheckInValue] = useState("");
  const [checkInResult, setCheckInResult] = useState(null);
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [checkInSession, setCheckInSession] = useState(null);
  const [checkInEntryPoint, setCheckInEntryPoint] = useState("Entrée principale");
  const [checkInDeviceName, setCheckInDeviceName] = useState("");
  const [checkInLogs, setCheckInLogs] = useState([]);
  const [checkInSummary, setCheckInSummary] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || events[0] || null,
    [events, selectedEventId],
  );

  const stats = useMemo(() => {
    const paidOrders = orders.filter((order) => order.status === "PAID");
    const tickets = orders.flatMap((order) => order.tickets || []);
    return {
      events: events.length,
      orders: orders.length,
      paidOrders: paidOrders.length,
      activeTickets: tickets.filter((ticket) => ticket.status === "ACTIVE").length,
      usedTickets: tickets.filter((ticket) => ticket.status === "USED").length,
      revenue: paidOrders.reduce((sum, order) => sum + Number(order.totalFcfa || 0), 0),
    };
  }, [events, orders]);

  function updateUrl(next = {}) {
    const params = new URLSearchParams(searchParams);
    const eventId = Object.prototype.hasOwnProperty.call(next, "eventId") ? next.eventId : selectedEventId;
    const tab = Object.prototype.hasOwnProperty.call(next, "tab") ? next.tab : activeTab;
    if (eventId) params.set("eventId", eventId);
    else params.delete("eventId");
    if (tab) params.set("tab", tab);
    else params.delete("tab");
    setSearchParams(params, { replace: true });
  }

  async function load(overrides = {}) {
    try {
      setLoading(true);
      setError("");
      const eventId = Object.prototype.hasOwnProperty.call(overrides, "eventId")
        ? overrides.eventId
        : selectedEventId;
      const q = Object.prototype.hasOwnProperty.call(overrides, "q") ? overrides.q : orderQuery;
      const status = Object.prototype.hasOwnProperty.call(overrides, "status")
        ? overrides.status
        : orderStatus;

      const [eventsResponse, ordersResponse] = await Promise.all([
        ticketEventsService.listEvents(),
        ticketEventsService.listOrders({
          eventId: eventId || undefined,
          q: q || undefined,
          status: status || undefined,
        }),
      ]);
      const nextEvents = eventsResponse?.data || [];
      const nextSelectedId = eventId || nextEvents[0]?.id || "";
      setEvents(nextEvents);
      setOrders(ordersResponse?.data || []);
      setSelectedEventId(nextSelectedId);
      if (!eventId && nextSelectedId) updateUrl({ eventId: nextSelectedId });
    } catch (err) {
      setError(err?.response?.data?.message || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "checkin" && selectedEventId) {
      loadCheckInAudit({ eventId: selectedEventId, sessionId: checkInSession?.id });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedEventId, checkInSession?.id]);

  function selectEvent(eventId) {
    setSelectedEventId(eventId);
    setTicketTypeForm(emptyTicketTypeForm());
    setCheckInResult(null);
    setRecentCheckIns([]);
    setCheckInSession(null);
    setCheckInLogs([]);
    setCheckInSummary(null);
    updateUrl({ eventId });
    load({ eventId });
  }

  function selectTab(tab) {
    setActiveTab(tab);
    updateUrl({ tab });
  }

  async function saveTicketType(submitEvent) {
    submitEvent.preventDefault();
    if (!selectedEvent?.id) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ticketEventsService.saveTicketType(selectedEvent.id, ticketTypeForm);
      setTicketTypeForm(emptyTicketTypeForm());
      setMessage(ticketTypeForm.id ? "Type de ticket modifié." : "Type de ticket ajouté.");
      await load({ eventId: selectedEvent.id });
    } catch (err) {
      setError(err?.response?.data?.message || "Enregistrement du type de ticket impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTicketType(type) {
    if (!selectedEvent?.id) return;
    if (!window.confirm(`Supprimer le type de ticket "${type.label}" ?`)) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ticketEventsService.deleteTicketType(selectedEvent.id, type.id);
      if (ticketTypeForm.id === type.id) setTicketTypeForm(emptyTicketTypeForm());
      setMessage("Type de ticket supprimé.");
      await load({ eventId: selectedEvent.id });
    } catch (err) {
      setError(err?.response?.data?.message || "Suppression du type de ticket impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleTicketType(type) {
    if (!selectedEvent?.id) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ticketEventsService.saveTicketType(selectedEvent.id, {
        ...ticketTypeToForm(type),
        active: !type.active,
      });
      setMessage(type.active ? "Type de ticket désactivé." : "Type de ticket activé.");
      await load({ eventId: selectedEvent.id });
    } catch (err) {
      setError(err?.response?.data?.message || "Modification du type de ticket impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function syncWavePayment(order) {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await ticketEventsService.syncWavePayment(order.id);
      setMessage(`Statut Wave actualisé pour ${updated.orderNumber || order.orderNumber}.`);
      await load({ eventId: selectedEventId });
    } catch (err) {
      setError(err?.response?.data?.message || "Synchronisation Wave impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function cancelOrder(order) {
    if (!window.confirm(`Annuler l'achat ${order.orderNumber} ?`)) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ticketEventsService.cancelOrder(order.id, {
        note: "Achat ticket annulé depuis le module billetterie.",
      });
      setMessage(`Achat ${order.orderNumber} annulé.`);
      await load({ eventId: selectedEventId });
    } catch (err) {
      setError(err?.response?.data?.message || "Annulation achat impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function resendOrderTicketsEmail(order) {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const result = await ticketEventsService.resendOrderTicketsEmail(order.id);
      setMessage(`Ticket renvoyé à ${result.sentTo || order.buyerEmail || "l'acheteur"}.`);
    } catch (err) {
      setError(err?.response?.data?.message || "Renvoi du ticket impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function markCashPaid(order) {
    if (!window.confirm(`Confirmer l'encaissement espèces de ${formatFcfa(order.totalFcfa)} pour ${order.orderNumber} ?`)) {
      return;
    }
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const updated = await ticketEventsService.markOrderPaid(order.id, {
        paymentMethod: "CASH",
        paymentReference: `CASH-${order.orderNumber}`,
        note: "Paiement espèces encaissé sur place.",
      });
      setMessage(`Paiement espèces confirmé pour ${updated.orderNumber}. Tickets activés.`);
      await load({ eventId: selectedEventId });
    } catch (err) {
      setError(err?.response?.data?.message || "Confirmation du paiement espèces impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function expireOrders() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const response = await ticketEventsService.expireOrders({
        eventId: selectedEvent?.id || undefined,
      });
      setMessage(`${response.expired || 0} achat(s) non payé(s) expiré(s).`);
      await load({ eventId: selectedEventId });
    } catch (err) {
      setError(err?.response?.data?.message || "Expiration des achats impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function loadCheckInAudit(overrides = {}) {
    const eventId = Object.prototype.hasOwnProperty.call(overrides, "eventId")
      ? overrides.eventId
      : selectedEventId;
    if (!eventId) return;
    const sessionId = Object.prototype.hasOwnProperty.call(overrides, "sessionId")
      ? overrides.sessionId
      : checkInSession?.id;
    try {
      const [summary, logs] = await Promise.all([
        ticketEventsService.getCheckInSummary({ eventId, sessionId: sessionId || undefined }),
        ticketEventsService.listCheckInLogs({ eventId, sessionId: sessionId || undefined }),
      ]);
      setCheckInSummary(summary);
      setCheckInLogs(logs?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Chargement du contrôle d'accès impossible.");
    }
  }

  async function openCheckInSession() {
    if (!selectedEvent?.id) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const session = await ticketEventsService.openCheckInSession({
        eventId: selectedEvent.id,
        entryPoint: checkInEntryPoint,
        deviceName: checkInDeviceName,
      });
      setCheckInSession(session);
      setMessage(`Session ouverte : ${session.entryPoint}.`);
      await loadCheckInAudit({ eventId: selectedEvent.id, sessionId: session.id });
    } catch (err) {
      setError(err?.response?.data?.message || "Ouverture de session impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function closeCheckInSession() {
    if (!checkInSession?.id) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const session = await ticketEventsService.closeCheckInSession(checkInSession.id);
      setCheckInSession(session);
      setMessage("Session de contrôle fermée.");
      await loadCheckInAudit({ eventId: selectedEventId, sessionId: session.id });
    } catch (err) {
      setError(err?.response?.data?.message || "Fermeture de session impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function checkIn(tokenOrCode = checkInValue) {
    const raw = String(tokenOrCode || "").trim();
    if (!raw || saving) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const ticket = await ticketEventsService.checkInTicket({
        tokenOrCode: raw,
        eventId: selectedEventId || undefined,
        sessionId: checkInSession?.closedAt ? undefined : checkInSession?.id,
        entryPoint: checkInSession?.entryPoint || checkInEntryPoint,
      });
      const result = {
        ok: true,
        message: "Entrée validée",
        ticket,
        log: ticket.checkInLog || null,
        scannedAt: new Date().toISOString(),
      };
      setCheckInResult(result);
      setRecentCheckIns((items) => [result, ...items].slice(0, 8));
      setCheckInValue("");
      setMessage(`Entrée validée : ${ticket.holderFullName} (${ticket.ticketCode}).`);
      await load({ eventId: selectedEventId });
      await loadCheckInAudit({ eventId: selectedEventId, sessionId: checkInSession?.id });
    } catch (err) {
      const result = {
        ok: false,
        message: err?.response?.data?.message || "Validation entrée impossible.",
        ticket: err?.response?.data?.ticket || null,
        log: err?.response?.data?.log || null,
        scannedAt: new Date().toISOString(),
      };
      setCheckInResult(result);
      if (result.ticket) setRecentCheckIns((items) => [result, ...items].slice(0, 8));
      else if (result.log) setRecentCheckIns((items) => [result, ...items].slice(0, 8));
      setError(result.message);
      await loadCheckInAudit({ eventId: selectedEventId, sessionId: checkInSession?.id });
    } finally {
      setSaving(false);
    }
  }

  async function startScanner() {
    if (!("BarcodeDetector" in window)) {
      setScannerSupported(false);
      return;
    }
    try {
      setScannerSupported(true);
      setScannerActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const scan = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const value = codes?.[0]?.rawValue;
          if (value) {
            stopScanner();
            await checkIn(value);
            return;
          }
        } catch {
          // La prochaine frame réessaiera.
        }
        scanLoopRef.current = window.setTimeout(scan, 450);
      };
      scanLoopRef.current = window.setTimeout(scan, 650);
    } catch (err) {
      setScannerActive(false);
      setError(err?.message || "Impossible d'activer la caméra.");
    }
  }

  function stopScanner() {
    if (scanLoopRef.current) window.clearTimeout(scanLoopRef.current);
    scanLoopRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    setScannerActive(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Billetterie événementielle
          </p>
          <h1 className="text-2xl font-bold text-gray-950">Gestion des événements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pilotez la publication, les tickets, les achats et le contrôle d'accès.
          </p>
        </div>
        <Link
          to="/marketing/ticket-events/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Nouvel événement
        </Link>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <Stat label="Événements" value={stats.events} />
        <Stat label="Achats" value={stats.orders} />
        <Stat label="Payés" value={stats.paidOrders} />
        <Stat label="Tickets actifs" value={stats.activeTickets} />
        <Stat label="Entrées" value={stats.usedTickets} />
        <Stat label="Recette" value={formatFcfa(stats.revenue)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Événements</h2>
            {loading ? <span className="text-xs text-gray-500">Chargement...</span> : null}
          </div>
          <div className="mt-4 space-y-2">
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => selectEvent(event.id)}
                className={`w-full rounded-xl border p-3 text-left transition ${
                  selectedEvent?.id === event.id
                    ? "border-amber-300 bg-amber-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                    {event.posterUrl ? (
                      <img src={event.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-amber-600">
                        <CalendarDays className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-gray-950">{event.title}</div>
                    <div className="mt-1 text-xs text-gray-500">{formatDateTime(event.startsAt)}</div>
                    <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(event.status)}`}>
                      {event.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
            {!events.length && !loading ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                Aucun événement créé.
              </div>
            ) : null}
          </div>
        </aside>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          {selectedEvent ? (
            <>
              <div className="border-b border-gray-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-gray-950">{selectedEvent.title}</h2>
                      <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadge(selectedEvent.status)}`}>
                        {selectedEvent.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatDateTime(selectedEvent.startsAt)} · {selectedEvent.venueName || "Lieu à renseigner"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`/events/${selectedEvent.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      <Eye className="h-4 w-4" />
                      Public
                    </a>
                    <Link
                      to={`/marketing/ticket-events/${selectedEvent.id}/edit`}
                      className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
                    >
                      <Edit className="h-4 w-4" />
                      Modifier
                    </Link>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => selectTab(tab.key)}
                      className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                        activeTab === tab.key
                          ? "bg-gray-900 text-white"
                          : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4">
                {activeTab === "overview" ? (
                  <OverviewTab event={selectedEvent} orders={orders} />
                ) : null}
                {activeTab === "tickets" ? (
                  <TicketsTab
                    event={selectedEvent}
                    form={ticketTypeForm}
                    setForm={setTicketTypeForm}
                    saving={saving}
                    onSubmit={saveTicketType}
                    onEdit={(type) => setTicketTypeForm(ticketTypeToForm(type))}
                    onToggle={toggleTicketType}
                    onDelete={deleteTicketType}
                  />
                ) : null}
                {activeTab === "orders" ? (
                  <OrdersTab
                    orders={orders}
                    orderQuery={orderQuery}
                    setOrderQuery={setOrderQuery}
                    orderStatus={orderStatus}
                    setOrderStatus={setOrderStatus}
                    saving={saving}
                    onLoad={(overrides) => load({ eventId: selectedEvent.id, ...overrides })}
                    onExpire={expireOrders}
                    onSyncWave={syncWavePayment}
                    onMarkCashPaid={markCashPaid}
                    onCancel={cancelOrder}
                    onResendTickets={resendOrderTicketsEmail}
                  />
                ) : null}
                {activeTab === "checkin" ? (
                  <CheckInTab
                    event={selectedEvent}
                    session={checkInSession}
                    entryPoint={checkInEntryPoint}
                    setEntryPoint={setCheckInEntryPoint}
                    deviceName={checkInDeviceName}
                    setDeviceName={setCheckInDeviceName}
                    checkInValue={checkInValue}
                    setCheckInValue={setCheckInValue}
                    result={checkInResult}
                    recent={recentCheckIns}
                    logs={checkInLogs}
                    summary={checkInSummary}
                    saving={saving}
                    scannerActive={scannerActive}
                    scannerSupported={scannerSupported}
                    videoRef={videoRef}
                    onOpenSession={openCheckInSession}
                    onCloseSession={closeCheckInSession}
                    onRefreshAudit={() => loadCheckInAudit({ eventId: selectedEvent.id, sessionId: checkInSession?.id })}
                    onCheckIn={checkIn}
                    onStartScanner={startScanner}
                    onStopScanner={stopScanner}
                  />
                ) : null}
                {activeTab === "settings" ? <SettingsTab event={selectedEvent} /> : null}
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-sm text-gray-500">
              Sélectionnez ou créez un événement.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function OverviewTab({ event, orders }) {
  const paidOrders = orders.filter((order) => order.status === "PAID");
  const tickets = orders.flatMap((order) => order.tickets || []);
  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
        {event.posterUrl ? (
          <img src={event.posterUrl} alt="" className="h-72 w-full object-cover" />
        ) : (
          <div className="flex h-72 items-center justify-center text-gray-400">
            <CalendarDays className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat label="Recette" value={formatFcfa(paidOrders.reduce((sum, order) => sum + Number(order.totalFcfa || 0), 0))} />
          <Stat label="Tickets" value={tickets.length} />
          <Stat label="Entrées" value={tickets.filter((ticket) => ticket.status === "USED").length} />
        </div>
        <div className="rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold">Résumé</h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-gray-600">
            {event.description || "Aucune description renseignée."}
          </p>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info label="Date" value={formatDateTime(event.startsAt)} />
            <Info label="Lieu" value={event.venueName || "—"} />
            <Info label="Adresse" value={event.venueAddress || "—"} />
            <Info label="Lien public" value={`/events/${event.slug}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketsTab({ event, form, setForm, saving, onSubmit, onEdit, onToggle, onDelete }) {
  return (
    <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
      <form onSubmit={onSubmit} className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold">{form.id ? "Modifier le type de ticket" : "Ajouter un type de ticket"}</h3>
        <div className="mt-4 grid gap-3">
          <Field label="Libellé">
            <input className={inputClass()} value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} />
          </Field>
          <Field label="Prix FCFA">
            <input type="number" min="0" className={inputClass()} value={form.priceFcfa} onChange={(event) => setForm({ ...form, priceFcfa: event.target.value })} />
          </Field>
          <Field label="Capacité">
            <input type="number" min="0" className={inputClass()} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
          </Field>
          <Field label="Maximum par achat">
            <input type="number" min="1" className={inputClass()} value={form.maxPerOrder} onChange={(event) => setForm({ ...form, maxPerOrder: event.target.value })} />
          </Field>
          <Field label="Description">
            <textarea rows={3} className={inputClass()} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            Actif à la vente
          </label>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={saving || !form.label.trim()} className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Save className="h-4 w-4" />
            {form.id ? "Enregistrer" : "Ajouter"}
          </button>
          {form.id ? (
            <button type="button" onClick={() => setForm(emptyTicketTypeForm())} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700">
              Annuler
            </button>
          ) : null}
        </div>
      </form>

      <div className="rounded-xl border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h3 className="font-bold">Types configurés</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {(event.ticketTypes || []).map((type) => {
            const ticketCount = Number(type._count?.tickets || 0);
            return (
              <div key={type.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{type.label}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${type.active ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-gray-200 bg-gray-50 text-gray-500"}`}>
                      {type.active ? "Actif" : "Inactif"}
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {formatFcfa(type.priceFcfa)} · {ticketCount} billet(s)
                    {type.capacity ? ` / ${type.capacity}` : ""}
                  </div>
                  {type.description ? <p className="mt-1 text-sm text-gray-500">{type.description}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => onEdit(type)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700">
                    <Edit className="h-3.5 w-3.5" />
                    Modifier
                  </button>
                  <button type="button" onClick={() => onToggle(type)} className="rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-700">
                    {type.active ? "Désactiver" : "Activer"}
                  </button>
                  <button type="button" onClick={() => onDelete(type)} disabled={ticketCount > 0} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                    <Trash2 className="h-3.5 w-3.5" />
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
          {!event.ticketTypes?.length ? (
            <div className="p-8 text-center text-sm text-gray-500">Aucun type de ticket.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function OrdersTab({
  orders,
  orderQuery,
  setOrderQuery,
  orderStatus,
  setOrderStatus,
  saving,
  onLoad,
  onExpire,
  onSyncWave,
  onMarkCashPaid,
  onCancel,
  onResendTickets,
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={onExpire} disabled={saving} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">
          Expirer non payés
        </button>
        <div className="flex flex-wrap gap-2">
          <select
            value={orderStatus}
            onChange={(event) => {
              const next = event.target.value;
              setOrderStatus(next);
              onLoad({ status: next });
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          >
            <option value="">Tous les statuts</option>
            <option value="PENDING_PAYMENT">En attente</option>
            <option value="PAID">Payés</option>
            <option value="EXPIRED">Expirés</option>
            <option value="CANCELLED">Annulés</option>
          </select>
          <label className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              value={orderQuery}
              onChange={(event) => setOrderQuery(event.target.value)}
              placeholder="Nom, téléphone, FBO..."
              className="min-w-52 bg-transparent text-sm outline-none"
            />
          </label>
          <button type="button" onClick={() => onLoad({ q: orderQuery })} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
            Rechercher
          </button>
        </div>
      </div>
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Achat</th>
              <th className="px-3 py-2">Acheteur</th>
              <th className="px-3 py-2">Tickets</th>
              <th className="px-3 py-2">Montant</th>
              <th className="px-3 py-2">Paiement</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const isWave = String(order.paymentProvider || order.paymentMethod || "").toUpperCase() === "WAVE";
              const isPaid = order.status === "PAID" || order.paymentStatus === "SUCCEEDED";
              return (
              <tr key={order.id} className="border-t border-gray-100 align-top">
                <td className="px-3 py-2 font-mono text-xs">{order.orderNumber}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold">{order.buyerFullName}</div>
                  <div className="text-xs text-gray-500">{order.buyerPhone}</div>
                </td>
                <td className="px-3 py-2">
                  <div>{order.tickets?.length || order.quantity || 0}</div>
                  {order.ticketType?.label ? (
                    <div className="text-xs text-gray-500">{order.ticketType.label}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2">{formatFcfa(order.totalFcfa)}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold">{order.paymentProvider || order.paymentMethod || "—"}</div>
                  <div className="text-xs text-gray-500">{order.paymentStatus || "—"}</div>
                  {!isWave && order.paymentReference ? (
                    <div className="font-mono text-[11px] text-gray-400">{order.paymentReference}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-2">
                    {isWave ? (
                      <button type="button" onClick={() => onSyncWave(order)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Wave
                      </button>
                    ) : null}
                    {isPaid && isWave ? (
                      <button type="button" onClick={() => printTicketWaveReceipt(order)} disabled={saving} className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                        Imprimer reçu
                      </button>
                    ) : null}
                    {!isPaid && order.status !== "CANCELLED" && order.status !== "EXPIRED" ? (
                      <button
                        type="button"
                        onClick={() => onMarkCashPaid(order)}
                        disabled={saving}
                        className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Encaisser espèces
                      </button>
                    ) : null}
                    {isPaid ? (
                      <button
                        type="button"
                        onClick={() => onResendTickets(order)}
                        disabled={saving}
                        className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                      >
                        Renvoyer email
                      </button>
                    ) : null}
                    {!isPaid && order.status !== "CANCELLED" ? (
                      <button type="button" onClick={() => onCancel(order)} disabled={saving} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">
                        Annuler
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
            })}
            {!orders.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">Aucun achat de ticket.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckInTab({
  event,
  session,
  entryPoint,
  setEntryPoint,
  deviceName,
  setDeviceName,
  checkInValue,
  setCheckInValue,
  result,
  recent,
  logs,
  summary,
  saving,
  scannerActive,
  scannerSupported,
  videoRef,
  onOpenSession,
  onCloseSession,
  onRefreshAudit,
  onCheckIn,
  onStartScanner,
  onStopScanner,
}) {
  const sessionOpen = session && !session.closedAt;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
              Module contrôle accès
            </p>
            <h3 className="mt-1 text-xl font-black text-gray-950">Scanner un ticket</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Validation limitée à l'événement sélectionné : {event?.title || "événement"}.
            </p>
          </div>
          <div className="rounded-2xl bg-gray-950 p-3 text-white">
            <QrCode className="h-6 w-6" />
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3 lg:grid-cols-[1fr_1fr_auto]">
          <Field label="Point d'entrée">
            <input
              className={inputClass()}
              value={entryPoint}
              disabled={sessionOpen}
              onChange={(event) => setEntryPoint(event.target.value)}
              placeholder="Entrée principale"
            />
          </Field>
          <Field label="Appareil / poste">
            <input
              className={inputClass()}
              value={deviceName}
              disabled={sessionOpen}
              onChange={(event) => setDeviceName(event.target.value)}
              placeholder="Poste contrôle 1"
            />
          </Field>
          <div className="flex items-end gap-2">
            {sessionOpen ? (
              <button
                type="button"
                onClick={onCloseSession}
                disabled={saving}
                className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50"
              >
                Fermer session
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenSession}
                disabled={saving || !entryPoint.trim()}
                className="rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Ouvrir session
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
          <div className="text-sm">
            <span className="font-bold text-gray-950">Session : </span>
            <span className={sessionOpen ? "font-semibold text-emerald-700" : "font-semibold text-gray-500"}>
              {sessionOpen ? `${session.entryPoint} ouverte depuis ${formatDateTime(session.openedAt)}` : "aucune session ouverte"}
            </span>
          </div>
          <button type="button" onClick={onRefreshAudit} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700">
            <RefreshCw className="h-3.5 w-3.5" />
            Actualiser
          </button>
        </div>
      </div>

      <CheckInSummary summary={summary} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div>
            <form
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault();
                onCheckIn();
              }}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
            >
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
                Code ticket ou QR token
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
                  value={checkInValue}
                  onChange={(inputEvent) => setCheckInValue(inputEvent.target.value)}
                  placeholder="TCK-260628-XXXXXX"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={saving || !checkInValue.trim()}
                  className="rounded-xl bg-gray-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  Valider
                </button>
              </div>
            </form>

            <div className="mt-3 flex flex-wrap gap-2">
              {!scannerActive ? (
                <button
                  type="button"
                  onClick={onStartScanner}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-900 shadow-sm hover:bg-gray-50"
                >
                  <Video className="h-4 w-4" />
                  Scanner caméra
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStopScanner}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 shadow-sm hover:bg-red-50"
                >
                  <X className="h-4 w-4" />
                  Arrêter la caméra
                </button>
              )}
            </div>

            {!scannerSupported ? (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
                Le scan caméra n'est pas supporté par ce navigateur. Utilisez la saisie manuelle.
              </div>
            ) : null}
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black">
            {scannerActive ? (
              <video ref={videoRef} className="aspect-[4/5] h-full w-full object-cover" muted playsInline />
            ) : (
              <div className="flex aspect-[4/5] flex-col items-center justify-center p-6 text-center text-white">
                <QrCode className="h-12 w-12 text-amber-300" />
                <p className="mt-3 text-sm font-bold">Caméra inactive</p>
                <p className="mt-1 text-xs text-gray-400">Activez le scanner ou saisissez le code manuellement.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <CheckInResultCard result={result} />
        <RecentCheckIns items={recent} />
      </div>
    </div>
      <CheckInAuditLog logs={logs} />
    </div>
  );
}

function checkInResultLabel(result) {
  const labels = {
    ACCEPTED: "Validé",
    ALREADY_USED: "Déjà utilisé",
    WRONG_EVENT: "Mauvais événement",
    INACTIVE: "Non actif",
    NOT_FOUND: "Introuvable",
    INVALID: "Invalide",
  };
  return labels[result] || result || "—";
}

function checkInResultClass(result) {
  if (result === "ACCEPTED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (result === "ALREADY_USED") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-red-200 bg-red-50 text-red-700";
}

function CheckInSummary({ summary }) {
  const data = summary || {};
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Stat label="Tickets contrôlés" value={data.usedTickets || 0} />
      <Stat label="Restants" value={data.remainingTickets || 0} />
      <Stat label="Scans validés" value={data.accepted || 0} />
      <Stat label="Scans refusés" value={data.refused || 0} />
      <Stat label="Sessions actives" value={data.activeSessions?.length || 0} />
    </div>
  );
}

function CheckInAuditLog({ logs }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-base font-black text-gray-950">Journal de contrôle</h4>
          <p className="mt-1 text-sm text-gray-500">Toutes les tentatives sont conservées, validées comme refusées.</p>
        </div>
        <span className="rounded-full border border-gray-200 px-3 py-1 text-xs font-bold text-gray-600">
          {logs.length} ligne(s)
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-3 py-2">Heure</th>
              <th className="px-3 py-2">Résultat</th>
              <th className="px-3 py-2">Participant</th>
              <th className="px-3 py-2">Ticket</th>
              <th className="px-3 py-2">Entrée</th>
              <th className="px-3 py-2">Agent</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-gray-100">
                <td className="whitespace-nowrap px-3 py-2 text-gray-600">{formatDateTime(log.scannedAt)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-1 text-xs font-bold ${checkInResultClass(log.result)}`}>
                    {checkInResultLabel(log.result)}
                  </span>
                  {log.reason ? <div className="mt-1 text-xs text-gray-500">{log.reason}</div> : null}
                </td>
                <td className="px-3 py-2 font-semibold text-gray-950">
                  {log.ticket?.holderFullName || log.order?.buyerFullName || "—"}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-gray-700">{log.ticketCode || log.ticket?.ticketCode || log.scannedValue || "—"}</td>
                <td className="px-3 py-2 text-gray-700">{log.entryPoint || log.session?.entryPoint || "—"}</td>
                <td className="px-3 py-2 text-gray-700">{log.checkedBy?.fullName || log.checkedBy?.email || "—"}</td>
              </tr>
            ))}
            {!logs.length ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                  Aucun contrôle enregistré pour ce filtre.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CheckInResultCard({ result }) {
  if (!result) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-center gap-2 text-gray-500">
          <Clock3 className="h-5 w-5" />
          <span className="text-sm font-bold">En attente d'un scan</span>
        </div>
        <p className="mt-3 text-sm text-gray-500">
          Le dernier résultat de contrôle s'affichera ici avec le participant, le ticket et le statut.
        </p>
      </div>
    );
  }

  const ticket = result.ticket || {};
  const tone = result.ok
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : "border-red-200 bg-red-50 text-red-950";
  const Icon = result.ok ? CheckCircle2 : AlertTriangle;

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-full p-2 ${result.ok ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h4 className="text-lg font-black">{result.ok ? "Entrée validée" : "Entrée refusée"}</h4>
          <p className="mt-0.5 text-sm font-semibold opacity-80">{result.message}</p>
        </div>
      </div>

      {ticket.id ? (
        <div className="mt-4 space-y-3 rounded-xl bg-white/80 p-3 text-sm text-gray-950">
          <Info label="Participant" value={ticket.holderFullName || ticket.order?.buyerFullName || "—"} />
          <Info label="Code ticket" value={ticket.ticketCode || "—"} />
          <Info label="Type" value={ticket.ticketType?.label || "Standard"} />
          <Info label="Événement" value={ticket.event?.title || "—"} />
          {ticket.checkedInAt ? <Info label="Déjà contrôlé le" value={formatDateTime(ticket.checkedInAt)} /> : null}
          {ticket.checkedInBy ? <Info label="Contrôlé par" value={ticket.checkedInBy.fullName || ticket.checkedInBy.email} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function RecentCheckIns({ items }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-black uppercase tracking-wide text-gray-700">Derniers contrôles</h4>
      <div className="mt-3 space-y-2">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item.ticket?.id || item.scannedAt}-${index}`} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className={`rounded-full p-1.5 ${item.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                {item.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-gray-950">
                  {item.ticket?.holderFullName || item.ticket?.ticketCode || item.message}
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                  <User className="h-3 w-3" />
                  <span className="truncate">{item.ticket?.ticketCode || "Code non reconnu"}</span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
            Aucun ticket contrôlé sur cette session.
          </p>
        )}
      </div>
    </div>
  );
}

function SettingsTab({ event }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4">
      <h3 className="font-bold">Paramètres avancés</h3>
      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Info label="Fin" value={formatDateTime(event.endsAt)} />
        <Info label="Capacité globale" value={event.capacity || "—"} />
        <Info label="Ouverture ventes" value={formatDateTime(event.salesOpenAt)} />
        <Info label="Fermeture ventes" value={formatDateTime(event.salesCloseAt)} />
      </div>
      <Link
        to={`/marketing/ticket-events/${event.id}/edit`}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
      >
        <Edit className="h-4 w-4" />
        Modifier les informations
      </Link>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1 font-semibold text-gray-900">{value}</div>
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
