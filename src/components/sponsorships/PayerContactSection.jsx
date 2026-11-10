// Personne qui paie l'achat de parrainage quand ce n'est ni le parrain ni le
// filleul : saisie par le parrain dans sa fiche, ajoutée ou corrigée ici.
// Elle reçoit aussi les notifications de paiement (lien, relances,
// confirmation), en plus du parrain.

import { useState } from "react";
import { Pencil } from "lucide-react";
import { sponsorshipsService } from "../../services/sponsorshipsService";

const EDITABLE_STATUSES = new Set(["SUBMITTED", "CHANGES_REQUESTED", "APPROVED_PENDING_PURCHASE"]);

function toForm(row) {
  return {
    payerName: row.purchasePayerName || "",
    payerPhone: row.purchasePayerPhone || "",
    payerEmail: row.purchasePayerEmail || "",
  };
}

export default function PayerContactSection({ row, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(() => toForm(row));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasPayer = Boolean(row.purchasePayerName || row.purchasePayerPhone || row.purchasePayerEmail);
  const editable = EDITABLE_STATUSES.has(row.status);

  const startEdit = () => {
    setForm(toForm(row));
    setError("");
    setEditing(true);
  };

  const save = async (values) => {
    setBusy(true);
    setError("");
    try {
      await sponsorshipsService.updatePayer(row.id, values);
      setEditing(false);
      await onSaved?.(hasPayer || values.payerPhone || values.payerEmail ? "Payeur de l'achat enregistré." : "");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'enregistrer le payeur.");
    } finally {
      setBusy(false);
    }
  };

  const field = (name, label, props = {}) => (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      <input
        value={form[name]}
        onChange={(e) => setForm((v) => ({ ...v, [name]: e.target.value }))}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        {...props}
      />
    </label>
  );

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Personne qui paie l'achat</h2>
        {editable && !editing ? (
          <button type="button" onClick={startEdit} className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50">
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> {hasPayer ? "Modifier" : "Ajouter"}
          </button>
        ) : null}
      </div>

      {!editing ? (
        hasPayer ? (
          <>
            <dl className="text-sm">
              {[
                ["Nom", row.purchasePayerName],
                ["Téléphone", row.purchasePayerPhone],
                ["Email", row.purchasePayerEmail],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-[150px_1fr] gap-2 py-1">
                  <dt className="text-gray-500">{label}</dt>
                  <dd className="break-words font-medium text-gray-900">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-gray-500">Reçoit aussi le lien de paiement, les relances et la confirmation, en plus du parrain.</p>
          </>
        ) : (
          <p className="text-sm text-gray-500">Le parrain règle lui-même (aucune autre personne indiquée).</p>
        )
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            save(form);
          }}
        >
          {field("payerName", "Nom (facultatif)", { autoComplete: "off" })}
          <div className="grid gap-3 sm:grid-cols-2">
            {field("payerPhone", "Téléphone", { inputMode: "tel", placeholder: "07 00 00 00 00" })}
            {field("payerEmail", "Email", { type: "email", inputMode: "email", placeholder: "nom@exemple.com" })}
          </div>
          <p className="text-xs text-gray-500">Téléphone, email, ou les deux. Les prochaines notifications de paiement lui seront aussi envoyées.</p>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={busy} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
            <button type="button" disabled={busy} onClick={() => setEditing(false)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700">
              Annuler
            </button>
            {hasPayer ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => save({ payerName: "", payerPhone: "", payerEmail: "" })}
                className="ml-auto rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
              >
                Retirer le payeur
              </button>
            ) : null}
          </div>
        </form>
      )}
    </section>
  );
}
