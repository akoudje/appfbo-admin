import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Edit, Plus, QrCode, RefreshCw, Search, Ticket, Video, X } from "lucide-react";
import { Permission, hasPermission } from "../auth/permissions";
import useAdminAuth from "../hooks/useAdminAuth";
import { ticketEventsService } from "../services/ticketEventsService";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatFcfa(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
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

export default function TicketEventsPage() {
  const { role, permissions } = useAdminAuth();
  const [events, setEvents] = useState([]);
  const [orders, setOrders] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderStatus, setOrderStatus] = useState("");
  const [checkInValue, setCheckInValue] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);

  const canValidatePayment = hasPermission(role, Permission.PAYMENT_VALIDATE, permissions);

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || events[0] || null,
    [events, selectedEventId],
  );

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
      setEvents(nextEvents);
      setOrders(ordersResponse?.data || []);
      if (!selectedEventId && nextEvents[0]?.id) setSelectedEventId(nextEvents[0].id);
    } catch (err) {
      setError(err?.response?.data?.message || "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => stopScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markPaid(order) {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ticketEventsService.markOrderPaid(order.id, {
        paymentMethod: order.paymentMethod || "MANUAL",
        paymentReference: order.paymentReference || order.orderNumber,
      });
      setMessage(`Commande ${order.orderNumber} marquée payée.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Validation paiement impossible.");
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
      await load();
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
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Annulation achat impossible.");
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
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Expiration des achats impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function checkIn(tokenOrCode = checkInValue) {
    const raw = String(tokenOrCode || "").trim();
    if (!raw) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const ticket = await ticketEventsService.checkInTicket({ tokenOrCode: raw });
      setCheckInValue("");
      setMessage(`Entrée validée : ${ticket.holderFullName} (${ticket.ticketCode}).`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Validation entrée impossible.");
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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Billetterie événementielle
          </p>
          <h1 className="text-2xl font-bold text-gray-950">Gestion des événements</h1>
          <p className="mt-1 text-sm text-gray-500">
            Pilotez les événements, les achats de tickets et le contrôle d'accès.
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

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Événements</h2>
            {loading ? <span className="text-sm text-gray-500">Chargement...</span> : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => {
                  setSelectedEventId(event.id);
                  load({ eventId: event.id });
                }}
                role="button"
                tabIndex={0}
                className={`overflow-hidden rounded-2xl border text-left transition ${
                  selectedEvent?.id === event.id
                    ? "border-amber-300 bg-amber-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
                onKeyDown={(keyboardEvent) => {
                  if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
                    setSelectedEventId(event.id);
                    load({ eventId: event.id });
                  }
                }}
              >
                <div className="flex gap-3 p-3">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    {event.posterUrl ? (
                      <img src={event.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-amber-600">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold text-gray-950">{event.title}</div>
                    <div className="mt-1 text-xs text-gray-500">{formatDateTime(event.startsAt)}</div>
                    <div className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusBadge(event.status)}`}>
                      {event.status}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Link
                        to={`/marketing/ticket-events/${event.id}/edit`}
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Modifier
                      </Link>
                      <a
                        href={`/events/${event.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(clickEvent) => clickEvent.stopPropagation()}
                        className="rounded-lg border border-amber-200 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        Voir public
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {!events.length && !loading ? (
              <div className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-500">
                Aucun événement créé.
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-emerald-950">Contrôle des tickets</h2>
              <p className="mt-1 text-sm text-emerald-800">
                Scannez le QR code du ticket numérique ou saisissez le code.
              </p>
            </div>
            <QrCode className="h-7 w-7 text-emerald-700" />
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              checkIn();
            }}
            className="mt-4 flex gap-2"
          >
            <input
              className={inputClass()}
              value={checkInValue}
              onChange={(event) => setCheckInValue(event.target.value)}
              placeholder="QR token ou code ticket"
            />
            <button
              type="submit"
              disabled={saving || !checkInValue.trim()}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Valider
            </button>
          </form>

          <div className="mt-3 flex flex-wrap gap-2">
            {!scannerActive ? (
              <button
                type="button"
                onClick={startScanner}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800"
              >
                <Video className="h-4 w-4" />
                Scanner caméra
              </button>
            ) : (
              <button
                type="button"
                onClick={stopScanner}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700"
              >
                <X className="h-4 w-4" />
                Arrêter
              </button>
            )}
          </div>

          {!scannerSupported ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Le scan caméra n'est pas supporté par ce navigateur. Utilisez la saisie manuelle.
            </div>
          ) : null}

          {scannerActive ? (
            <video ref={videoRef} className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />
          ) : null}
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Achats de tickets</h2>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={expireOrders} disabled={saving} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">
              Expirer non payés
            </button>
            <select
              value={orderStatus}
              onChange={(event) => {
                const next = event.target.value;
                setOrderStatus(next);
                load({ status: next });
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
            <button type="button" onClick={() => load()} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
              Rechercher
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Achat</th>
                <th className="px-3 py-2">Acheteur</th>
                <th className="px-3 py-2">Événement</th>
                <th className="px-3 py-2">Tickets</th>
                <th className="px-3 py-2">Montant</th>
                <th className="px-3 py-2">Paiement</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs">{order.orderNumber}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{order.buyerFullName}</div>
                    <div className="text-xs text-gray-500">{order.buyerPhone}</div>
                  </td>
                  <td className="px-3 py-2">{order.event?.title || "—"}</td>
                  <td className="px-3 py-2">{order.tickets?.length || 0}</td>
                  <td className="px-3 py-2">{formatFcfa(order.totalFcfa)}</td>
                  <td className="px-3 py-2">
                    <div className="font-semibold">{order.paymentProvider || order.paymentMethod || "—"}</div>
                    <div className="text-xs text-gray-500">{order.paymentStatus || "—"}</div>
                    {order.paymentReference ? (
                      <div className="font-mono text-[11px] text-gray-400">{order.paymentReference}</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {order.status === "PAID" ? (
                      <span className="text-xs text-emerald-700">Payé</span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {canValidatePayment ? (
                          <button type="button" onClick={() => markPaid(order)} disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                            Marquer payé
                          </button>
                        ) : (
                          <span className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-500">
                            Paiement caisse
                          </span>
                        )}
                        {String(order.paymentProvider || order.paymentMethod || "").toUpperCase() === "WAVE" ? (
                          <button type="button" onClick={() => syncWavePayment(order)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">
                            <RefreshCw className="h-3.5 w-3.5" />
                            Sync Wave
                          </button>
                        ) : null}
                        {order.status !== "CANCELLED" ? (
                          <button type="button" onClick={() => cancelOrder(order)} disabled={saving} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">
                            Annuler
                          </button>
                        ) : null}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {!orders.length ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500">Aucun achat de ticket.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
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
