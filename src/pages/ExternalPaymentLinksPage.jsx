import { useEffect, useMemo, useState } from "react";
import { Copy, Link as LinkIcon, Search } from "lucide-react";
import { externalPaymentLinksService } from "../services/externalPaymentLinksService";

function emptyForm() {
  return {
    customerPhone: "",
    baseAmountFcfa: "",
    paymentMethod: "WAVE",
    invoiceReference: "",
    title: "Paiement commande Forever",
    instructions: "",
    expiresAt: "",
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
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const feePreview = computeWaveFee(form.baseAmountFcfa);
  const totalPreview = (Number.parseInt(form.baseAmountFcfa, 10) || 0) + feePreview;

  const totals = useMemo(() => {
    const active = links.filter((link) => link.status === "ACTIVE");
    const paid = links.filter((link) => link.status === "PAID");
    return {
      count: links.length,
      active: active.length,
      paid: paid.length,
      paidAmount: paid.reduce((sum, link) => sum + Number(link.amountFcfa || 0), 0),
    };
  }, [links]);

  async function load() {
    try {
      setLoading(true);
      setError("");
      const response = await externalPaymentLinksService.list({
        q: query || undefined,
        status: status || undefined,
      });
      setLinks(response?.data || []);
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

  async function createLink(event) {
    event.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");
      const created = await externalPaymentLinksService.create(form);
      setForm(emptyForm());
      setMessage(`Lien généré : ${created.publicUrl}`);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Création du lien impossible.");
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

  async function setLinkStatus(link, nextStatus) {
    try {
      setSaving(true);
      setError("");
      setMessage("");
      await externalPaymentLinksService.updateStatus(link.id, nextStatus);
      setMessage(`Lien ${link.reference} mis à jour.`);
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

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <form onSubmit={createLink} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-bold">Générer un lien</h2>
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
            <Field label="Expiration">
              <input type="datetime-local" className={inputClass()} value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
            </Field>
          </div>
          <button type="submit" disabled={saving} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <LinkIcon className="h-4 w-4" />
            Générer le lien
          </button>
        </form>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Liens générés</h2>
            <div className="flex flex-wrap gap-2">
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
              <button type="button" onClick={load} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white">
                Filtrer
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-3 py-2">Référence</th>
                  <th className="px-3 py-2">Client</th>
                  <th className="px-3 py-2">Montant</th>
                  <th className="px-3 py-2">Statut</th>
                  <th className="px-3 py-2">Créé le</th>
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
                    <td className="px-3 py-2">{formatDateTime(link.createdAt)}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => copyLink(link)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">
                          <Copy className="h-3.5 w-3.5" />
                          Copier
                        </button>
                        {link.status !== "PAID" ? (
                          <button type="button" onClick={() => setLinkStatus(link, "PAID")} disabled={saving} className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">
                            Payé
                          </button>
                        ) : null}
                        {link.status === "ACTIVE" ? (
                          <button type="button" onClick={() => setLinkStatus(link, "CANCELLED")} disabled={saving} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50">
                            Annuler
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
                {!links.length && !loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">Aucun lien externe.</td>
                  </tr>
                ) : null}
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">Chargement...</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      </div>
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
