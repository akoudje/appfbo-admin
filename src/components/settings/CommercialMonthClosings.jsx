// Clôtures du mois commercial : pour chaque mois, la date et l'heure jusqu'à
// laquelle les FACTURES comptent pour ce mois, et l'heure limite d'envoi
// conseillée aux clients. Enregistré tout de suite (hors bouton Enregistrer).
import { useCallback, useEffect, useState } from "react";
import { CalendarRange, Loader2, Pencil, Trash2 } from "lucide-react";
import { settingsService } from "../../services/settingsService";
import { useConfirm } from "../../hooks/useDialogs";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-[#FFC600]/20 disabled:bg-gray-50";

// « 2026-11-03T13:00 » (déjà en heure du pays) -> « lun. 3 nov. 2026 à 13h00 ».
function formatLocal(value) {
  if (!value) return "—";
  const [date, time] = value.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const day = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return `${day} à ${time.replace(":", "h")}`;
}

// « de novembre 2026 », « d’octobre 2026 ».
const ofMonth = (label) => (/^[aeiouéèâêîôûàh]/i.test(label) ? "d’" : "de ") + label;

// Mois proposé : le mois commercial en cours s'il n'a pas de clôture, sinon le suivant.
const emptyForm = (current) => ({
  month: current ? (current.hasClosing ? current.next : current.month) : "",
  closesAtLocal: "",
  submitByLocal: "",
});

export default function CommercialMonthClosings({ countryCode, canWrite }) {
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [current, setCurrent] = useState(null);
  const [form, setForm] = useState(emptyForm(null));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await settingsService.getCommercialMonths(countryCode);
    setRows(result.data || []);
    setCurrent(result.current || null);
    return result;
  }, [countryCode]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    settingsService
      .getCommercialMonths(countryCode)
      .then((result) => {
        if (!active) return;
        setRows(result.data || []);
        setCurrent(result.current || null);
        setForm(emptyForm(result.current));
        setErrors({});
        setMessage(null);
      })
      .catch(() => {
        if (active) setMessage({ type: "error", text: "Impossible de charger les clôtures du mois commercial." });
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [countryCode]);

  const save = async (event) => {
    event.preventDefault();
    if (busy || !canWrite) return;
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      await settingsService.saveCommercialMonth(
        form.month,
        { closesAtLocal: form.closesAtLocal, submitByLocal: form.submitByLocal || null },
        countryCode,
      );
      const result = await load();
      setForm(emptyForm(result.current));
      setMessage({ type: "success", text: "Clôture enregistrée. Le site l’affiche dans la minute." });
    } catch (error) {
      setErrors(error?.response?.data?.errors || {});
      setMessage({ type: "error", text: error?.response?.data?.message || "Impossible d’enregistrer cette clôture." });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row) => {
    if (
      busy ||
      !(await confirm({
        title: `Supprimer la clôture ${ofMonth(row.label)} ?`,
        message: "Le mois se terminera alors à minuit le dernier jour du mois calendaire.",
        confirmLabel: "Supprimer",
        tone: "warning",
      }))
    )
      return;
    setBusy(true);
    setMessage(null);
    try {
      await settingsService.deleteCommercialMonth(row.month, countryCode);
      const result = await load();
      setForm(emptyForm(result.current));
      setMessage({ type: "success", text: `Clôture ${ofMonth(row.label)} supprimée.` });
    } catch (error) {
      setMessage({ type: "error", text: error?.response?.data?.message || "Impossible de supprimer cette clôture." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[#FFC600]/20 p-2">
          <CalendarRange className="h-5 w-5 text-gray-900" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-900">Mois commercial</h4>
          <p className="text-xs text-gray-500">
            Les précommandes <strong>facturées</strong> avant la clôture comptent pour le mois clôturé. Le site affiche aux
            clients l’heure limite d’envoi conseillée, pour laisser le temps de facturer. Heure du pays.
          </p>
          {current ? (
            <p className="mt-1 text-sm text-gray-900" role="status">
              Mois en cours : <strong>{current.label}</strong>
              {current.hasClosing ? (
                <>
                  {" "}
                  · clôture {formatLocal(rows.find((row) => row.month === current.month)?.closesAtLocal)}
                </>
              ) : (
                " · fin le dernier jour du mois à minuit (aucune clôture saisie)"
              )}
            </p>
          ) : null}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Chargement…</p>
      ) : rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-gray-500">
              <tr className="border-b border-gray-200">
                <th scope="col" className="py-2 pr-3">Mois</th>
                <th scope="col" className="py-2 pr-3">Facturation jusqu’au</th>
                <th scope="col" className="py-2 pr-3">Envoi conseillé avant</th>
                <th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.month} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium capitalize text-gray-900">{row.label}</td>
                  <td className="py-2 pr-3">{formatLocal(row.closesAtLocal)}</td>
                  <td className="py-2 pr-3">{formatLocal(row.submitByLocal)}</td>
                  <td className="py-2 text-right">
                    {canWrite ? (
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          aria-label={`Modifier la clôture ${ofMonth(row.label)}`}
                          disabled={busy}
                          onClick={() =>
                            setForm({ month: row.month, closesAtLocal: row.closesAtLocal, submitByLocal: row.submitByLocal })
                          }
                          className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Supprimer la clôture ${ofMonth(row.label)}`}
                          disabled={busy}
                          onClick={() => remove(row)}
                          className="rounded p-1.5 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gray-500">Aucune clôture saisie : chaque mois se termine à minuit le dernier jour.</p>
      )}

      {canWrite ? (
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-[150px_1fr_1fr_auto] sm:items-end">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-900">Mois</span>
            <input
              type="month"
              required
              value={form.month}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, month: event.target.value }))}
              className={inputClass}
            />
            {errors.month ? <span role="alert" className="block text-xs text-red-700">{errors.month}</span> : null}
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-900">Facturation jusqu’au</span>
            <input
              type="datetime-local"
              required
              value={form.closesAtLocal}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, closesAtLocal: event.target.value }))}
              className={inputClass}
            />
            {errors.closesAt ? <span role="alert" className="block text-xs text-red-700">{errors.closesAt}</span> : null}
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-gray-900">Envoi conseillé avant</span>
            <input
              type="datetime-local"
              value={form.submitByLocal}
              disabled={busy}
              onChange={(event) => setForm((prev) => ({ ...prev, submitByLocal: event.target.value }))}
              className={inputClass}
            />
            {errors.submitBy ? <span role="alert" className="block text-xs text-red-700">{errors.submitBy}</span> : null}
          </label>
          <button
            type="submit"
            disabled={busy || !form.month || !form.closesAtLocal}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </button>
        </form>
      ) : null}
      {message ? (
        <p role={message.type === "error" ? "alert" : "status"} className={`text-sm ${message.type === "error" ? "text-red-700" : "text-emerald-700"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
