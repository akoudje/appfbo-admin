// src/components/orders/detail/OrderItemsTable.jsx


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

export default function OrderItemsTable({ items, totalFcfa }) {
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
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-3" colSpan={6}>
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
