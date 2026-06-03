import { useMemo, useState } from "react";
import { TextPromptDialog } from "../../ui/Dialogs";

function Field({ label, children, optional = false }) {
  return (
    <label className="block space-y-1">
      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label} {optional ? <span className="normal-case text-gray-400">(optionnel)</span> : null}
      </div>
      {children}
    </label>
  );
}

function Alert({ tone = "blue", children }) {
  const tones = {
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    gray: "border-gray-200 bg-gray-50 text-gray-700",
  };

  return <div className={`rounded-lg border p-4 text-sm ${tones[tone]}`}>{children}</div>;
}

function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-gray-100 text-gray-700 border-gray-200",
    amber: "bg-amber-100 text-amber-700 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    blue: "bg-blue-100 text-blue-700 border-blue-200",
    red: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function formatFcfa(value) {
  const n = Number(value || 0);
  const safe = Number.isFinite(n) ? n : 0;
  const display = safe > 0 && safe % 1 !== 0 ? Math.ceil(safe) : Math.round(safe);
  return `${new Intl.NumberFormat("fr-FR").format(display)} FCFA`;
}

const ANOMALY_OPTIONS = [
  { value: "MISSING_ITEM", label: "Article manquant" },
  { value: "PARTIAL_QTY", label: "Quantité partielle" },
  { value: "STOCK_MISMATCH", label: "Écart de stock" },
  { value: "BLOCKED_PARCEL", label: "Colis bloqué" },
];

function ChecklistRow({ item, disabled, onToggle }) {
  const checked = Boolean(item?.checked);
  const line = item?.preorderItem || {};
  return (
    <button
      type="button"
      onClick={() => onToggle(item)}
      disabled={disabled}
      className={`w-full rounded-xl border px-3 py-2 text-left transition ${
        checked
          ? "border-emerald-300 bg-emerald-50"
          : "border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/40"
      } ${disabled ? "cursor-not-allowed opacity-70" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
            checked
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-gray-300 bg-white text-transparent"
          }`}
        >
          ✓
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="truncate font-semibold text-gray-900">
              {line?.qty || 0} × {line?.productNameSnapshot || line?.product?.nom || "Produit"}
            </span>
            <span className="text-xs text-gray-600">
              SKU: <span className="font-medium">{line?.productSkuSnapshot || line?.product?.sku || "—"}</span>
            </span>
            <span className="text-xs text-gray-600">
              Total: <span className="font-medium">{formatFcfa(line?.lineTotalFcfa || 0)}</span>
            </span>
            {item?.checkedAt ? (
              <span className="text-xs text-gray-600">
                Cochée: <span className="font-medium">{formatDate(item?.checkedAt)}</span>
              </span>
            ) : null}
            {checked ? <Badge tone="emerald">Vérifié</Badge> : <Badge tone="amber">À vérifier</Badge>}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function OrderPreparationTab({
  order,
  saving,
  canPrepare,
  packingNote,
  setPackingNote,
  onPrepare,
  onToggleChecklistItem,
  onBulkChecklist,
  onCreateAnomaly,
  onResolveAnomaly,
  onGoToFulfillment,
  stockSummary,
}) {
  const [anomalyKind, setAnomalyKind] = useState("MISSING_ITEM");
  const [anomalyItemId, setAnomalyItemId] = useState("");
  const [anomalyNote, setAnomalyNote] = useState("");
  const [anomalyBlocking, setAnomalyBlocking] = useState(true);
  const [resolveDialog, setResolveDialog] = useState({
    open: false,
    anomalyId: "",
    value: "Anomalie traitée",
  });

  const status = order?.status;
  const stockDebited = Boolean(order?.stockDeductedAt);
  const preparationLaunchedAt = order?.preparationLaunchedAt || null;
  const canBePrepared = status === "PAID" && Boolean(preparationLaunchedAt) && !stockDebited;

  const preparationItems = Array.isArray(order?.preparationItems) ? order.preparationItems : [];
  const unresolvedAnomalies = (Array.isArray(order?.preparationAnomalies) ? order.preparationAnomalies : []).filter(
    (item) => !item.resolvedAt,
  );
  const resolvedAnomalies = (Array.isArray(order?.preparationAnomalies) ? order.preparationAnomalies : []).filter(
    (item) => item.resolvedAt,
  );

  const checkedCount = useMemo(
    () => preparationItems.filter((item) => item.checked).length,
    [preparationItems],
  );
  const totalItems = preparationItems.length;
  const totalUnits = useMemo(
    () =>
      preparationItems.reduce(
        (sum, item) => sum + Number(item?.preorderItem?.qty || 0),
        0,
      ),
    [preparationItems],
  );
  const preparedUnits = useMemo(
    () =>
      preparationItems.reduce(
        (sum, item) => sum + (item.checked ? Number(item?.preorderItem?.qty || 0) : 0),
        0,
      ),
    [preparationItems],
  );
  const progressPercent = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
  const allChecked = totalItems > 0 && checkedCount === totalItems;
  const hasBlockingAnomaly = unresolvedAnomalies.some((item) => item.blocking);

  const handleCreateAnomaly = async () => {
    if (!anomalyNote.trim()) return;
    await onCreateAnomaly?.({
      itemId: anomalyItemId || undefined,
      kind: anomalyKind,
      note: anomalyNote.trim(),
      blocking: anomalyBlocking,
    });
    setAnomalyNote("");
    setAnomalyItemId("");
    setAnomalyKind("MISSING_ITEM");
    setAnomalyBlocking(true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Préparation</h3>
            <p className="mt-1 text-xs text-gray-600">Checklist, anomalies, validation.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="blue">{status || "—"}</Badge>
            <Badge tone={stockDebited ? "emerald" : "gray"}>
              {stockDebited ? "Stock sorti" : "Stock en attente"}
            </Badge>
            {hasBlockingAnomaly ? <Badge tone="red">Blocage</Badge> : null}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 xl:grid-cols-5">
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-2.5">
            <div className="text-xs uppercase tracking-wide text-indigo-700">Checklist</div>
            <div className="mt-1 text-lg font-semibold text-indigo-900">{checkedCount}/{totalItems}</div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
            <div className="text-xs uppercase tracking-wide text-emerald-700">Unités</div>
            <div className="mt-1 text-lg font-semibold text-emerald-900">{preparedUnits}/{totalUnits}</div>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <div className="text-xs uppercase tracking-wide text-amber-700">Anomalies</div>
            <div className="mt-1 text-lg font-semibold text-amber-900">{unresolvedAnomalies.length}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
            <div className="text-xs uppercase tracking-wide text-gray-500">Lancée</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{formatDate(preparationLaunchedAt)}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5">
            <div className="text-xs uppercase tracking-wide text-gray-500">Colis</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">{order?.parcelNumber || "—"}</div>
          </div>
        </div>

        <div className="mt-3 h-2 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
          <div className="h-full bg-indigo-600 transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {!canBePrepared && status !== "READY" ? (
        <Alert tone="gray">
          La préparation n'est disponible que pour une commande payée et explicitement lancée par la caisse.
        </Alert>
      ) : null}

      {status === "READY" ? (
        <Alert tone="emerald">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Cette commande est déjà marquée prête. La checklist reste consultable comme preuve de préparation.
            </div>
            <button
              type="button"
              onClick={() => onGoToFulfillment?.()}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Aller à la clôture
            </button>
          </div>
        </Alert>
      ) : null}

      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="font-semibold text-gray-900">Checklist persistée</h4>
            <p className="mt-1 text-xs text-gray-600">Une ligne par article. Coche tout avant validation.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
              onClick={() => onBulkChecklist?.(true)}
              disabled={!canBePrepared || saving || totalItems === 0}
            >
              Tout cocher
            </button>
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50"
              onClick={() => onBulkChecklist?.(false)}
              disabled={!canBePrepared || saving || totalItems === 0}
            >
              Tout décocher
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {preparationItems.length === 0 ? (
            <Alert tone="amber">Aucune ligne de checklist n'est encore disponible pour cette commande.</Alert>
          ) : (
            preparationItems.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                disabled={!canBePrepared || saving}
                onToggle={(row) => onToggleChecklistItem?.(row.preorderItemId, !row.checked)}
              />
            ))
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900">Anomalies de préparation</h4>
            <p className="mt-1 text-sm text-gray-600">Déclare ici un blocage ou un écart.</p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Type d'anomalie">
              <select
                className="input w-full rounded-lg border-gray-200 text-sm"
                value={anomalyKind}
                onChange={(e) => setAnomalyKind(e.target.value)}
                disabled={saving}
              >
                {ANOMALY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ligne concernée" optional>
              <select
                className="input w-full rounded-lg border-gray-200 text-sm"
                value={anomalyItemId}
                onChange={(e) => setAnomalyItemId(e.target.value)}
                disabled={saving}
              >
                <option value="">Anomalie globale commande</option>
                {preparationItems.map((item) => (
                  <option key={item.id} value={item.preorderItemId}>
                    {(item.preorderItem?.productNameSnapshot || item.preorderItem?.product?.nom || "Produit")} x {item.preorderItem?.qty || 0}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Description">
            <textarea
              className="input min-h-[80px] w-full rounded-lg border-gray-200 text-sm"
              value={anomalyNote}
              onChange={(e) => setAnomalyNote(e.target.value)}
              disabled={saving}
              placeholder="Décris précisément l'écart constaté."
            />
          </Field>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={anomalyBlocking}
              onChange={(e) => setAnomalyBlocking(e.target.checked)}
              disabled={saving}
            />
            Anomalie bloquante
          </label>

          <button
            type="button"
            onClick={handleCreateAnomaly}
            disabled={saving || !anomalyNote.trim()}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enregistrer l'anomalie
          </button>

          <div className="space-y-3">
            {unresolvedAnomalies.length === 0 ? (
              <Alert tone="emerald">Aucune anomalie ouverte.</Alert>
            ) : (
              unresolvedAnomalies.map((anomaly) => (
                <div key={anomaly.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={anomaly.blocking ? "red" : "amber"}>
                      {anomaly.blocking ? "Bloquante" : "Non bloquante"}
                    </Badge>
                    <Badge tone="gray">{anomaly.kind}</Badge>
                    {anomaly.preorderItem ? (
                      <span className="text-sm font-medium text-gray-800">
                        {anomaly.preorderItem.productNameSnapshot || anomaly.preorderItem.product?.nom || "Produit"}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm text-gray-800">{anomaly.note}</div>
                  <div className="mt-2 text-xs text-gray-500">
                    Signalée par {anomaly.createdBy?.fullName || "—"} le {formatDate(anomaly.createdAt)}
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setResolveDialog({
                          open: true,
                          anomalyId: anomaly.id,
                          value: "Anomalie traitée",
                        });
                      }}
                      disabled={saving}
                      className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"
                    >
                      Marquer résolue
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900">Action finale</h4>
            <p className="mt-1 text-sm text-gray-600">
              Le colis ne peut être marqué prêt que si toutes les lignes sont cochées et qu'aucune anomalie bloquante n'est ouverte.
            </p>
          </div>

          <Field label="Note de préparation" optional>
            <textarea
              className="input min-h-[90px] w-full rounded-lg border-gray-200 text-sm"
              value={packingNote}
              onChange={(e) => setPackingNote(e.target.value)}
              disabled={!canPrepare || saving}
              placeholder="Ex: colis contrôlé, emballage renforcé, fragile..."
            />
          </Field>

          {!allChecked && canBePrepared ? (
            <Alert tone="amber">Toutes les lignes doivent être cochées avant validation.</Alert>
          ) : null}
          {hasBlockingAnomaly ? (
            <Alert tone="red">Une ou plusieurs anomalies bloquantes doivent être résolues avant validation.</Alert>
          ) : null}

          <button
            type="button"
            onClick={onPrepare}
            disabled={!canPrepare || saving || !allChecked || hasBlockingAnomaly}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Préparation en cours..." : "Marquer colis prêt"}
          </button>

          {resolvedAnomalies.length > 0 ? (
            <div className="text-xs text-gray-500">
              {resolvedAnomalies.length} anomalie(s) déjà résolue(s).
            </div>
          ) : null}
        </div>
      </div>

      <TextPromptDialog
        open={resolveDialog.open}
        title="Résolution anomalie"
        description="Ajoute une note de résolution avant de clôturer l'anomalie."
        label="Note de résolution"
        initialValue={resolveDialog.value}
        placeholder="Ex: anomalie vérifiée et corrigée"
        cancelLabel="Annuler"
        confirmLabel="Marquer résolue"
        onCancel={() =>
          setResolveDialog((prev) => ({
            ...prev,
            open: false,
          }))
        }
        onConfirm={(value) => {
          const note = String(value || "").trim() || "Anomalie traitée";
          onResolveAnomaly?.(resolveDialog.anomalyId, note);
          setResolveDialog((prev) => ({
            ...prev,
            open: false,
          }));
        }}
      />
    </div>
  );
}
