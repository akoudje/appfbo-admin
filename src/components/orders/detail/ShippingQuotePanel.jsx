import { useState } from 'react';
import { ordersService } from '../../../services/ordersService';

export default function ShippingQuotePanel({ order, reload, saving, allChecked }) {
  const [amount, setAmount] = useState(String(order.shippingFeeFcfa ?? ''));
  const [measure, setMeasure] = useState(String(order.shippingWeightKg ?? order.shippingParcelCount ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const postal = order.deliveryMode === 'EXPEDITION_POSTE';
  const link = order.shippingPaymentLink;
  const paid = order.shippingFeeFcfa === 0 || (link?.status === 'PAID' && link?.providerStatus === 'SUCCEEDED');
  const expired = link?.status === 'EXPIRED' && link?.providerStatus === 'EXPIRED';
  const locked = Boolean((!expired && link?.providerSessionId) || ['PROCESSING', 'SUCCEEDED'].includes(link?.providerStatus));
  const editable = ['PAID', 'READY'].includes(order.status) && Boolean(order.preparationLaunchedAt) && allChecked && !locked;
  async function act(sync = false) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (sync) await ordersService.syncShippingPayment(order.id);
      else await ordersService.shippingQuote(order.id, { shippingFeeFcfa: amount, [postal ? 'shippingWeightKg' : 'shippingParcelCount']: measure });
      await reload();
    } catch (err) { setError(err.response?.data?.message || 'Impossible de mettre à jour les frais.'); }
    finally { setBusy(false); }
  }
  return <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
    <h3 className="font-semibold">Expédition par {postal ? 'La Poste' : 'Coditrans'}</h3>
    <p className="break-words">{order.shippingRecipientName} · {order.shippingRecipientPhone}</p>
    <p>Destination : <strong>{order.shippingDestinationCity}</strong></p>
    <p className="text-gray-600">Vérifiez tous les articles, puis saisissez les frais selon {postal ? 'le poids final du colis emballé' : 'la ville et le nombre réel de cartons'}. Ils seront réglés séparément par le client avant expédition.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block font-medium">{postal ? 'Poids final (kg)' : 'Nombre de cartons'}<input type="number" min={postal ? '0.001' : '1'} step={postal ? '0.001' : '1'} value={measure} onChange={e => setMeasure(e.target.value)} disabled={!editable || busy || saving} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 p-2" /></label>
      <label className="block font-medium">Frais d’expédition (FCFA)<input type="number" min="0" step="1" value={amount} onChange={e => setAmount(e.target.value)} disabled={!editable || busy || saving} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 p-2" /></label>
    </div>
    {editable && <button type="button" onClick={() => act()} disabled={busy || saving} className="min-h-11 rounded-lg bg-[#FFC600] px-4 py-2 font-semibold disabled:opacity-50">{busy ? 'Enregistrement…' : 'Enregistrer les frais'}</button>}
    {order.shippingFeeFcfa == null ? <p className="text-amber-800">Frais à déterminer avant de marquer le colis prêt.</p> : <p className={paid ? 'text-emerald-700' : 'text-amber-800'}>{paid ? order.shippingFeeFcfa === 0 ? 'Expédition offerte.' : 'Expédition réglée.' : `En attente du paiement séparé : ${Number(link?.amountFcfa ?? order.shippingFeeFcfa).toLocaleString('fr-FR')} FCFA.`}</p>}
    {locked && !paid && <p className="text-gray-600">Un paiement a été lancé. Le montant est désormais verrouillé.</p>}
    {link && !paid && <button type="button" disabled={busy || saving} onClick={() => act(true)} className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 font-semibold disabled:opacity-50">Vérifier le paiement</button>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
