import { useEffect, useState } from 'react';
import { ordersService } from '../../../services/ordersService';

export default function ShippingQuotePanel({ order, reload, saving, allChecked }) {
  const [amount, setAmount] = useState(String(order.shippingFeeFcfa ?? ''));
  const [measure, setMeasure] = useState(String(order.shippingWeightKg ?? order.shippingParcelCount ?? ''));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  useEffect(() => {
    setAmount(String(order.shippingFeeFcfa ?? ''));
    setMeasure(String(order.shippingWeightKg ?? order.shippingParcelCount ?? ''));
  }, [order.shippingFeeFcfa, order.shippingWeightKg, order.shippingParcelCount]);
  const postal = order.deliveryMode === 'EXPEDITION_POSTE';
  const link = order.shippingPaymentLink;
  const notification = order.shippingNotification || notice;
  const paid = order.shippingFeeFcfa === 0 || (link?.status === 'PAID' && link?.providerStatus === 'SUCCEEDED');
  const expired = link?.status === 'EXPIRED' && link?.providerStatus === 'EXPIRED';
  const locked = Boolean((!expired && link?.providerSessionId) || ['PROCESSING', 'SUCCEEDED'].includes(link?.providerStatus));
  const editable = ['PAID', 'READY'].includes(order.status) && Boolean(order.preparationLaunchedAt) && allChecked && !locked;
  async function act(action = 'save') {
    if (busy) return;
    setBusy(true); setError('');
    try {
      let result;
      if (action === 'sync') result = await ordersService.syncShippingPayment(order.id);
      else if (action === 'notify') result = await ordersService.notifyShippingPayment(order.id);
      else result = await ordersService.shippingQuote(order.id, { shippingFeeFcfa: amount, [postal ? 'shippingWeightKg' : 'shippingParcelCount']: measure });
      if (result?.shippingNotification) {
        setNotice(result.shippingNotification);
        if (['FAILED', 'PARTIAL'].includes(result.shippingNotification.status)) setError(result.shippingNotification.message);
      }
      await reload();
    } catch (err) { setError(err.response?.data?.message || 'Impossible de mettre à jour les frais.'); }
    finally { setBusy(false); }
  }
  return <section id="shipping-quote" tabIndex={-1} aria-labelledby="shipping-quote-title" className="scroll-mt-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-sm">
    <h3 id="shipping-quote-title" className="font-semibold">Expédition par {postal ? 'La Poste' : 'Coditrans'} · Frais d’expédition</h3>
    <p className="break-words">{order.shippingRecipientName} · {order.shippingRecipientPhone}</p>
    <p>Destination : <strong>{order.shippingDestinationCity}</strong></p>
    <p className="text-gray-600">Vérifiez tous les articles, puis saisissez les frais selon {postal ? 'le poids final du colis emballé' : 'la ville et le nombre réel de cartons'}. Ils seront réglés séparément par le client avant expédition.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block font-medium">{postal ? 'Poids final (kg)' : 'Nombre de cartons'}<input type="number" min={postal ? '0.001' : '1'} step={postal ? '0.001' : '1'} value={measure} onChange={e => setMeasure(e.target.value)} disabled={!editable || busy || saving} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 p-2" /></label>
      <label className="block font-medium">Frais d’expédition (FCFA)<input type="number" min="0" step="1" value={amount} onChange={e => setAmount(e.target.value)} disabled={!editable || busy || saving} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 p-2" /></label>
    </div>
    {editable && <button type="button" onClick={() => act()} disabled={busy || saving} className="min-h-11 rounded-lg bg-[#FFC600] px-4 py-2 font-semibold disabled:opacity-50">{busy ? 'Traitement…' : 'Enregistrer les frais'}</button>}
    {order.shippingFeeFcfa == null ? <p className="text-amber-800">Frais à déterminer avant de marquer le colis prêt.</p> : <p className={paid ? 'text-emerald-700' : 'text-amber-800'}>{paid ? order.shippingFeeFcfa === 0 ? 'Expédition offerte.' : 'Expédition réglée.' : `En attente du paiement séparé : ${Number(link?.amountFcfa ?? order.shippingFeeFcfa).toLocaleString('fr-FR')} FCFA.`}</p>}
    {locked && !paid && <p className="text-gray-600">Un paiement a été lancé. Le montant est désormais verrouillé.</p>}
    {link && !paid && <>
      <div role="status" className="rounded-lg border border-gray-200 bg-gray-50 p-3">
        <p className="font-semibold">Notification au client</p>
        <p className={['FAILED', 'PARTIAL', 'NONE'].includes(notification?.status) ? 'mt-1 text-amber-800' : 'mt-1 text-gray-700'}>{notification?.message || 'Aucune notification de paiement enregistrée.'}</p>
        <p className="mt-1 text-xs text-gray-500">Email et SMS sont adressés aux coordonnées de la commande. Le SMS peut rester en file avant son envoi.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || saving} onClick={() => act('notify')} className="min-h-11 rounded-lg bg-[#FFC600] px-4 py-2 font-semibold disabled:opacity-50">{notification?.status && !['NONE', 'FAILED'].includes(notification.status) ? 'Renvoyer la notification' : 'Notifier le client'}</button>
        <button type="button" disabled={busy || saving} onClick={() => act('sync')} className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 font-semibold disabled:opacity-50">Vérifier le paiement</button>
      </div>
    </>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
