import { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Check,
  Copy,
  ExternalLink,
  Heart,
  Loader2,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import { memorialsService } from "../services/memorialsService";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "En attente" },
  { value: "PUBLISHED", label: "Publiés" },
  { value: "REJECTED", label: "Rejetés" },
  { value: "ARCHIVED", label: "Archivés" },
  { value: "ALL", label: "Tous" },
];

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function fromMemorial(memorial = {}) {
  return {
    slug: memorial.slug || "livre-blanc",
    title: memorial.title || "Livre blanc d'hommage",
    personName: memorial.personName || "",
    subtitle: memorial.subtitle || "",
    birthDate: toDateInput(memorial.birthDate),
    deathDate: toDateInput(memorial.deathDate),
    coverImageUrl: memorial.coverImageUrl || "",
    biography: memorial.biography || "",
    thankYouMessage: memorial.thankYouMessage || "",
    published: memorial.published !== false,
  };
}

function inputClass() {
  return "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function statusClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "PUBLISHED") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "PENDING") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "REJECTED") return "border-red-200 bg-red-50 text-red-700";
  return "border-gray-200 bg-gray-50 text-gray-600";
}

function publicUrl(slug) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const frontendOrigin = origin.includes("517") || origin.includes("localhost")
    ? "http://127.0.0.1:5173"
    : "https://forevercivstore.com";
  return `${frontendOrigin}/hommage/${encodeURIComponent(slug || "livre-blanc")}`;
}

export default function MemorialsPage() {
  const [status, setStatus] = useState("PENDING");
  const [query, setQuery] = useState("");
  const [tributes, setTributes] = useState([]);
  const [memorial, setMemorial] = useState(null);
  const [form, setForm] = useState(fromMemorial());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const link = publicUrl(form.slug);

  async function load(nextStatus = status) {
    try {
      setLoading(true);
      setError("");
      const response = await memorialsService.listTributes({
        slug: form.slug || "livre-blanc",
        status: nextStatus,
      });
      setTributes(response?.data || []);
      setMemorial(response?.memorial || null);
      setForm(fromMemorial(response?.memorial || {}));
    } catch (err) {
      setError(err?.response?.data?.message || "Chargement du livre d'hommage impossible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("PENDING");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTributes = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return tributes;
    return tributes.filter((tribute) =>
      [tribute.authorName, tribute.relationship, tribute.message, tribute.authorEmail, tribute.authorPhone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [query, tributes]);

  function updateForm(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setMessage("");
  }

  async function saveMemorial() {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const saved = await memorialsService.saveMemorial(form);
      setMemorial(saved);
      setForm(fromMemorial(saved));
      setMessage("Page d'hommage enregistrée.");
    } catch (err) {
      setError(err?.response?.data?.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(tribute, nextStatus) {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await memorialsService.updateTributeStatus(tribute.id, nextStatus);
      setMessage("Statut de l'hommage mis à jour.");
      await load(status);
    } catch (err) {
      setError(err?.response?.data?.message || "Mise à jour impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Lien public copié.");
    } catch {
      setMessage(link);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">
            Livre blanc virtuel
          </p>
          <h1 className="text-2xl font-bold text-gray-950">Hommages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configurez la page publique et validez les messages des proches.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
          >
            <Copy className="h-4 w-4" />
            Copier le lien
          </button>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-semibold text-white"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir
          </a>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[430px_minmax(0,1fr)]">
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-gray-950">Page publique</h2>
              <p className="mt-1 text-sm text-gray-500">Ces informations sont visibles par les proches.</p>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-amber-600" /> : null}
          </div>

          <div className="mt-5 space-y-4">
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Slug</span>
              <input className={inputClass()} value={form.slug} onChange={(e) => updateForm("slug", e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Nom de la personne</span>
              <input className={inputClass()} value={form.personName} onChange={(e) => updateForm("personName", e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Titre</span>
              <input className={inputClass()} value={form.title} onChange={(e) => updateForm("title", e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sous-titre</span>
              <textarea rows={2} className={inputClass()} value={form.subtitle} onChange={(e) => updateForm("subtitle", e.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date naissance</span>
                <input type="date" className={inputClass()} value={form.birthDate} onChange={(e) => updateForm("birthDate", e.target.value)} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date décès</span>
                <input type="date" className={inputClass()} value={form.deathDate} onChange={(e) => updateForm("deathDate", e.target.value)} />
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Photo de couverture URL</span>
              <input className={inputClass()} value={form.coverImageUrl} onChange={(e) => updateForm("coverImageUrl", e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Biographie</span>
              <textarea rows={6} className={inputClass()} value={form.biography} onChange={(e) => updateForm("biography", e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Message de remerciement</span>
              <textarea rows={3} className={inputClass()} value={form.thankYouMessage} onChange={(e) => updateForm("thankYouMessage", e.target.value)} />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700">
              <input type="checkbox" checked={form.published} onChange={(e) => updateForm("published", e.target.checked)} className="h-4 w-4 accent-amber-500" />
              Page publiée
            </label>
          </div>

          <button
            type="button"
            onClick={saveMemorial}
            disabled={saving || !form.personName.trim() || !form.title.trim()}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-gray-950 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer la page
          </button>
        </section>

        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Hommages affichés" value={memorial?.publishedTributeCount || 0} />
            <Stat label="Liste courante" value={tributes.length} />
            <Stat label="Statut" value={form.published ? "Publié" : "Masqué"} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_auto]">
              <label className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher dans les hommages..."
                  className="w-full text-sm outline-none"
                />
              </label>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  load(e.target.value);
                }}
                className={inputClass()}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => load(status)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
              >
                <RefreshCw className="h-4 w-4" />
                Actualiser
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredTributes.map((tribute) => (
              <article key={tribute.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-950">{tribute.authorName}</h3>
                      {tribute.relationship ? <span className="text-sm text-gray-500">{tribute.relationship}</span> : null}
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusClass(tribute.status)}`}>
                        {tribute.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{formatDate(tribute.createdAt)}</div>
                    {(tribute.authorEmail || tribute.authorPhone) ? (
                      <div className="mt-1 text-xs text-gray-500">
                        {[tribute.authorEmail, tribute.authorPhone].filter(Boolean).join(" | ")}
                      </div>
                    ) : null}
                  </div>
                  <Heart className="h-5 w-5 text-amber-500" />
                </div>

                <p className="mt-4 whitespace-pre-line text-sm leading-6 text-gray-700">{tribute.message}</p>
                {tribute.photoUrl ? (
                  <a href={tribute.photoUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-blue-700">
                    Voir la photo souvenir
                  </a>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-2">
                  {tribute.status !== "PUBLISHED" ? (
                    <button type="button" onClick={() => updateStatus(tribute, "PUBLISHED")} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 disabled:opacity-50">
                      <Check className="h-3.5 w-3.5" />
                      Publier
                    </button>
                  ) : null}
                  {tribute.status !== "REJECTED" ? (
                    <button type="button" onClick={() => updateStatus(tribute, "REJECTED")} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" />
                      Rejeter
                    </button>
                  ) : null}
                  {tribute.status !== "ARCHIVED" ? (
                    <button type="button" onClick={() => updateStatus(tribute, "ARCHIVED")} disabled={saving} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 disabled:opacity-50">
                      <Archive className="h-3.5 w-3.5" />
                      Archiver
                    </button>
                  ) : null}
                </div>
              </article>
            ))}

            {!filteredTributes.length ? (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-gray-500">
                Aucun hommage pour ce filtre.
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-black text-gray-950">{value}</div>
    </div>
  );
}
