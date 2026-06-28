import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    venueName: "",
    venueAddress: "",
    startsAt: "",
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

export default function TicketEventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";
  const [event, setEvent] = useState(null);
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const publicUrl = useMemo(
    () => (eventForm.slug ? `/events/${eventForm.slug}` : ""),
    [eventForm.slug],
  );

  useEffect(() => {
    if (isNew) return;
    let mounted = true;
    async function loadEvent() {
      try {
        setLoading(true);
        const response = await ticketEventsService.getEvent(id);
        if (!mounted) return;
        setEvent(response);
        setEventForm(eventToForm(response));
      } catch (err) {
        if (mounted) setError(err?.response?.data?.message || "Événement introuvable.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadEvent();
    return () => {
      mounted = false;
    };
  }, [id, isNew]);

  async function saveEvent(submitEvent) {
    submitEvent.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const saved = await ticketEventsService.saveEvent(eventForm);
      setEvent(saved);
      setEventForm(eventToForm(saved));
      setMessage("Événement enregistré.");
      if (isNew) navigate(`/marketing/ticket-events?eventId=${saved.id}&tab=tickets`, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Enregistrement événement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadPoster(file) {
    if (!file) return;
    try {
      setUploadingPoster(true);
      setError("");
      setMessage("");
      const uploaded = await ticketEventsService.uploadPoster({
        file,
        slug: eventForm.slug || eventForm.title || "event-poster",
      });
      setEventForm((current) => ({ ...current, posterUrl: uploaded?.url || "" }));
      setMessage("Affiche uploadée. Enregistrez l'événement pour la conserver.");
    } catch (err) {
      setError(err?.response?.data?.message || "Upload de l'affiche impossible.");
    } finally {
      setUploadingPoster(false);
    }
  }

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-500">Chargement...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/marketing/ticket-events" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Retour aux événements
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-gray-950">
            {isNew ? "Créer un événement" : "Modifier l'événement"}
          </h1>
          {publicUrl ? <p className="mt-1 text-sm text-gray-500">{publicUrl}</p> : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      ) : null}
      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <form onSubmit={saveEvent} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold">Informations essentielles</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Field label="Titre">
              <input className={inputClass()} value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
            </Field>
            <Field label="Statut">
              <select className={inputClass()} value={eventForm.status} onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}>
                {EVENT_STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Sous-titre / édition">
                <input
                  className={inputClass()}
                  value={eventForm.subtitle}
                  onChange={(e) => setEventForm({ ...eventForm, subtitle: e.target.value })}
                  placeholder="Ex. Forever Level Up 2026"
                />
              </Field>
            </div>
            <Field label="Début">
              <input type="datetime-local" className={inputClass()} value={eventForm.startsAt} onChange={(e) => setEventForm({ ...eventForm, startsAt: e.target.value })} />
            </Field>
            <Field label="Lieu">
              <input className={inputClass()} value={eventForm.venueName} onChange={(e) => setEventForm({ ...eventForm, venueName: e.target.value })} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <textarea rows={5} className={inputClass()} value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
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
            <h2 className="text-lg font-bold">Affiche</h2>
            <Field label="URL affiche">
              <input className={inputClass()} value={eventForm.posterUrl} onChange={(e) => setEventForm({ ...eventForm, posterUrl: e.target.value })} />
            </Field>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className={`inline-flex items-center justify-center rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-800 ${uploadingPoster ? "opacity-60" : "cursor-pointer hover:bg-amber-50"}`}>
                {uploadingPoster ? "Upload en cours..." : "Uploader l'affiche"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  disabled={uploadingPoster || saving}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) uploadPoster(file);
                  }}
                />
              </label>
              <span className="text-xs text-gray-500">PNG, JPG, WEBP ou GIF. Maximum 5 MB.</span>
            </div>
            {eventForm.posterUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                <img src={eventForm.posterUrl} alt="Aperçu affiche événement" className="max-h-80 w-full object-contain" />
              </div>
            ) : null}
          </div>

          {!isNew && event?.id ? (
            <Link
              to={`/marketing/ticket-events?eventId=${event.id}&tab=tickets`}
              className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 hover:bg-amber-100"
            >
              Gérer les types de tickets, les achats et le contrôle d'accès
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
