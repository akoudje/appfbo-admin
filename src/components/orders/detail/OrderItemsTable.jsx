// src/components/orders/detail/OrderItemsTable.jsx

import { useEffect, useMemo, useState } from "react";

import { formatFcfa } from "../../../lib/format";

function getItemSku(it) {
  return it?.productSkuSnapshot || it?.product?.sku || "—";
}

function getItemName(it) {
  return it?.productNameSnapshot || it?.product?.nom || "Produit";
}

function getDiscountPercent(it) {
  if (it?.discountPercent !== undefined && it?.discountPercent !== null) {
    const n = Number(it.discountPercent);
    return Number.isFinite(n) ? n : 0;
  }

  const catalogue = Number(it?.prixCatalogueFcfa);
  const net = Number(it?.prixUnitaireFcfa);

  if (!catalogue || !net) return 0;

  const pct = (1 - net / catalogue) * 100;

  if (!Number.isFinite(pct)) return 0;

  return Math.max(0, pct);
}

function formatPercent(value) {
  return `${value.toFixed(2).replace(".", ",")} %`;
}

export default function OrderItemsTable({
  items,
  totalFcfa,
  canReplace = false,
  replacementProducts = [],
  replacingItemId = "",
  saving = false,
  onReplaceItem = null,
}) {
  const [replaceByItemId, setReplaceByItemId] = useState({});

  const replacementMap = useMemo(() => {
    const map = new Map();
    for (const p of replacementProducts || []) {
      if (!p?.id) continue;
      map.set(p.id, p);
    }
    return map;
  }, [replacementProducts]);

  useEffect(() => {
    setReplaceByItemId({});
  }, [items, replacementProducts]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="font-semibold">Items</div>
        <div className="text-sm text-gray-500">{items?.length || 0} ligne(s)</div>
      </div>

      <div className="overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr className="text-left">
              <th className="p-3">SKU</th>
              <th className="p-3">Produit</th>
              <th className="p-3">Qty</th>
              <th className="p-3">Remise</th>
              <th className="p-3">PU</th>
              <th className="p-3">Total</th>
              {canReplace ? <th className="p-3 text-right">Action</th> : null}
            </tr>
          </thead>

          <tbody>
            {items?.length ? (
              items.map((it) => {
                const discountPercent = getDiscountPercent(it);
                const hasDiscount = discountPercent > 0;

                return (
                  <tr key={it.id} className="border-t">
                    <td className="p-3 font-mono whitespace-nowrap">
                      {getItemSku(it)}
                    </td>

                    <td className="p-3">{getItemName(it)}</td>

                    <td className="p-3 whitespace-nowrap">{it.qty}</td>

                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={
                          hasDiscount
                            ? "inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-700"
                            : "text-gray-500"
                        }
                      >
                        {formatPercent(discountPercent)}
                      </span>
                    </td>

                    <td className="p-3 whitespace-nowrap">
                      {formatFcfa(it.prixUnitaireFcfa || 0)}
                    </td>

                    <td className="p-3 font-semibold whitespace-nowrap">
                      {formatFcfa(it.lineTotalFcfa || 0)}
                    </td>

                    {canReplace ? (
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-2">
                          <select
                            value={replaceByItemId[it.id] || ""}
                            onChange={(e) =>
                              setReplaceByItemId((prev) => ({
                                ...prev,
                                [it.id]: e.target.value,
                              }))
                            }
                            disabled={saving || replacingItemId === it.id}
                            className="w-[210px] rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-[#f0cf57] focus:outline-none focus:ring-2 focus:ring-[#FFC600]/35 disabled:opacity-60"
                          >
                            <option value="">Choisir remplacement</option>
                            {(replacementProducts || [])
                              .filter((p) => p?.id && p.id !== it.productId)
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {(p.sku || "—") + " - " + (p.nom || "Produit")}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            disabled={
                              saving ||
                              replacingItemId === it.id ||
                              !replaceByItemId[it.id] ||
                              !replacementMap.has(replaceByItemId[it.id])
                            }
                            onClick={() =>
                              onReplaceItem?.(it.id, replaceByItemId[it.id])
                            }
                            className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {replacingItemId === it.id ? "..." : "Remplacer"}
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-3" colSpan={canReplace ? 7 : 6}>
                  Aucun item
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t flex justify-end text-sm">
        <span className="text-gray-600 mr-2">Total :</span>
        <span className="font-semibold">{formatFcfa(totalFcfa || 0)}</span>
      </div>
    </div>
  );
}
