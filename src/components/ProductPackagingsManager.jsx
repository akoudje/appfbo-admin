// src/components/ProductPackagingsManager.jsx
// Gestion des unités de caisse (pack de 6, carton de 12...) d'un produit.
// Le SKU du produit reste unique et commun à tous ses conditionnements : ce qui
// distingue un conditionnement d'un autre, c'est son libellé + son nombre d'unités.

import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import * as packagingsService from "../services/productPackagingsService";
import { useConfirm } from "../hooks/useDialogs";

const EMPTY_FORM = {
  label: "",
  unitsPerPackage: "",
  barcode: "",
  prixFcfa: "",
  actif: true,
};
const inputClass =
  "min-h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40";

function extractApiErrorMessage(e) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Une erreur est survenue. Réessaie."
  );
}

export default function ProductPackagingsManager({ productId, productSku }) {
  const confirm = useConfirm();
  const [packagings, setPackagings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await packagingsService.list(productId);
        if (alive) setPackagings(rows);
      } catch (e) {
        if (alive) setError(extractApiErrorMessage(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      label: p.label || "",
      unitsPerPackage: String(p.unitsPerPackage ?? ""),
      barcode: p.barcode || "",
      prixFcfa:
        p.prixFcfa === null || p.prixFcfa === undefined
          ? ""
          : String(p.prixFcfa),
      actif: Boolean(p.actif),
    });
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const label = form.label.trim();
    const unitsPerPackage = Number(form.unitsPerPackage);

    if (!label) return setError("Le libellé est requis (ex: Carton de 12)");
    if (
      !Number.isSafeInteger(unitsPerPackage) ||
      unitsPerPackage <= 0 ||
      unitsPerPackage > 2147483647
    ) {
      return setError("Le nombre d'unités doit être un entier positif");
    }

    if (
      form.prixFcfa.trim() !== "" &&
      (!Number.isSafeInteger(Number(form.prixFcfa)) ||
        Number(form.prixFcfa) < 0 ||
        Number(form.prixFcfa) > 2147483647)
    )
      return setError("Le prix doit être un entier positif ou nul.");
    const payload = {
      label,
      unitsPerPackage,
      barcode: form.barcode.trim() || null,
      prixFcfa: form.prixFcfa.trim() === "" ? null : Number(form.prixFcfa),
      actif: Boolean(form.actif),
    };

    setSaving(true);
    try {
      if (editingId) {
        const updated = await packagingsService.update(
          productId,
          editingId,
          payload,
        );
        setPackagings((prev) =>
          prev.map((p) => (p.id === editingId ? updated : p)),
        );
      } else {
        const created = await packagingsService.create(productId, payload);
        setPackagings((prev) =>
          [...prev, created].sort(
            (a, b) => a.unitsPerPackage - b.unitsPerPackage,
          ),
        );
      }
      startCreate();
    } catch (e) {
      setError(extractApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p) {
    const ok = await confirm({
      tone: "danger",
      title: "Désactiver le conditionnement",
      message: `Désactiver le conditionnement "${p.label}" ?`,
      confirmLabel: "Désactiver",
    });
    if (!ok) return;
    try {
      await packagingsService.remove(productId, p.id);
      setPackagings((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, actif: false } : x)),
      );
      if (editingId === p.id) startCreate();
    } catch (e) {
      setError(extractApiErrorMessage(e));
    }
  }

  return (
    <section className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Package size={18} aria-hidden="true" />
          Conditionnements de vente
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Informations communes à tous les pays : packs, cartons et codes-barres
          pour le SKU{" "}
          <span className="font-medium text-gray-700">{productSku}</span>. Le
          SKU reste le même pour tous les conditionnements.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div role="status" className="py-4 text-sm text-gray-500">
          Chargement…
        </div>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[580px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-600">
                <th scope="col" className="px-3 py-3 font-semibold">
                  Libellé
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Unités
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Code-barres
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Prix (FCFA)
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Statut
                </th>
                <th scope="col" className="px-3 py-3 font-semibold">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {packagings.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-6 text-center text-sm text-gray-500"
                  >
                    Aucun conditionnement pour ce produit — il est vendu à
                    l'unité.
                  </td>
                </tr>
              )}
              {packagings.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-3 py-3 font-semibold text-gray-900">
                    {p.label}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-gray-600">
                    {p.unitsPerPackage}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-500">
                    {p.barcode || "—"}
                  </td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-gray-900">
                    {p.prixFcfa === null || p.prixFcfa === undefined
                      ? "—"
                      : Number(p.prixFcfa).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-3 py-3">
                    {p.actif ? (
                      <span className="inline-block rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800">
                        Actif
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="mr-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-800 hover:border-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
                      disabled={!p.actif || saving}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-red-700 hover:border-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
                    >
                      Désactiver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form
        onSubmit={onSubmit}
        className="grid grid-cols-2 gap-3 border-t border-gray-200 pt-4 lg:grid-cols-5"
      >
        <div className="col-span-2 min-w-0 lg:col-span-1">
          <label
            htmlFor={`packaging-label-${productId}`}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Libellé
          </label>
          <input
            id={`packaging-label-${productId}`}
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Carton de 12"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`packaging-units-${productId}`}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Nb unités
          </label>
          <input
            id={`packaging-units-${productId}`}
            type="number"
            min="1"
            value={form.unitsPerPackage}
            onChange={(e) =>
              setForm((f) => ({ ...f, unitsPerPackage: e.target.value }))
            }
            placeholder="12"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`packaging-barcode-${productId}`}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Code-barres
          </label>
          <input
            id={`packaging-barcode-${productId}`}
            value={form.barcode}
            onChange={(e) =>
              setForm((f) => ({ ...f, barcode: e.target.value }))
            }
            placeholder="Optionnel"
            className={inputClass}
          />
        </div>
        <div>
          <label
            htmlFor={`packaging-price-${productId}`}
            className="mb-1 block text-xs font-medium text-gray-600"
          >
            Prix (FCFA)
          </label>
          <input
            id={`packaging-price-${productId}`}
            type="number"
            min="0"
            value={form.prixFcfa}
            onChange={(e) =>
              setForm((f) => ({ ...f, prixFcfa: e.target.value }))
            }
            placeholder="Auto"
            className={inputClass}
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex min-h-10 items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[#FFC600]"
              checked={form.actif}
              onChange={(e) =>
                setForm((f) => ({ ...f, actif: e.target.checked }))
              }
            />
            Actif
          </label>
        </div>

        <div className="col-span-2 flex flex-wrap items-center gap-2 lg:col-span-5">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black hover:bg-[#E6B200] focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            {editingId ? "Enregistrer" : "Ajouter le conditionnement"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40"
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
