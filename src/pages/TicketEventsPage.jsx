import { useEffect, useMemo, useState } from "react";
import { Permission, hasPermission } from "../auth/permissions";
import useAdminAuth from "../hooks/useAdminAuth";
import { ticketEventsService } from "../services/ticketEventsService";

const EVENT_STATUSES = [
  { value: "DRAFT", label: "Brouillon" },
  { value: "PUBLISHED", label: "Publié" },
  { value: "CLOSED", label: "Ventes fermées" },
  { value: "CANCELLED", label: "Annulé" },
];

function toDatetimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function formatFcfa(value) {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";
}

function emptyEventForm() {
  return {
    id: "",
    title: "Master Class Intelligence Artificielle & Marketing Relationnel",
    slug: "master-class-ia-marketing-relationnel-2026",
    subtitle: "Forever Level Up 2026",
    description: "L'IA au service de relations plus humaines, plus pertinentes, plus durables.",
    venueName: "",
    venueAddress: "",
    startsAt: "2026-07-05T09:00",
    endsAt: "",
    posterUrl: "",
    status: "DRAFT",
    capacity: "",
    salesOpenAt: "",
    salesCloseAt: "",
  };
}

function eventToForm(event) {
  return {
    id: event?.id || "",
    title: event?.title || "",
    slug: event?.slug || "",
    subtitle: event?.subtitle || "",
    description: event?.description || "",
    venueName: event?.venueName || "",
    venueAddress: event?.venueAddress || "",
    startsAt: toDatetimeLocal(event?.startsAt),
    endsAt: toDatetimeLocal(event?.endsAt),
    posterUrl: event?.posterUrl || "",
    status: event?.status || "DRAFT",
    capacity: event?.capacity || "",
    salesOpenAt: toDatetimeLocal(event?.salesOpenAt),
    salesCloseAt: toDatetimeLocal(event?.salesCloseAt),
  };
}

function emptyTicketTypeForm() {
  return {
    id: "",
    label: "Billet standard",
    description: "",
    priceFcfa: "",
    capacity: "",
    maxPerOrder: 10,
    active: true,
    sortOrder: 0,
  };
}

export default function TicketEventsPage() {
  const { role, permissions } = useAdminAuth();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [orders, setOrders] = useState([]);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [ticketTypeForm, setTicketTypeForm] = useState(emptyTicketTypeForm);
  const [orderQuery, setOrderQuery] = useState("");
  const [checkInValue, setCheckInValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) || events[0] || null,
    [events, selectedEventId],
  );

  const selectedEventPublicUrl = selectedEvent
    ? `/events/${selectedEvent.slug}`
    : "";
  const canValidatePayment = hasPermission(role, Permission.PAYMENT_VALIDATE, permissions);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const [eventsResponse, ordersResponse] = await Promise.all([
        ticketEventsService.listEvents(),
        ticketEventsService.listOrders({ q: orderQuery || undefined }),
      ]);
      const nextEvents = eventsResponse?.data || [];
      setEvents(nextEvents);
      setOrders(ordersResponse?.data || []);
      const nextSelected =
        nextEvents.find((event) => event.id === selectedEventId) || nextEvents[0] || null;
      if (nextSelected) {
        setSelectedEventId(nextSelected.id);
        setEventForm(eventToForm(nextSelected));
      }
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
    if (!selectedEvent) return;
    setEventForm(eventToForm(selectedEvent));
  }, [selectedEvent]);

  async function saveEvent(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const saved = await ticketEventsService.saveEvent(eventForm);
      setMessage("Événement enregistré.");
      setSelectedEventId(saved.id);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Enregistrement événement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function saveTicketType(event) {
    event.preventDefault();
    if (!selectedEvent?.id) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ticketEventsService.saveTicketType(selectedEvent.id, ticketTypeForm);
      setTicketTypeForm(emptyTicketTypeForm());
      setMessage("Type de billet enregistré.");
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Enregistrement billet impossible.");
    } finally {
      setSaving(false);
    }
  }

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

  async function cancelOrder(order) {
    if (!window.confirm(`Annuler la réservation ${order.orderNumber} ?`)) return;
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await ticketEventsService.cancelOrder(order.id, {
        note: "Réservation annulée depuis le module billetterie.",
      });
      setMessage(`Réservation ${order.orderNumber} annulée.`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Annulation réservation impossible.");
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
      setMessage(`${response.expired || 0} réservation(s) échue(s) expirée(s).`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Expiration des réservations impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function checkIn(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const ticket = await ticketEventsService.checkInTicket({ tokenOrCode: checkInValue });
      setCheckInValue("");
      setMessage(`Entrée validée : ${ticket.holderFullName} (${ticket.ticketCode}).`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Validation entrée impossible.");
    } finally {
      setSaving(false);
    }
  }

  const eventStats = useMemo(() => {
    const relatedOrders = selectedEvent
      ? orders.filter((order) => order.eventId === selectedEvent.id)
      : [];
    const paidOrders = relatedOrders.filter((order) => order.status === "PAID");
    const tickets = relatedOrders.flatMap((order) => order.tickets || []);
    return {
      orders: relatedOrders.length,
      paidOrders: paidOrders.length,
      tickets: tickets.length,
      activeTickets: tickets.filter((ticket) => ticket.status === "ACTIVE").length,
      usedTickets: tickets.filter((ticket) => ticket.status === "USED").length,
      revenue: paidOrders.reduce((sum, order) => sum + Number(order.totalFcfa || 0), 0),
    };
  }, [orders, selectedEvent]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Billetterie événementielle
          </p>
          <h1 className="text-2xl font-bold text-gray-950">Événements & billets</h1>
          <p className="mt-1 text-sm text-gray-500">
            Créez les événements, suivez les commandes de billets et validez les entrées.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSelectedEventId("");
            setEventForm(emptyEventForm());
          }}
          className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Nouvel événement
        </button>
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Commandes</div>
          <div className="mt-1 text-2xl font-bold">{eventStats.orders}</div>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-sm text-gray-500">Payées</div>
          <div className="mt-1 text-2xl font-bold">{eventStats.paidOrders}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Billets</div>
          <div className="mt-1 text-2xl font-bold">{eventStats.tickets}</div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="text-sm text-gray-500">Entrées</div>
          <div className="mt-1 text-2xl font-bold">{eventStats.usedTickets}</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-500">Recette</div>
          <div className="mt-1 text-2xl font-bold">{formatFcfa(eventStats.revenue)}</div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
        <form onSubmit={saveEvent} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Fiche événement</h2>
            {selectedEventPublicUrl ? (
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                {selectedEventPublicUrl}
              </span>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Titre">
              <input className={inputClass()} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
            </Field>
            <Field label="Slug public">
              <input className={inputClass()} value={eventForm.slug} onChange={(e) => setEventForm({ ...eventForm, slug: e.target.value })} />
            </Field>
            <Field label="Sous-titre">
              <input className={inputClass()} value={eventForm.subtitle} onChange={(e) => setEventForm({ ...eventForm, subtitle: e.target.value })} />
            </Field>
            <Field label="Statut">
              <select className={inputClass()} value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}>
                {EVENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </Field>
            <Field label="Début">
              <input type="datetime-local" className={inputClass()} value={eventForm.startsAt} onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })} />
            </Field>
            <Field label="Fin">
              <input type="datetime-local" className={inputClass()} value={eventForm.endsAt} onChange={(e) => setEventForm({ ...eventForm, endsAt: e.target.value })} />
            </Field>
            <Field label="Lieu">
              <input className={inputClass()} value={eventForm.venueName} onChange={(e) => setEventForm({ ...eventForm, venueName: e.target.value })} />
            </Field>
            <Field label="Capacité globale">
              <input type="number" min="0" className={inputClass()} value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })} />
            </Field>
            <Field label="Ouverture ventes">
              <input type="datetime-local" className={inputClass()} value={eventForm.salesOpenAt} onChange={(e) => setEventForm({ ...eventForm, salesOpenAt: e.target.value })} />
            </Field>
            <Field label="Fermeture ventes">
              <input type="datetime-local" className={inputClass()} value={eventForm.salesCloseAt} onChange={(e) => setEventForm({ ...eventForm, salesCloseAt: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Affiche URL">
                <input className={inputClass()} value={eventForm.posterUrl} onChange={(e) => setEventForm({ ...eventForm, posterUrl: e.target.value })} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea rows={3} className={inputClass()} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Adresse">
                <textarea rows={2} className={inputClass()} value={eventForm.venueAddress} onChange={(e) => setEventForm({ ...eventForm, venueAddress: e.target.value })} />
              </Field>
            </div>
          </div>
          <button type="submit" disabled={saving} className="mt-4 rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
            {saving ? "Enregistrement..." : "Enregistrer événement"}
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold">Événements</h2>
            <div className="mt-3 space-y-2">
              {loading ? <div className="text-sm text-gray-500">Chargement...</div> : null}
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelectedEventId(event.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                    selectedEvent?.id === event.id
                      ? "border-amber-300 bg-amber-50"
                      : "border-gray-200 bg-white hover:bg-gray-50"
                  }`}
                >
                  <div className="font-semibold text-gray-950">{event.title}</div>
                  <div className="text-xs text-gray-500">{event.status} • {formatDateTime(event.startsAt)}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={saveTicketType} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-bold">Type de billet</h2>
            <div className="mt-3 grid gap-3">
              <Field label="Libellé">
                <input className={inputClass()} value={ticketTypeForm.label} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, label: e.target.value })} />
              </Field>
              <Field label="Prix FCFA">
                <input type="number" min="0" className={inputClass()} value={ticketTypeForm.priceFcfa} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, priceFcfa: e.target.value })} />
              </Field>
              <Field label="Capacité">
                <input type="number" min="0" className={inputClass()} value={ticketTypeForm.capacity} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, capacity: e.target.value })} />
              </Field>
              <Field label="Max par commande">
                <input type="number" min="1" className={inputClass()} value={ticketTypeForm.maxPerOrder} onChange={(e) => setTicketTypeForm({ ...ticketTypeForm, maxPerOrder: e.target.value })} />
              </Field>
            </div>
            <button type="submit" disabled={saving || !selectedEvent?.id} className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              Ajouter le billet
            </button>

            <div className="mt-4 space-y-2">
              {(selectedEvent?.ticketTypes || []).map((type) => (
                <div key={type.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="font-semibold">{type.label}</span>
                    <span>{formatFcfa(type.priceFcfa)}</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {Number(type._count?.tickets || 0)} réservé(s)
                    {type.capacity ? ` / ${type.capacity}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </form>

          <form onSubmit={checkIn} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-lg font-bold text-emerald-950">Validation entrée</h2>
            <div className="mt-3 flex gap-2">
              <input className={inputClass()} value={checkInValue} onChange={(e) => setCheckInValue(e.target.value)} placeholder="Scanner ou saisir code billet" />
              <button type="submit" disabled={saving || !checkInValue.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Valider
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Commandes de billets</h2>
          <div className="flex gap-2">
            <button type="button" onClick={expireOrders} disabled={saving} className="rounded-lg border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 disabled:opacity-50">
              Expirer échues
            </button>
            <input
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Recherche nom, téléphone, FBO..."
              className={inputClass()}
            />
            <button type="button" onClick={load} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
              Rechercher
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-3 py-2">Commande</th>
                <th className="px-3 py-2">Acheteur</th>
                <th className="px-3 py-2">Événement</th>
                <th className="px-3 py-2">Billets</th>
                <th className="px-3 py-2">Montant</th>
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
                  <td className="px-3 py-2">{order.status}</td>
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
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">Aucune commande billet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
