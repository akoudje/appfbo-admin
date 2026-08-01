// src/components/ProductPackagingsManager.jsx
// Gestion des unités de caisse (pack de 6, carton de 12...) d'un produit.
// Le SKU du produit reste unique et commun à tous ses conditionnements : ce qui
// distingue un conditionnement d'un autre, c'est son libellé + son nombre d'unités.

import { useEffect, useState } from "react";
import * as packagingsService from "../services/productPackagingsService";

const EMPTY_FORM = { label: "", unitsPerPackage: "", barcode: "", prixFcfa: "", actif: true };

function extractApiErrorMessage(e) {
  return (
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    "Une erreur est survenue. Réessaie."
  );
}

export default function ProductPackagingsManager({ productId, productSku }) {
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
      prixFcfa: p.prixFcfa === null || p.prixFcfa === undefined ? "" : String(p.prixFcfa),
      actif: Boolean(p.actif),
    });
    setError("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");

    const label = form.label.trim();
    const unitsPerPackage = Number.parseInt(form.unitsPerPackage, 10);

    if (!label) return setError("Le libellé est requis (ex: Carton de 12)");
    if (!Number.isFinite(unitsPerPackage) || unitsPerPackage <= 0) {
      return setError("Le nombre d'unités doit être un entier positif");
    }

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
        const updated = await packagingsService.update(productId, editingId, payload);
        setPackagings((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
      } else {
        const created = await packagingsService.create(productId, payload);
        setPackagings((prev) => [...prev, created].sort((a, b) => a.unitsPerPackage - b.unitsPerPackage));
      }
      startCreate();
    } catch (e) {
      setError(extractApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(p) {
    if (!window.confirm(`Supprimer le conditionnement "${p.label}" ?`)) return;
    try {
      await packagingsService.remove(productId, p.id);
      setPackagings((prev) => prev.filter((x) => x.id !== p.id));
      if (editingId === p.id) startCreate();
    } catch (e) {
      setError(extractApiErrorMessage(e));
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Unités de caisse</h3>
        <p className="mt-0.5 text-xs text-gray-500">
          Conditionnements de vente (pack de 6, carton de 12...) pour le SKU{" "}
          <span className="font-medium text-gray-700">{productSku}</span>. Le SKU reste le
          même pour tous les conditionnements.
        </p>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Chargement...</div>
      ) : (
        <div className="mb-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th className="py-2 pr-3">Libellé</th>
                <th className="py-2 pr-3">Unités</th>
                <th className="py-2 pr-3">Code-barres</th>
                <th className="py-2 pr-3">Prix (FCFA)</th>
                <th className="py-2 pr-3">Actif</th>
                <th className="py-2 pr-3"></th>
              </tr>
            </thead>
            <tbody>
              {packagings.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-xs text-gray-400">
                    Aucun conditionnement pour ce produit — il est vendu à l'unité.
                  </td>
                </tr>
              )}
              {packagings.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="py-2 pr-3 font-medium text-gray-800">{p.label}</td>
                  <td className="py-2 pr-3 text-gray-600">{p.unitsPerPackage}</td>
                  <td className="py-2 pr-3 text-gray-500">{p.barcode || "—"}</td>
                  <td className="py-2 pr-3 text-gray-600">
                    {p.prixFcfa === null || p.prixFcfa === undefined
                      ? "—"
                      : Number(p.prixFcfa).toLocaleString("fr-FR")}
                  </td>
                  <td className="py-2 pr-3">
                    {p.actif ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 border border-emerald-200">
                        Actif
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 border border-gray-200">
                        Inactif
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="mr-2 text-xs font-semibold text-gray-700 hover:underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(p)}
                      className="text-xs font-semibold text-red-600 hover:underline"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="col-span-2 sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-gray-700">Libellé</label>
          <input
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Carton de 12"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Nb unités</label>
          <input
            type="number"
            min="1"
            value={form.unitsPerPackage}
            onChange={(e) => setForm((f) => ({ ...f, unitsPerPackage: e.target.value }))}
            placeholder="12"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Code-barres</label>
          <input
            value={form.barcode}
            onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
            placeholder="Optionnel"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700">Prix (FCFA)</label>
          <input
            type="number"
            min="0"
            value={form.prixFcfa}
            onChange={(e) => setForm((f) => ({ ...f, prixFcfa: e.target.value }))}
            placeholder="Auto"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={form.actif}
              onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))}
            />
            Actif
          </label>
        </div>

        <div className="col-span-2 flex items-center gap-2 sm:col-span-5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {editingId ? "Enregistrer" : "Ajouter le conditionnement"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={startCreate}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
            >
              Annuler
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
