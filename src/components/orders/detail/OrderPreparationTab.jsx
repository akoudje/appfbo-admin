// src/components/orders/detail/OrderPreparationTab.jsx

import { useEffect, useMemo, useState } from "react";

// ============================================================================
// Sous-composants
// ============================================================================

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      {children}
    </label>
  );
}

function Alert({ tone = "blue", title, children }) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    gray: "border-gray-200 bg-gray-50 text-gray-700",
  };

  const icons = {
    amber: "⚠️",
    red: "❌",
    blue: "ℹ️",
    emerald: "✅",
    gray: "📌",
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone] || tones.blue}`}>
      <div className="flex gap-3">
        <span className="text-lg" role="img" aria-hidden="true">
          {icons[tone] || icons.blue}
        </span>
        <div className="flex-1">
          {title ? (
            <div className="font-semibold text-sm mb-1 flex items-center gap-2">
              {title}
            </div>
          ) : null}
          <div className="text-sm leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm py-1 border-b border-gray-100 last:border-0">
      <div className="text-gray-500">{label}</div>
      <div
        className={`font-medium text-right ${highlight ? "text-indigo-600" : ""}`}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    red: "bg-red-100 text-red-700 border-red-200",
    indigo: "bg-indigo-100 text-indigo-700 border-indigo-200",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        tones[tone] || tones.gray
      }`}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, subvalue, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-50 border-gray-200",
    amber: "bg-amber-50 border-amber-200",
    emerald: "bg-emerald-50 border-emerald-200",
    blue: "bg-blue-50 border-blue-200",
    indigo: "bg-indigo-50 border-indigo-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${tones[tone] || tones.gray}`}>
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-xl font-semibold mt-1">{value}</div>
      {subvalue ? <div className="text-xs text-gray-500 mt-1">{subvalue}</div> : null}
    </div>
  );
}

function ProgressBar({ value = 0 }) {
  const safe = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div className="w-full">
      <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100 border border-gray-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${safe}%` }}
        />
      </div>
    </div>
  );
}

function ProductChecklistItem({
  item,
  checked,
  disabled,
  onToggle,
  formatFcfa,
  safeNum,
}) {
  const qty = Number(item?.qty || 0);
  const lineTotal = Number(item?.lineTotalFcfa || 0);
  const cc = safeNum(item?.lineTotalCc || 0);
  const poids = safeNum(item?.lineTotalPoids || 0);

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`w-full text-left rounded-xl border p-4 transition-all ${
        checked
          ? "border-emerald-300 bg-emerald-50"
          : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="pt-0.5">
          <div
            className={`flex h-5 w-5 items-center justify-center rounded border text-xs font-bold ${
              checked
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-gray-300 bg-white text-transparent"
            }`}
          >
            ✓
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-gray-900">
              {qty} × {item?.productNameSnapshot || item?.product?.nom || item?.nom || "Produit"}
            </span>

            <Badge tone="gray">
              SKU: {item?.productSkuSnapshot || item?.product?.sku || item?.sku || "—"}
            </Badge>

            {checked ? <Badge tone="emerald">Préparé</Badge> : <Badge tone="amber">À préparer</Badge>}
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
            <div>
              <span className="text-gray-500">Montant :</span>{" "}
              <span className="font-medium">{formatFcfa(lineTotal)}</span>
            </div>
            <div>
              <span className="text-gray-500">CC :</span>{" "}
              <span className="font-medium">{cc}</span>
            </div>
            <div>
              <span className="text-gray-500">Poids :</span>{" "}
              <span className="font-medium">{poids} kg</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Composant principal
// ============================================================================

export default function OrderPreparationTab({
  order,
  saving,
  canPrepare,
  packingNote,
  setPackingNote,
  onPrepare,
  stockSummary,
}) {
  const status = order?.status;
  const stockDebited = Boolean(order?.stockDeductedAt);
  const preparationLaunchedAt = order?.preparationLaunchedAt || null;
  const isPaid = status === "PAID";
  const isReady = status === "READY";
  const canBePrepared = isPaid && Boolean(preparationLaunchedAt) && !stockDebited;

  const stockMovements = Array.isArray(order?.stockMovements)
    ? order.stockMovements
    : [];

  const items = Array.isArray(order?.items) ? order.items : [];

  // --------------------------------------------------------------------------
  // Checklist locale
  // --------------------------------------------------------------------------

  const [checkedMap, setCheckedMap] = useState({});

  useEffect(() => {
    const next = {};
    for (const item of items) {
      next[item.id] = false;
    }
    setCheckedMap(next);
  }, [order?.id, items]);

  const checkedCount = useMemo(() => {
    return items.filter((item) => checkedMap[item.id]).length;
  }, [items, checkedMap]);

  const totalItems = items.length;

  const totalUnits = useMemo(() => {
    return items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  }, [items]);

  const preparedUnits = useMemo(() => {
    return items.reduce((sum, item) => {
      return checkedMap[item.id] ? sum + Number(item.qty || 0) : sum;
    }, 0);
  }, [items, checkedMap]);

  const allChecked = totalItems > 0 && checkedCount === totalItems;

  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

  const toggleItem = (itemId) => {
    if (!canBePrepared || saving) return;

    setCheckedMap((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const checkAll = () => {
    if (!canBePrepared || saving) return;

    const next = {};
    for (const item of items) {
      next[item.id] = true;
    }
    setCheckedMap(next);
  };

  const uncheckAll = () => {
    if (!canBePrepared || saving) return;

    const next = {};
    for (const item of items) {
      next[item.id] = false;
    }
    setCheckedMap(next);
  };

  const handlePrepareClick = () => {
    if (!canPrepare || saving) return;
    if (!allChecked) return;
    onPrepare?.();
  };

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleString("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  const formatFcfa = (value) => {
    return `${new Intl.NumberFormat("fr-FR").format(Number(value || 0))} FCFA`;
  };

  const safeNum = (n) => {
    const v = Number(n || 0);
    if (Number.isNaN(v)) return "0";
    return v % 1 === 0 ? String(v) : v.toFixed(3);
  };

  // --------------------------------------------------------------------------
  // Alertes contextuelles
  // --------------------------------------------------------------------------

  const renderAlert = () => {
    if (canBePrepared) {
      return (
        <Alert tone="blue" title="Prêt pour la préparation">
          <p>Le paiement est confirmé. En préparant cette commande :</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Le statut passera à <strong>READY</strong></li>
            <li>Le stock sera décrémenté</li>
            <li>Les mouvements seront enregistrés</li>
            <li>La checklist doit être terminée avant validation</li>
          </ul>
        </Alert>
      );
    }

    if (isReady && stockDebited) {
      return (
        <Alert tone="emerald" title="Commande préparée">
          <p>
            Cette commande a déjà été préparée le{" "}
            <strong>{formatDate(order.stockDeductedAt)}</strong>.
          </p>
          <p className="mt-1">
            Le stock a été décrémenté et les mouvements sont visibles ci-dessous.
          </p>
          {order?.pickupSecretCode ? (
            <p className="mt-2">
              Code secret de retrait : <strong>{order.pickupSecretCode}</strong>
            </p>
          ) : null}
        </Alert>
      );
    }

    if (!isPaid && !isReady) {
      return (
        <Alert tone="gray" title="Préparation non disponible">
          La préparation n'est possible que lorsque la commande est en statut{" "}
          <strong>PAYÉE</strong>. Statut actuel : <Badge tone="gray">{status}</Badge>
        </Alert>
      );
    }

    if (isPaid && !preparationLaunchedAt) {
      return (
        <Alert tone="amber" title="En attente de la caisse">
          La caissière doit d'abord lancer la préparation après confirmation du
          paiement. Tant que cette étape n'est pas faite, le stock ne doit pas
          commencer à préparer le colis.
        </Alert>
      );
    }

    return null;
  };

  // --------------------------------------------------------------------------
  // Rendu
  // --------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* En-tête avec synthèse */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Préparation de commande
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Validation logistique, constitution du colis et mise à jour des stocks.
            </p>
          </div>

          <Badge tone={stockDebited ? "emerald" : "gray"}>
            {stockDebited ? "Stock sorti" : "Stock en attente"}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatCard
            label="Statut"
            value={status || "—"}
            subvalue={
              preparationLaunchedAt
                ? `Lancée le ${formatDate(preparationLaunchedAt)}`
                : stockDebited
                  ? "Stock sorti"
                  : "En attente du lancement caisse"
            }
            tone={isReady ? "emerald" : isPaid ? "blue" : "gray"}
          />

          <StatCard
            label="Progression"
            value={`${checkedCount}/${totalItems}`}
            subvalue={`${progressPercent}% des lignes cochées`}
            tone={allChecked ? "emerald" : "indigo"}
          />

          <StatCard
            label="Unités préparées"
            value={`${preparedUnits}/${totalUnits}`}
            subvalue="Quantités cochées"
            tone={preparedUnits === totalUnits && totalUnits > 0 ? "emerald" : "gray"}
          />

          <StatCard
            label="Date de sortie"
            value={formatDate(order?.stockDeductedAt) || "—"}
            subvalue={stockDebited ? "Stock décrémenté" : "Aucune sortie"}
          />

          <StatCard
            label="Préparateur"
            value={order?.preparedBy || "—"}
            subvalue={order?.preparedBy ? "Préparateur assigné" : "Non assigné"}
          />
        </div>
      </div>

      {/* Alertes contextuelles */}
      {renderAlert()}

      {/* Checklist produits */}
      <div className="card p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">Checklist de préparation</h4>
            <p className="text-sm text-gray-600 mt-1">
              Coche chaque ligne lorsque le produit a bien été prélevé et vérifié.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">{totalItems} ligne{totalItems > 1 ? "s" : ""}</Badge>
            <Badge tone="gray">{totalUnits} unité{totalUnits > 1 ? "s" : ""}</Badge>
            {allChecked ? <Badge tone="emerald">Checklist terminée</Badge> : null}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-medium text-gray-900">
                Progression de préparation
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {checkedCount} / {totalItems} lignes cochées
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={checkAll}
                disabled={!canBePrepared || saving || totalItems === 0}
              >
                Tout cocher
              </button>
              <button
                type="button"
                className="btn"
                onClick={uncheckAll}
                disabled={!canBePrepared || saving || totalItems === 0}
              >
                Tout décocher
              </button>
            </div>
          </div>

          <ProgressBar value={progressPercent} />

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span>
              <strong>{preparedUnits}</strong> / <strong>{totalUnits}</strong> unités
              préparées
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500" />
              Préparation en cours
            </span>
            {allChecked ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
                Tous les produits sont vérifiés
              </span>
            ) : null}
          </div>
        </div>

        {items.length === 0 ? (
          <Alert tone="amber" title="Aucun produit à préparer">
            Cette commande ne contient actuellement aucune ligne produit.
          </Alert>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <ProductChecklistItem
                key={item.id}
                item={item}
                checked={Boolean(checkedMap[item.id])}
                disabled={!canBePrepared || saving}
                onToggle={() => toggleItem(item.id)}
                formatFcfa={formatFcfa}
                safeNum={safeNum}
              />
            ))}
          </div>
        )}
      </div>

      {/* Zone de préparation */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-gray-900">Note de préparation</h4>
          <span className="text-xs text-gray-500">(optionnel)</span>
        </div>

        <Field label="Instructions et détails colis">
          <textarea
            className="input min-h-[120px] w-full rounded-lg border-gray-200 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            value={packingNote}
            onChange={(e) => setPackingNote(e.target.value)}
            placeholder="Ex : 1 carton + 1 sachet, fragile, vérification effectuée, emballage renforcé..."
            disabled={!canPrepare || saving}
          />
        </Field>

        {!allChecked && canBePrepared ? (
          <Alert tone="amber" title="Checklist incomplète">
            Tous les produits doivent être cochés avant de pouvoir marquer le colis
            comme prêt.
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
          <div className="text-xs text-gray-500 flex items-center gap-2">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                canBePrepared ? "bg-indigo-500" : "bg-gray-300"
              }`}
            />
            {canBePrepared
              ? allChecked
                ? "Checklist terminée, prêt à valider la préparation"
                : "Préparation en cours, checklist à terminer"
              : "Action non disponible"}
          </div>

          <button
            className={`btn-primary px-6 py-2.5 rounded-lg font-medium transition-all ${
              !canPrepare || saving || !allChecked
                ? "opacity-50 cursor-not-allowed bg-gray-400"
                : "bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow"
            }`}
            onClick={handlePrepareClick}
            disabled={!canPrepare || saving || !allChecked}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⚪</span>
                Préparation en cours...
              </span>
            ) : (
              "✅ Marquer colis prêt"
            )}
          </button>
        </div>
      </div>

      {/* Synthèse stock */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Synthèse des stocks</h4>
          <Badge tone="blue">Total mouvements : {stockMovements.length}</Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-200">
            <div className="text-sm text-gray-600">Sortie de stock</div>
            <div className="text-xl font-semibold mt-1">
              {formatDate(order?.stockDeductedAt) || "En attente"}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
            <div className="text-sm text-indigo-700">Lignes préparées</div>
            <div className="text-xl font-semibold mt-1 text-indigo-800">
              {checkedCount} / {totalItems}
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <div className="text-sm text-amber-700">Débit total</div>
            <div className="text-xl font-semibold mt-1 text-amber-800">
              {stockSummary?.debitQty || 0}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg p-4 border border-emerald-200">
            <div className="text-sm text-emerald-700">Crédit total</div>
            <div className="text-xl font-semibold mt-1 text-emerald-800">
              {stockSummary?.creditQty || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Mouvements de stock */}
      {stockMovements.length > 0 && (
        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-900">Mouvements de stock</h4>
            <span className="text-xs text-gray-500">
              {stockMovements.length} mouvement{stockMovements.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-3">
            {stockMovements.map((movement) => (
              <div
                key={movement.id}
                className="rounded-lg border border-gray-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge tone={movement.type === "DEBIT" ? "amber" : "emerald"}>
                        {movement.type === "DEBIT" ? "⬇️ Débit" : "⬆️ Crédit"}
                      </Badge>

                      <span className="font-medium text-gray-900">
                        {movement.product?.sku || "—"}
                      </span>

                      <span className="text-sm text-gray-600">
                        {movement.product?.nom || "Produit inconnu"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Quantité :</span>{" "}
                        <span className="font-medium">{movement.qty}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Raison :</span>{" "}
                        <span className="font-medium">{movement.reason}</span>
                      </div>
                    </div>

                    {movement.note ? (
                      <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        📝 {movement.note}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-gray-400 whitespace-nowrap">
                    {formatDate(movement.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
