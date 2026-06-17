import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  CalendarDays,
  Edit,
  Eye,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Search,
  Ticket,
  Trash2,
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

  function selectEvent(eventId) {
    setSelectedEventId(eventId);
    setTicketTypeForm(emptyTicketTypeForm());
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
      await load({ eventId: selectedEventId });
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
                    onCancel={cancelOrder}
                  />
                ) : null}
                {activeTab === "checkin" ? (
                  <CheckInTab
                    checkInValue={checkInValue}
                    setCheckInValue={setCheckInValue}
                    saving={saving}
                    scannerActive={scannerActive}
                    scannerSupported={scannerSupported}
                    videoRef={videoRef}
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
  onCancel,
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
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-gray-100">
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
                  {order.paymentReference ? <div className="font-mono text-[11px] text-gray-400">{order.paymentReference}</div> : null}
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
                      {String(order.paymentProvider || order.paymentMethod || "").toUpperCase() === "WAVE" ? (
                        <button type="button" onClick={() => onSyncWave(order)} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Sync Wave
                        </button>
                      ) : null}
                      {order.status !== "CANCELLED" ? (
                        <button type="button" onClick={() => onCancel(order)} disabled={saving} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50">
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
  checkInValue,
  setCheckInValue,
  saving,
  scannerActive,
  scannerSupported,
  videoRef,
  onCheckIn,
  onStartScanner,
  onStopScanner,
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-emerald-950">Contrôle des tickets</h3>
          <p className="mt-1 text-sm text-emerald-800">
            Scannez le QR code du ticket numérique ou saisissez le code.
          </p>
        </div>
        <QrCode className="h-7 w-7 text-emerald-700" />
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onCheckIn();
        }}
        className="mt-4 flex gap-2"
      >
        <input
          className={inputClass()}
          value={checkInValue}
          onChange={(event) => setCheckInValue(event.target.value)}
          placeholder="QR token ou code ticket"
        />
        <button type="submit" disabled={saving || !checkInValue.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          Valider
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {!scannerActive ? (
          <button type="button" onClick={onStartScanner} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800">
            <Video className="h-4 w-4" />
            Scanner caméra
          </button>
        ) : (
          <button type="button" onClick={onStopScanner} className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700">
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
      {scannerActive ? <video ref={videoRef} className="mt-4 aspect-video w-full rounded-xl bg-black object-cover" muted playsInline /> : null}
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
