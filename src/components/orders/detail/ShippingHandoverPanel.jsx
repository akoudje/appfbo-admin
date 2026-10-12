import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersService } from '../../../services/ordersService';
function dateInput(value) {
  const date = value ? new Date(value) : new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
}
export default function ShippingHandoverPanel({
  order,
  reload
}) {
  const [reference, setReference] = useState(order.deliveryTracking || '');
  const [date, setDate] = useState(dateInput(order.shippingHandedOverAt));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [confirmed, setConfirmed] = useState(false);
  const handed = order.status === 'FULFILLED';
  const paid = order.shippingFeeFcfa === 0 || order.shippingPaymentLink?.status === 'PAID' && order.shippingPaymentLink?.providerStatus === 'SUCCEEDED';
  const carrier = order.deliveryMode === 'EXPEDITION_POSTE' ? 'La Poste' : 'Coditrans';
  async function submit(event) {
    event.preventDefault();
    if (busy || !confirmed) return;
    setBusy(true);
    setError('');
    try {
      await ordersService.fulfill(order.id, {
        deliveryTracking: reference.trim(),
        shippingHandedOverAt: new Date(date).toISOString(),
        fulfillmentMode: 'SHIPPING'
      });
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible d’enregistrer la remise au transporteur.');
    } finally {
      setBusy(false);
    }
  }
  async function upload(file) {
    if (!file || busy) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Le bordereau doit faire 8 Mo maximum.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await ordersService.uploadShippingReceipt(order.id, file);
      await reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Impossible de joindre le bordereau.');
    } finally {
      setBusy(false);
    }
  }
  async function download() {
    setBusy(true);
    setError('');
    try {
      const response = await ordersService.downloadShippingReceipt(order.id);
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bordereau-${order.parcelNumber || order.preorderNumber}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError('Impossible de consulter le bordereau.');
    } finally {
      setBusy(false);
    }
  }
  return <section id="shipping-handover" className="card space-y-4 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">{handed ? 'Remis au transporteur' : 'Remise au transporteur'} · {carrier}</h3><Link to={`/orders/${order.id}?tab=preparation`} className="btn min-h-11">Imprimer l’étiquette</Link></div>
    <p className="text-sm">{order.shippingRecipientName} · {order.shippingDestinationCity} · {order.shippingRecipientPhone}</p>
    <p className="text-sm text-gray-600">Cette étape confirme la prise en charge par le transporteur. Elle ne confirme pas la livraison au destinataire.</p>
    {handed ? <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-gray-500">Bordereau</dt><dd className="font-semibold">{order.deliveryTracking || 'Non renseigné (ancienne expédition)'}</dd></div><div><dt className="text-gray-500">Remise au transporteur</dt><dd className="font-semibold">{new Date(order.shippingHandedOverAt || order.fulfilledAt).toLocaleString('fr-FR')}</dd></div></dl> : <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Référence du bordereau<input required maxLength={120} value={reference} onChange={e => setReference(e.target.value)} disabled={busy} className="input mt-1 w-full" /></label><label className="text-sm">Date et heure de remise<input required type="datetime-local" step="1" max={dateInput()} value={date} onChange={e => setDate(e.target.value)} disabled={busy} className="input mt-1 w-full" /></label></div>
      {!paid && <p role="status" className="text-sm text-amber-800">Le paiement des frais d’expédition doit être confirmé avant la remise.</p>}
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} disabled={busy || !paid} />Je confirme que le colis a été remis à {carrier}.</label>
      <button type="submit" disabled={busy || !paid || !confirmed || !reference.trim()} className="btn btn-primary min-h-11 disabled:opacity-50">{busy ? 'Enregistrement…' : 'Confirmer la remise et notifier le client'}</button>
    </form>}
    <div className="border-t pt-3">{order.shippingReceiptAvailable ? <button type="button" onClick={download} disabled={busy} className="btn min-h-11">Consulter le bordereau joint</button> : <label className="block text-sm">Photo ou PDF du bordereau (optionnel)<input type="file" accept="image/jpeg,image/png,application/pdf" disabled={busy} onChange={e => upload(e.target.files?.[0])} className="mt-2 block w-full text-sm" /><span className="mt-1 block text-xs text-gray-500">JPG, PNG ou PDF · 8 Mo maximum · accès réservé aux préparateurs autorisés.</span></label>}</div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
