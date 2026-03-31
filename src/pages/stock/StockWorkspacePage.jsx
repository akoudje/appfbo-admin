import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatFcfa } from "../../lib/format";
import useAdminAuth from "../../hooks/useAdminAuth";
import { Permission, hasPermission } from "../../auth/permissions";
import { list as listProducts } from "../../services/productsService";
import { stockService } from "../../services/stockService";
import PreparationQueuePage from "../preparation/PreparationQueuePage";

const CATEGORIES = [
  { value: "", label: "Toutes catégories" },
  { value: "NON_CLASSE", label: "Accessoires" },
  { value: "BUVABLE", label: "Buvable" },
  { value: "COMBO_PACKS", label: "Combo Packs" },
  { value: "GESTION_DE_POIDS", label: "Gestion de poids" },
  { value: "NUTRITION", label: "Nutrition" },
  { value: "PRODUIT_DE_LA_RUCHE", label: "Produit de la ruche" },
  { value: "SOINS_DE_LA_PEAU", label: "Soins de la peau" },
  { value: "SOINS_PERSONNELS", label: "Soins personnels" },
];

const TABS = [
  { key: "dashboard", label: "Vue stock" },
  { key: "inventory", label: "Inventaire" },
  { key: "movements", label: "Mouvements" },
  { key: "preparation", label: "Préparation" },
];

const reasonLabel = {
  MANUAL_ADJUSTMENT: "Ajustement manuel",
  PREPARE_ORDER: "Préparation commande",
  CANCEL_ORDER: "Annulation commande",
};

function categoryLabel(value) {
  return CATEGORIES.find((item) => item.value === value)?.label || value || "—";
}

function dateLabel(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Card({ label, value, helper }) {
  return (
    <div className="border border-[#eadfb9] bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7a6541]">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-[#000000]">{value}</div>
      {helper ? <div className="mt-1 text-xs text-[#6f6a60]">{helper}</div> : null}
    </div>
  );
}

function AdjustModal({ product, busy, error, onClose, onSave }) {
  const [target, setTarget] = useState(product?.stockQty ?? 0);
  const [note, setNote] = useState("");

  useEffect(() => {
    setTarget(product?.stockQty ?? 0);
    setNote("");
  }, [product]);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md border border-[#eadfb9] bg-white p-5 shadow-[0_24px_60px_rgba(0,0,0,0.2)]">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#7a6541]">Ajustement de stock</div>
        <div className="mt-1 text-lg font-semibold text-[#000000]">{product.nom}</div>
        <div className="text-sm text-[#6f6a60]">{product.sku}</div>
        <div className="mt-4 text-sm text-[#5D4B3C]">Stock actuel : <strong>{product.stockQty}</strong></div>
        <input
          type="number"
          min="0"
          value={target}
          onChange={(e) => setTarget(Math.max(0, Number(e.target.value || 0)))}
          className="mt-2 w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]"
        />
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note de mouvement"
          className="mt-3 w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]"
        />
        {error ? <div className="mt-3 border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="border border-[#d6c8aa] bg-white px-4 py-2 text-sm font-medium text-[#5D4B3C]">Fermer</button>
          <button type="button" onClick={() => onSave({ targetStockQty: target, note })} disabled={busy} className="bg-[#FFC600] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
            {busy ? "Enregistrement..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StockWorkspacePage() {
  const navigate = useNavigate();
  const { role, permissions } = useAdminAuth();
  const canWrite = hasPermission(role, Permission.PRODUCT_WRITE, permissions);
  const canPrepare = hasPermission(role, Permission.PREPARATION_UPDATE, permissions);
  const tabs = useMemo(() => TABS.filter((tab) => (tab.key === "preparation" ? canPrepare : true)), [canPrepare]);

  const [tab, setTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [movementMeta, setMovementMeta] = useState({ page: 1, totalPages: 1, total: 0, pageSize: 30 });
  const [inventoryFilters, setInventoryFilters] = useState({ q: "", category: "", stock: "" });
  const [movementFilters, setMovementFilters] = useState({ q: "", type: "", reason: "", days: 30 });
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [adjusting, setAdjusting] = useState(null);
  const [adjustBusy, setAdjustBusy] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  async function loadDashboard() {
    setDashboard(await stockService.getDashboard());
  }

  async function loadInventory() {
    const data = await listProducts({
      take: 500,
      q: inventoryFilters.q || undefined,
      category: inventoryFilters.category || undefined,
      inStock: inventoryFilters.stock === "in" ? "true" : inventoryFilters.stock === "out" ? "false" : undefined,
    });
    setInventory(Array.isArray(data) ? data : []);
  }

  async function loadMovements(page = 1) {
    const data = await stockService.listMovements({
      page,
      pageSize: movementMeta.pageSize,
      q: movementFilters.q || undefined,
      type: movementFilters.type || undefined,
      reason: movementFilters.reason || undefined,
      days: movementFilters.days,
    });
    setMovements(Array.isArray(data?.data) ? data.data : []);
    setMovementMeta(data?.pagination || { page: 1, totalPages: 1, total: 0, pageSize: 30 });
  }

  async function loadAll() {
    try {
      setError("");
      await Promise.all([loadDashboard(), loadInventory(), loadMovements(1)]);
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger l’espace stock");
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (tab === "inventory") loadInventory().catch((e) => setError(e?.response?.data?.message || "Impossible de charger l’inventaire"));
  }, [tab, inventoryFilters]);

  useEffect(() => {
    if (tab === "movements") loadMovements(1).catch((e) => setError(e?.response?.data?.message || "Impossible de charger les mouvements"));
  }, [tab, movementFilters]);

  async function saveAdjustment(payload) {
    if (!adjusting) return;
    try {
      setAdjustBusy(true);
      setAdjustError("");
      await stockService.adjustStock({ productId: adjusting.id, ...payload });
      setAdjusting(null);
      setFlash("Stock mis à jour avec succès.");
      await Promise.all([loadDashboard(), loadInventory(), loadMovements(1)]);
    } catch (e) {
      setAdjustError(e?.response?.data?.message || "Impossible d’ajuster le stock");
    } finally {
      setAdjustBusy(false);
    }
  }

  const summary = dashboard?.summary || {};

  return (
    <div className="space-y-5">
      <div className="border border-[#eadfb9] bg-white px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7a6541]">Stock</div>
            <h1 className="mt-1 text-2xl font-semibold text-[#000000]">Espace gestionnaire de stock</h1>
            <p className="mt-1 text-sm text-[#6f6a60]">Pilotage des niveaux, ajustements manuels, journal des mouvements et préparation.</p>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={loadAll} className="border border-[#d6c8aa] bg-white px-4 py-2 text-sm font-medium text-[#5D4B3C]">Rafraîchir</button>
            {canWrite ? (
              <button type="button" onClick={() => navigate("/products/new")} className="bg-[#FFC600] px-4 py-2 text-sm font-semibold text-black">Nouveau produit</button>
            ) : null}
          </div>
        </div>
      </div>

      {error ? <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {flash ? <div className="border border-[#d8cfab] bg-[#fff7df] px-4 py-3 text-sm text-[#5D4B3C]">{flash}</div> : null}

      <div className="flex flex-wrap gap-2 border-b border-[#eadfb9] pb-2">
        {tabs.map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)} className={tab === item.key ? "bg-[#FFC600] px-4 py-2 text-sm font-medium text-black" : "border border-[#eadfb9] bg-white px-4 py-2 text-sm font-medium text-[#5D4B3C]"}>
            {item.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" ? (
        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card label="Produits suivis" value={summary.totalProducts || 0} helper={`${summary.unitsInStock || 0} unités en stock`} />
            <Card label="Ruptures" value={summary.outOfStockCount || 0} helper={`${summary.lowStockCount || 0} stocks faibles`} />
            <Card label="À préparer" value={summary.toPrepareCount || 0} helper={`${summary.readyCount || 0} colis prêts`} />
            <Card label="Anomalies ouvertes" value={summary.openAnomaliesCount || 0} helper="Préparation bloquée ou incomplète" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
            <div className="border border-[#eadfb9] bg-white">
              <div className="border-b border-[#f0ebe1] px-4 py-3 text-sm font-semibold text-[#000000]">Produits à surveiller</div>
              <table className="min-w-full">
                <thead className="bg-[#fcfbf7] text-left text-xs uppercase tracking-[0.14em] text-[#7a6541]">
                  <tr><th className="px-4 py-3">Produit</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3 text-right">Action</th></tr>
                </thead>
                <tbody>
                  {(dashboard?.criticalProducts || []).map((product) => (
                    <tr key={product.id} className="border-t border-[#f0ebe1] text-sm">
                      <td className="px-4 py-3"><div className="font-medium text-[#000000]">{product.nom}</div><div className="text-xs text-[#6f6a60]">{product.sku}</div></td>
                      <td className="px-4 py-3 text-[#5D4B3C]">{product.stockQty}</td>
                      <td className="px-4 py-3 text-right">{canWrite ? <button type="button" onClick={() => { setAdjustError(""); setAdjusting(product); }} className="border border-[#d6c8aa] bg-white px-3 py-1.5 text-xs font-medium text-[#5D4B3C]">Ajuster</button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border border-[#eadfb9] bg-white">
              <div className="border-b border-[#f0ebe1] px-4 py-3 text-sm font-semibold text-[#000000]">Derniers mouvements</div>
              <div className="divide-y divide-[#f0ebe1]">
                {(dashboard?.recentMovements || []).map((movement) => (
                  <div key={movement.id} className="px-4 py-3 text-sm">
                    <div className="font-medium text-[#000000]">{movement.product?.nom || "Produit"}</div>
                    <div className="mt-1 text-xs text-[#6f6a60]">{reasonLabel[movement.reason] || movement.reason} • {dateLabel(movement.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "inventory" ? (
        <div className="space-y-4">
          <div className="grid gap-3 border border-[#eadfb9] bg-white p-4 lg:grid-cols-[1.3fr_220px_220px]">
            <input value={inventoryFilters.q} onChange={(e) => setInventoryFilters((v) => ({ ...v, q: e.target.value }))} placeholder="Produit ou SKU" className="w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]" />
            <select value={inventoryFilters.category} onChange={(e) => setInventoryFilters((v) => ({ ...v, category: e.target.value }))} className="w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]">{CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select value={inventoryFilters.stock} onChange={(e) => setInventoryFilters((v) => ({ ...v, stock: e.target.value }))} className="w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]"><option value="">Tous niveaux</option><option value="in">En stock</option><option value="out">Rupture</option></select>
          </div>
          <div className="overflow-x-auto border border-[#eadfb9] bg-white">
            <table className="min-w-full">
              <thead className="bg-[#fcfbf7] text-left text-xs uppercase tracking-[0.14em] text-[#7a6541]">
                <tr><th className="px-4 py-3">Produit</th><th className="px-4 py-3">Catégorie</th><th className="px-4 py-3">Stock</th><th className="px-4 py-3">Prix</th><th className="px-4 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {inventory.map((product) => (
                  <tr key={product.id} className="border-t border-[#f0ebe1] text-sm">
                    <td className="px-4 py-3"><div className="font-medium text-[#000000]">{product.nom}</div><div className="text-xs text-[#6f6a60]">{product.sku}</div></td>
                    <td className="px-4 py-3 text-[#5D4B3C]">{categoryLabel(product.category)}</td>
                    <td className="px-4 py-3 text-[#5D4B3C]">{product.stockQty}</td>
                    <td className="px-4 py-3 text-[#5D4B3C]">{formatFcfa(Number(product.prixBaseFcfa || 0))}</td>
                    <td className="px-4 py-3"><div className="flex justify-end gap-2">{canWrite ? <button type="button" onClick={() => { setAdjustError(""); setAdjusting(product); }} className="border border-[#d6c8aa] bg-white px-3 py-1.5 text-xs font-medium text-[#5D4B3C]">Ajuster stock</button> : null}{canWrite ? <button type="button" onClick={() => navigate(`/products/${product.id}/edit`)} className="bg-[#FFC600] px-3 py-1.5 text-xs font-semibold text-black">Modifier</button> : null}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {tab === "movements" ? (
        <div className="space-y-4">
          <div className="grid gap-3 border border-[#eadfb9] bg-white p-4 lg:grid-cols-[1.2fr_180px_220px_160px]">
            <input value={movementFilters.q} onChange={(e) => setMovementFilters((v) => ({ ...v, q: e.target.value }))} placeholder="Produit, SKU ou référence" className="w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]" />
            <select value={movementFilters.type} onChange={(e) => setMovementFilters((v) => ({ ...v, type: e.target.value }))} className="w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]"><option value="">Tous types</option><option value="CREDIT">Entrées</option><option value="DEBIT">Sorties</option></select>
            <select value={movementFilters.reason} onChange={(e) => setMovementFilters((v) => ({ ...v, reason: e.target.value }))} className="w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]"><option value="">Tous motifs</option><option value="MANUAL_ADJUSTMENT">Ajustement manuel</option><option value="PREPARE_ORDER">Préparation commande</option><option value="CANCEL_ORDER">Annulation commande</option></select>
            <select value={movementFilters.days} onChange={(e) => setMovementFilters((v) => ({ ...v, days: Number(e.target.value || 30) }))} className="w-full border border-[#d6c8aa] bg-white px-3 py-2 text-sm outline-none focus:border-[#FFC600]"><option value={7}>7 jours</option><option value={30}>30 jours</option><option value={90}>90 jours</option><option value={180}>180 jours</option></select>
          </div>
          <div className="overflow-x-auto border border-[#eadfb9] bg-white">
            <table className="min-w-full">
              <thead className="bg-[#fcfbf7] text-left text-xs uppercase tracking-[0.14em] text-[#7a6541]">
                <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Produit</th><th className="px-4 py-3">Motif</th><th className="px-4 py-3">Qté</th><th className="px-4 py-3">Opérateur</th></tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id} className="border-t border-[#f0ebe1] text-sm">
                    <td className="px-4 py-3 text-[#5D4B3C]">{dateLabel(movement.createdAt)}</td>
                    <td className="px-4 py-3"><div className="font-medium text-[#000000]">{movement.product?.nom || "Produit"}</div><div className="text-xs text-[#6f6a60]">{movement.product?.sku || "—"}</div></td>
                    <td className="px-4 py-3 text-[#5D4B3C]">{reasonLabel[movement.reason] || movement.reason}</td>
                    <td className="px-4 py-3 text-[#5D4B3C]">{movement.qty}</td>
                    <td className="px-4 py-3 text-[#5D4B3C]">{movement.createdByAdmin?.fullName || movement.createdByAdmin?.email || "Système"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-[#6f6a60]">
            <div>{movementMeta.total || 0} mouvement{(movementMeta.total || 0) > 1 ? "s" : ""}</div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={movementMeta.page <= 1} onClick={() => loadMovements(movementMeta.page - 1)} className="border border-[#d6c8aa] bg-white px-3 py-1.5 disabled:opacity-50">Précédent</button>
              <span>Page {movementMeta.page} / {movementMeta.totalPages}</span>
              <button type="button" disabled={movementMeta.page >= movementMeta.totalPages} onClick={() => loadMovements(movementMeta.page + 1)} className="border border-[#d6c8aa] bg-white px-3 py-1.5 disabled:opacity-50">Suivant</button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "preparation" ? <PreparationQueuePage /> : null}

      <AdjustModal product={adjusting} busy={adjustBusy} error={adjustError} onClose={() => { if (adjustBusy) return; setAdjustError(""); setAdjusting(null); }} onSave={saveAdjustment} />
    </div>
  );
}
