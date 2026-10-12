import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ordersService } from '../../services/ordersService';
const STAGES = [['TO_PREPARE', 'À préparer'], ['TO_QUOTE', 'Frais à fixer'], ['TO_PAY', 'En attente de paiement'], ['READY', 'Prêts à expédier'], ['HANDED_OVER', 'Remis au transporteur']];
const money = value => Number(value || 0).toLocaleString('fr-FR') + ' FCFA';
export default function ShipmentsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const stage = STAGES.some(([key]) => key === params.get('stage')) ? params.get('stage') : 'TO_PREPARE';
  const page = Math.max(1, parseInt(params.get('page'), 10) || 1);
  const [query, setQuery] = useState(params.get('q') || ''),
    [destination, setDestination] = useState(params.get('destination') || '');
  const [data, setData] = useState({
    data: [],
    stats: {},
    totalPages: 1,
    totalCount: 0
  });
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [updated, setUpdated] = useState(null);
  const stageNav = useRef(null);
  useEffect(() => { stageNav.current?.querySelector('[aria-current="page"]')?.scrollIntoView({block:'nearest',inline:'center'}); }, [stage]);
  const request = useRef(0),
    key = params.toString();
  const load = useCallback(async (silent = false) => {
    const sequence = ++request.current;
    if (!silent) setLoading(true);
    try {
      const result = await ordersService.getShipments({
        ...Object.fromEntries(new URLSearchParams(key)),
        stage,
        page,
        pageSize: 25
      });
      if (sequence !== request.current) return;
      setData(result);
      setError('');
      setUpdated(new Date());
      if (page > result.totalPages) setParams(previous => {
        const next = new URLSearchParams(previous);
        next.set('page', String(result.totalPages));
        return next;
      }, {
        replace: true
      });
    } catch (err) {
      if (sequence === request.current) setError(err.response?.data?.message || 'Impossible de charger les expéditions.');
    } finally {
      if (sequence === request.current) setLoading(false);
    }
  }, [key, stage, page, setParams]);
  useEffect(() => {
    const sequence = request;
    load();
    const timer = setInterval(() => load(true), 30000);
    return () => {
      clearInterval(timer);
      sequence.current++;
    };
  }, [load]);
  function change(values) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.delete('page');
      for (const [field, value] of Object.entries(values)) value ? next.set(field, value) : next.delete(field);
      return next;
    });
  }
  function open(row) {
    const tab = row.status === 'FULFILLED' || row.shippingStage === 'READY' ? 'fulfillment' : 'preparation';
    navigate(`/orders/${row.id}?tab=${tab}&returnTo=${encodeURIComponent('/preparation/shipments?' + key)}`);
  }
  return <div className="space-y-4">
    <header className="card flex flex-wrap items-start justify-between gap-3 p-4"><div><h1 className="text-xl font-semibold">Expéditions</h1><p className="mt-1 text-sm text-gray-500">La Poste et Coditrans · préparation, frais et remise au transporteur</p><p className="mt-2 text-xs text-gray-500">{updated ? `Actualisé à ${updated.toLocaleTimeString('fr-FR')}` : 'Chargement…'}</p></div><div className="flex flex-wrap gap-2"><Link to="/preparation" className="btn min-h-11">Tous les colis</Link><button type="button" onClick={() => load()} disabled={loading} className="btn min-h-11">Actualiser</button></div></header>
    <nav ref={stageNav} aria-label="Étapes des expéditions" className="flex gap-2 overflow-x-auto pb-1 xl:grid xl:grid-cols-5">{STAGES.map(([id, label]) => <button type="button" key={id} aria-current={stage === id ? 'page' : undefined} onClick={() => change({
        stage: id
      })} className={`min-h-20 min-w-44 shrink-0 border p-3 text-left xl:min-w-0 ${stage === id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white'}`}><span className="block text-sm">{label}</span><strong className="mt-1 block text-xl">{data.stats[id] ?? '—'}</strong></button>)}</nav>
    <form onSubmit={e => {
      e.preventDefault();
      change({
        q: query.trim(),
        destination: destination.trim()
      });
    }} className="card grid gap-3 p-4 sm:grid-cols-2 xl:flex"><label className="min-w-0 flex-1 text-xs text-gray-500">Colis, client, destinataire ou bordereau<input value={query} onChange={e => setQuery(e.target.value)} maxLength={200} className="input mt-1 w-full" /></label><label className="text-xs text-gray-500">Ville de destination<input value={destination} onChange={e => setDestination(e.target.value)} maxLength={120} className="input mt-1 w-full" /></label><label className="text-xs text-gray-500">Transporteur<select value={params.get('carrier') || ''} onChange={e => change({
          carrier: e.target.value
        })} className="input mt-1 w-full"><option value="">Tous les transporteurs</option><option value="EXPEDITION_POSTE">La Poste</option><option value="EXPEDITION_CODITRANS">Coditrans</option></select></label><button type="submit" className="btn btn-primary self-end min-h-11">Rechercher</button><button type="button" onClick={() => {
        setQuery('');
        setDestination('');
        setParams({
          stage
        });
      }} className="btn self-end min-h-11">Réinitialiser</button></form>
    {error && <p role="alert" className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section aria-label="Colis à expédier" aria-busy={loading} className="card overflow-hidden">{loading ? <p role="status" className="p-6 text-sm">Chargement des expéditions…</p> : !data.data.length ? <p className="p-8 text-center text-gray-500">Aucun colis dans cette étape avec ces filtres.</p> : <div className="grid divide-y">{data.data.map(row => <article key={row.id} className="grid items-start gap-4 p-4 md:grid-cols-[1fr_1.3fr_1fr_auto]">
      <div><strong>{row.parcelNumber || row.preorderNumber}</strong><p className="mt-1 text-xs text-gray-500">{row.preorderNumber}</p><span className="mt-2 inline-block border px-2 py-1 text-xs">{row.deliveryMode === 'EXPEDITION_POSTE' ? 'La Poste' : 'Coditrans'}</span></div>
      <div><p className="font-semibold">{row.shippingRecipientName || 'Destinataire non renseigné'}</p><p className="text-sm">{row.shippingDestinationCity || 'Destination non renseignée'} · {row.shippingRecipientPhone || '—'}</p><p className="mt-1 text-xs text-gray-500">Client : {row.fboNomComplet}</p><p className="mt-2 text-sm">{row.deliveryMode === 'EXPEDITION_POSTE' ? row.shippingWeightKg ? `${row.shippingWeightKg} kg` : 'Poids à déterminer' : row.shippingParcelCount ? `${row.shippingParcelCount} carton(s)` : 'Cartons à déterminer'}</p></div>
      <div><p className="text-xs text-emerald-700">Produits payés · {money(row.totalFcfa)}</p><p className="mt-1 font-semibold">{row.shippingPayment.status === 'TO_QUOTE' ? 'Frais à fixer' : row.shippingFeeFcfa === 0 ? 'Expédition offerte' : `${money(row.shippingPayment.amountToPayFcfa)} · ${row.shippingPayment.status === 'PAID' ? 'Expédition payée' : 'À régler'}`}</p>{row.deliveryTracking && <p className="mt-2 break-all text-xs">Bordereau : {row.deliveryTracking}</p>}{row.fulfilledAt && <p className="mt-1 text-xs text-gray-500">Remis le {new Date(row.shippingHandedOverAt || row.fulfilledAt).toLocaleString('fr-FR')}</p>}</div>
      <button type="button" onClick={() => open(row)} className="btn btn-primary min-h-11">{stage === 'READY' ? 'Remettre au transporteur' : stage === 'TO_QUOTE' ? 'Fixer les frais' : stage === 'TO_PAY' ? 'Suivre le paiement' : stage === 'HANDED_OVER' ? 'Voir le suivi' : 'Préparer le colis'}</button>
    </article>)}</div>}</section>
    <nav aria-label="Pagination des expéditions" className="flex items-center justify-between gap-2 text-sm"><button type="button" disabled={loading || page <= 1} onClick={() => setParams(previous => {
        const next = new URLSearchParams(previous);
        next.set('page', String(page - 1));
        return next;
      })} className="btn min-h-11">Précédent</button><span>{data.totalCount} colis · Page {page} sur {data.totalPages}</span><button type="button" disabled={loading || page >= data.totalPages} onClick={() => setParams(previous => {
        const next = new URLSearchParams(previous);
        next.set('page', String(page + 1));
        return next;
      })} className="btn min-h-11">Suivant</button></nav>
  </div>;
}
