// src/components/sponsorships/CounterPurchasePanel.jsx
// Relance de l'achat de parrainage par le facturier : reprend le panier du
// parrain (ou en compose un), paiement et livraison, puis préfacture avec la
// référence et le montant AS400 ; parrain et filleul sont notifiés.

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Minus, Plus, Search, Trash2 } from "lucide-react";
import { sponsorshipsService } from "../../services/sponsorshipsService";

import { PURCHASE_PAYMENT_MODES as PAYMENT_MODES } from "./sponsorshipStatus";

const DELIVERY_MODES = [
  { value: "RETRAIT_SITE_FLP", label: "Retrait au siège" },
  { value: "LIVRAISON", label: "Livraison" },
];

const fcfa = (value) => `${Number(value || 0).toLocaleString("fr-FR")} F`;
const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm";

export default function CounterPurchasePanel({ sponsorship, onDone }) {
  // Brouillon existant, ou panier du parrain enregistré sur le parrainage : pas de
  // composition (le serveur reprend ce panier). Commande annulée : relance.
  const parentCart = Array.isArray(sponsorship.purchaseItems) && sponsorship.purchaseItems.length > 0;
  const hasDraft = sponsorship.purchasePreorder?.status === "DRAFT" || parentCart;
  const alreadySubmitted = sponsorship.purchasePreorder && !["DRAFT", "CANCELLED"].includes(sponsorship.purchasePreorder.status);
  const [catalog, setCatalog] = useState({ loading: !hasDraft && !alreadySubmitted, products: [], error: "" });
  const [cart, setCart] = useState([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState({
    paymentMode: sponsorship.purchasePaymentMode || "ESPECES",
    deliveryMode: sponsorship.purchaseDeliveryMode || "RETRAIT_SITE_FLP",
    factureReference: "",
    invoiceAmountFcfa: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (hasDraft || alreadySubmitted) return;
    sponsorshipsService
      .catalog(sponsorship.id)
      .then((data) => setCatalog({ loading: false, products: data.products || [], error: "" }))
      .catch((e) => setCatalog({ loading: false, products: [], error: e?.response?.data?.message || "Catalogue indisponible." }));
  }, [sponsorship.id, hasDraft, alreadySubmitted]);

  const byId = useMemo(() => new Map(catalog.products.map((p) => [p.id, p])), [catalog.products]);
  const total = cart.reduce((sum, line) => sum + Math.round((byId.get(line.productId)?.prixFcfa || 0) * line.qty), 0);
  const minimum = Number(sponsorship.minPurchaseFcfa || 0);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? catalog.products.filter((p) => `${p.nom} ${p.sku || ""}`.toLowerCase().includes(q)).slice(0, 8) : [];
  }, [catalog.products, query]);

  const setQty = (productId, qty) => {
    const max = byId.get(productId)?.maxQty || 0;
    const safe = Math.max(0, Math.min(Number.parseInt(qty, 10) || 0, max));
    setCart((prev) =>
      safe <= 0
        ? prev.filter((line) => line.productId !== productId)
        : prev.some((line) => line.productId === productId)
          ? prev.map((line) => (line.productId === productId ? { ...line, qty: safe } : line))
          : [...prev, { productId, qty: safe }],
    );
  };

  const submit = async () => {
    setError("");
    if (!hasDraft && total < minimum) {
      setError(`Le panier doit atteindre au moins ${fcfa(minimum)}.`);
      return;
    }
    setBusy(true);
    try {
      const data = await sponsorshipsService.counterPurchase(sponsorship.id, {
        ...form,
        invoiceAmountFcfa: Number(form.invoiceAmountFcfa),
        items: hasDraft ? undefined : cart,
      });
      setResult(data);
      onDone?.();
    } catch (e) {
      setError(e?.response?.data?.message || "Achat impossible.");
      if (e?.response?.data?.preorderId) onDone?.();
    } finally {
      setBusy(false);
    }
  };

  if (alreadySubmitted) {
    return (
      <p className="text-sm text-violet-900">
        Commande d'achat déjà soumise :{" "}
        <Link to={`/orders/${sponsorship.purchasePreorder.id}`} className="font-semibold underline">{sponsorship.purchasePreorder.preorderNumber}</Link>{" "}
        ({sponsorship.purchasePreorder.status}). Suivez-la depuis la commande.
      </p>
    );
  }
  if (result) {
    return (
      <p className="text-sm text-emerald-800">
        Achat préfacturé : <Link to={`/orders/${result.preorderId}`} className="font-semibold underline">{result.preorderNumber}</Link>. Parrain et filleul ont reçu le lien de paiement ; le parrainage sera validé au paiement.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {hasDraft ? (
        <p className="text-sm text-violet-900">
          {sponsorship.purchasePreorder?.status === "DRAFT" ? (
            <>
              Panier préparé par le parrain : commande <Link to={`/orders/${sponsorship.purchasePreorder.id}`} className="font-semibold underline">{sponsorship.purchasePreorder.preorderNumber}</Link> (brouillon).
            </>
          ) : (
            <>Panier du parrain repris : {sponsorship.purchaseItems.length} produit(s), {fcfa(sponsorship.purchaseIndicativeTotalFcfa)} indicatifs (quantités recalées sur le stock).</>
          )}
        </p>
      ) : catalog.loading ? (
        <p className="text-sm text-gray-500">Chargement du catalogue…</p>
      ) : catalog.error ? (
        <p className="text-sm text-red-600">{catalog.error}</p>
      ) : (
        <div className="space-y-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ajouter un produit (prix Client privilégié)…" className={`${inputClass} pl-9`} />
            {results.length ? (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => { setQty(p.id, (cart.find((l) => l.productId === p.id)?.qty || 0) + 1); setQuery(""); }} className="flex w-full justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50">
                      <span>{p.nom}</span>
                      <span className="text-xs text-gray-500">{fcfa(p.prixFcfa)} · stock {p.stockQty}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {cart.map((line) => {
            const p = byId.get(line.productId);
            return (
              <div key={line.productId} className="flex items-center justify-between gap-2 text-sm">
                <span>{p?.nom}</span>
                <span className="flex items-center gap-1">
                  <button type="button" onClick={() => setQty(line.productId, line.qty - 1)} className="rounded border p-1" aria-label="Moins"><Minus className="h-3 w-3" /></button>
                  <input type="number" value={line.qty} onChange={(e) => setQty(line.productId, e.target.value)} className="w-14 rounded border px-1 py-0.5 text-center" aria-label="Quantité" />
                  <button type="button" onClick={() => setQty(line.productId, line.qty + 1)} className="rounded border p-1" aria-label="Plus"><Plus className="h-3 w-3" /></button>
                  <button type="button" onClick={() => setQty(line.productId, 0)} className="p-1 text-red-600" aria-label="Retirer"><Trash2 className="h-3 w-3" /></button>
                </span>
              </div>
            );
          })}
          {cart.length ? (
            <p className={`text-sm font-semibold ${total < minimum ? "text-red-700" : "text-emerald-700"}`}>
              Total indicatif : {fcfa(total)} {total < minimum ? `— minimum ${fcfa(minimum)} non atteint` : "— minimum atteint"}
            </p>
          ) : null}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Paiement</span>
          <select value={form.paymentMode} onChange={(e) => setForm((f) => ({ ...f, paymentMode: e.target.value }))} className={inputClass}>
            {PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Livraison</span>
          <select value={form.deliveryMode} onChange={(e) => setForm((f) => ({ ...f, deliveryMode: e.target.value }))} className={inputClass}>
            {DELIVERY_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Référence AS400</span>
          <input value={form.factureReference} onChange={(e) => setForm((f) => ({ ...f, factureReference: e.target.value }))} className={`${inputClass} font-mono`} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-gray-700">Montant AS400 (FCFA)</span>
          <input type="number" min="0" value={form.invoiceAmountFcfa} onChange={(e) => setForm((f) => ({ ...f, invoiceAmountFcfa: e.target.value }))} className={inputClass} />
        </label>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        type="button"
        disabled={busy || !form.factureReference.trim() || !form.invoiceAmountFcfa || (!hasDraft && !cart.length)}
        onClick={submit}
        className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Préfacturation…" : "Relancer et préfacturer"}
      </button>
    </div>
  );
}
