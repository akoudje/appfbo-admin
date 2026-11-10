import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { ordersService } from '../../../services/ordersService';

// Copie dans le presse-papiers, avec repli pour les navigateurs qui refusent
// l'API Clipboard (contexte non sécurisé, permission refusée).
async function copyText(text, input) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!input) return false;
    input.focus();
    input.select();
    try { return document.execCommand('copy'); } catch { return false; }
  }
}

// Lien de paiement des frais d'expédition, à copier pour l'envoyer soi-même
// au client (WhatsApp, appel…). Le serveur remet le lien en service s'il
// avait expiré à cause de la session Wave.
function ShippingPaymentLinkCopy({ order, disabled, onRenewed }) {
  const inputRef = useRef(null);
  // Lien renvoyé par le serveur à la copie (prioritaire), sinon celui de la commande.
  const [fetchedUrl, setFetchedUrl] = useState('');
  const url = fetchedUrl || order.shippingPaymentUrl || '';
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (state !== 'copied') return undefined;
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function handleCopy() {
    setState('busy'); setMessage('');
    try {
      const result = await ordersService.shippingPaymentLink(order.id);
      const fresh = result?.url || url;
      setFetchedUrl(fresh);
      const ok = await copyText(fresh, inputRef.current);
      setState(ok ? 'copied' : 'idle');
      if (!ok) setMessage('Copie automatique impossible : sélectionnez le lien ci-dessus et copiez-le.');
      if (!order.shippingPaymentUrl) onRenewed?.();
    } catch (err) {
      setState('idle');
      setMessage(err.response?.data?.message || 'Impossible de récupérer le lien de paiement.');
    }
  }

  return <div className="space-y-2 rounded-lg border border-gray-200 p-3">
    <p className="font-semibold">Lien de paiement</p>
    {order.shippingPaymentLinkExpired && !url && <p className="text-amber-800">La session de paiement Wave a expiré. « Copier le lien » ou « Renvoyer la notification » remet le lien en service.</p>}
    {url && <input ref={inputRef} readOnly value={url} onFocus={e => e.target.select()} aria-label="Lien de paiement des frais d’expédition" className="min-h-11 w-full rounded-lg border border-gray-300 bg-gray-50 p-2 font-mono text-xs" />}
    <button type="button" disabled={disabled || state === 'busy'} onClick={handleCopy} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 font-semibold disabled:opacity-50">
      {state === 'copied' ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {state === 'busy' ? 'Préparation…' : state === 'copied' ? 'Lien copié' : 'Copier le lien'}
    </button>
    <p className="text-xs text-gray-500">À envoyer directement au client (WhatsApp, SMS depuis votre téléphone…). C’est le même lien que celui des notifications.</p>
    {message && <p role="alert" className="text-amber-800">{message}</p>}
  </div>;
}

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
      <ShippingPaymentLinkCopy order={order} disabled={busy || saving} onRenewed={reload} />
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={busy || saving} onClick={() => act('notify')} className="min-h-11 rounded-lg bg-[#FFC600] px-4 py-2 font-semibold disabled:opacity-50">{notification?.status && !['NONE', 'FAILED'].includes(notification.status) ? 'Renvoyer la notification' : 'Notifier le client'}</button>
        <button type="button" disabled={busy || saving} onClick={() => act('sync')} className="min-h-11 rounded-lg border border-gray-300 px-4 py-2 font-semibold disabled:opacity-50">Vérifier le paiement</button>
      </div>
    </>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
  </section>;
}
