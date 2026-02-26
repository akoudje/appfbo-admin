//src/pages/OrderDetail.jsx
// Page de détail d'une commande

import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ordersService } from "../services/ordersService";
import StatusBadge from "../components/StatusBadge";
import { formatDateTime, formatFcfa } from "../lib/format";

export default function OrderDetail() {
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await ordersService.getById(id);
      setOrder(data);
    } catch {
      setError("Impossible de charger la commande");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canInvoice = order?.status === "SUBMITTED";
  const canPay = order?.status === "INVOICED";

  const doInvoice = async () => {
    try {
      setSaving(true);
      await ordersService.invoice(id);
      await load();
    } catch {
      setError("Impossible de facturer");
    } finally {
      setSaving(false);
    }
  };

  const doPay = async () => {
    try {
      setSaving(true);
      await ordersService.pay(id);
      await load();
    } catch {
      setError("Impossible de marquer payé");
    } finally {
      setSaving(false);
    }
  };

  const copyWhatsApp = async () => {
    const text = order?.whatsappMessage || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  const waLink = useMemo(() => {
    const msg = order?.whatsappMessage ? encodeURIComponent(order.whatsappMessage) : "";
    // Sans numéro -> ouvre WhatsApp Web avec message
    return `https://wa.me/?text=${msg}`;
  }, [order?.whatsappMessage]);

  if (loading) return <div className="text-sm text-gray-500">Chargement…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!order) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Link to="/orders" className="text-sm text-gray-600 underline">
            ← Retour commandes
          </Link>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">Détail commande</h1>
            <StatusBadge status={order.status} />
          </div>
          <div className="text-xs text-gray-500 font-mono mt-1">{order.id}</div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button className="btn" onClick={load} disabled={saving}>
            Rafraîchir
          </button>

          <button
            className="btn"
            onClick={doInvoice}
            disabled={!canInvoice || saving}
            title="SUBMITTED → INVOICED"
          >
            Facturer
          </button>

          <button
            className="btn-primary"
            onClick={doPay}
            disabled={!canPay || saving}
            title="INVOICED → PAID"
          >
            Marquer payé
          </button>
        </div>
      </div>

      {/* Summary grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Col 1 */}
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Client FBO</div>

          <Row label="Numéro FBO" value={<span className="font-mono">{order.fboNumero}</span>} />
          <Row label="Nom" value={order.fboNomComplet} />
          <Row label="Grade" value={order.fboGrade} />
          <Row label="Point de vente" value={order.pointDeVente} />

          <div className="pt-2 border-t" />

          <Row label="Créée" value={formatDateTime(order.createdAt)} />
          <Row label="Soumise" value={formatDateTime(order.submittedAt)} />
          <Row label="Payée" value={formatDateTime(order.paidAt)} />
        </div>

        {/* Col 2 */}
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Paiement & Livraison</div>

          <Row label="PaymentMode" value={order.paymentMode} />
          <Row label="DeliveryMode" value={order.deliveryMode} />

          <div className="pt-2 border-t" />

          <div className="font-semibold">Facturation</div>
          <Row label="Référence facture" value={order.factureReference || "—"} />
          <Row label="WhatsApp To" value={order.factureWhatsappTo || "—"} />

          <div className="pt-2 border-t" />

          <div className="flex gap-2 flex-wrap">
            <button
              className="btn"
              onClick={copyWhatsApp}
              disabled={!order.whatsappMessage}
              title="Copier le message WhatsApp"
            >
              Copier WhatsApp
            </button>

            <a
              className={`btn ${!order.whatsappMessage ? "pointer-events-none opacity-50" : ""}`}
              href={waLink}
              target="_blank"
              rel="noreferrer"
            >
              Ouvrir WhatsApp
            </a>
          </div>

          {order.whatsappMessage ? (
            <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap border rounded-xl p-3 bg-gray-50 max-h-44 overflow-auto">
              {order.whatsappMessage}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Aucun message WhatsApp généré</div>
          )}
        </div>

        {/* Col 3 */}
        <div className="card p-4 space-y-3">
          <div className="font-semibold">Totaux</div>

          <Row label="Produits" value={formatFcfa(order.totalProduitsFcfa)} />
          <Row label="Livraison" value={formatFcfa(order.fraisLivraisonFcfa)} />
          <Row
            label={<span className="font-semibold">Total</span>}
            value={<span className="text-lg font-semibold">{formatFcfa(order.totalFcfa)}</span>}
          />

          <div className="pt-2 border-t" />

          <Row label="Total CC" value={String(order.totalCc)} />
          <Row label="Total poids (Kg)" value={String(order.totalPoidsKg)} />
        </div>
      </div>

      {/* Items */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="font-semibold">Items</div>
          <div className="text-sm text-gray-500">{order.items?.length || 0} ligne(s)</div>
        </div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr className="text-left">
                <th className="p-3">SKU</th>
                <th className="p-3">Produit</th>
                <th className="p-3">Qty</th>
                <th className="p-3">PU</th>
                <th className="p-3">Total</th>
              </tr>
            </thead>

            <tbody>
              {order.items?.length ? (
                order.items.map((it) => (
                  <tr key={it.id} className="border-t">
                    <td className="p-3 font-mono whitespace-nowrap">{it.product?.sku}</td>
                    <td className="p-3">{it.product?.nom}</td>
                    <td className="p-3 whitespace-nowrap">{it.qty}</td>
                    <td className="p-3 whitespace-nowrap">{formatFcfa(it.prixUnitaireFcfa)}</td>
                    <td className="p-3 font-semibold whitespace-nowrap">{formatFcfa(it.lineTotalFcfa)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="p-3" colSpan={5}>
                    Aucun item
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t flex justify-end text-sm">
          <span className="text-gray-600 mr-2">Total :</span>
          <span className="font-semibold">{formatFcfa(order.totalFcfa)}</span>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="text-gray-500">{label}</div>
      <div className="font-medium text-right">{value}</div>
    </div>
  );
}
