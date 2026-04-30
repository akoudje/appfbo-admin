import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ordersService } from "../services/ordersService";

function buildQueryParams(searchParams) {
  const params = {};
  const q = searchParams.get("q");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const sort = searchParams.get("sort");
  const dir = searchParams.get("dir");

  if (q) params.q = q;
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  if (sort) params.sort = sort;
  if (dir) params.dir = dir;

  return params;
}

function ExportOrderCard({ order }) {
  return (
    <article className="break-inside-avoid border-b border-gray-900 pb-4 mb-4">
      <div className="text-[11px] font-bold uppercase leading-tight mb-1.5">
        {order.fboNomComplet || "-"}
      </div>
      <div className="flex gap-1 text-[10px] mb-2">
        <span>FBO</span>
        <strong>{order.fboNumero || "-"}</strong>
      </div>

      <div className="min-h-[26mm] mb-2">
        {(order.items || []).length ? (
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-baseline justify-between gap-1.5 text-[9.5px] leading-[1.35] border-b border-gray-300 pb-1"
              >
                <span className="flex-1 font-semibold break-words">
                  {item.sku || "Article"}
                </span>
                <span className="whitespace-nowrap">x{Number(item.qty || 0)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[8.5px] leading-[1.35]">Aucun article</div>
        )}
      </div>

      <div className="border border-gray-300 min-h-[18mm] p-2">
        <div className="text-[8.5px] min-h-[6mm] flex items-center">Réf AS400 :</div>
        <div className="text-[8.5px] min-h-[6mm] flex items-center">Montant AS400 :</div>
      </div>
    </article>
  );
}

export default function SubmittedOrdersPrintPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const hasPrintedRef = useRef(false);

  const requestParams = useMemo(
    () => buildQueryParams(searchParams),
    [searchParams],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await ordersService.getSubmittedExport(requestParams);
        if (!active) return;
        setOrders(Array.isArray(result?.data) ? result.data : []);
      } catch (fetchError) {
        if (!active) return;
        console.error("submitted export print page error:", fetchError);
        setError(
          fetchError?.response?.data?.message ||
            fetchError?.message ||
            "Impossible de charger les commandes soumises.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [requestParams]);

  useEffect(() => {
    if (loading || error || hasPrintedRef.current || orders.length === 0) return;
    hasPrintedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [loading, error, orders]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <style>{`
        @page { size: A4 landscape; margin: 8mm; }
        @media print {
          body { background: #fff; }
          .print-toolbar { display: none !important; }
          .print-sheet { padding: 0 !important; }
        }
      `}</style>

      <div className="print-toolbar sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Export des commandes soumises
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            Imprimer
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700"
          >
            Fermer
          </button>
        </div>
      </div>

      <main className="print-sheet p-[8mm]">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Préparation de l'export…</div>
        ) : error ? (
          <div className="py-12 text-center text-red-600">{error}</div>
        ) : orders.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            Aucune commande soumise à exporter.
          </div>
        ) : (
          <section
            className="gap-[8mm]"
            style={{ columnCount: 4, columnGap: "8mm", columnFill: "auto" }}
          >
            {orders.map((order) => (
              <ExportOrderCard key={order.id} order={order} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
