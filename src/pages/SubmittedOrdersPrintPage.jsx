import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ordersService } from "../services/ordersService";

function buildQueryParams(searchParams) {
  const keys = ["q", "dateFrom", "dateTo", "sort", "dir", "preorderNumbers", "paymentStatus", "billingWorkStatus", "billingPriority", "as400Reference", "as400Amount", "assignedOnly", "assignedToMe", "invoicerId", "lateWaveReview"];
  return Object.fromEntries(keys.filter(key => searchParams.has(key)).map(key => [key, searchParams.get(key)]));
}

function formatSubmittedAt(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// rank : position FIFO (1 = première soumise, donc première à traiter). Absent pour
// une sélection par numéros, qui garde l'ordre de la liste collée.
function ExportOrderCard({ order, rank = null }) {
  return (
    <article className="break-inside-avoid pb-3 mb-3">
      <div className="flex items-baseline justify-between gap-2 text-[10px] mb-1">
        {rank != null ? <span className="font-bold">N° {rank}</span> : null}
        <span className="text-gray-600">
          {order.preorderNumber}
          {order.submittedAt ? ` · soumise ${formatSubmittedAt(order.submittedAt)}` : ""}
        </span>
      </div>
      <div className="text-[12.5px] font-bold uppercase leading-tight mb-1.5">
        {order.fboNomComplet || "-"}
      </div>
      <div className="flex gap-1.5 text-[11px] mb-2 font-medium">
        <span>FBO</span>
        <strong>{order.fboNumero || "-"}</strong>
      </div>

      <div className="min-h-[10mm] mb-2">
        {(order.items || []).length ? (
          <div className="flex flex-col gap-1">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-baseline justify-between gap-1.5 text-[10px] leading-[1.35] border-b border-gray-300 pb-1"
              >
                <span className="whitespace-nowrap">x{Number(item.qty || 0)}</span>
                <span className="flex-1 font-semibold break-words">
                  {item.sku || "Article"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[10px] leading-[1.35]">Aucun article</div>
        )}
      </div>

      <div className="border border-gray-300 min-h-[15mm] px-2.5 py-2">
        <div className="text-[9.5px] min-h-[5mm] flex items-center font-medium">Réf AS400 :</div>
        <div className="text-[9.5px] min-h-[5mm] flex items-center font-medium">Montant AS400 :</div>
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
  const isCustomSelection = Boolean(requestParams.preorderNumbers);

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
        @page {
          size: A4 landscape;
          margin: 8mm 8mm 10mm;
          @bottom-right { content: "Page " counter(page) " / " counter(pages); font-size: 9px; }
          ${isCustomSelection ? "" : '@bottom-left { content: "Ordre FIFO : de la plus ancienne soumission à la plus récente"; font-size: 9px; }'}
        }
        @media print {
          body { background: #fff; }
          .print-toolbar { display: none !important; }
          .print-sheet { padding: 0 !important; }
        }
      `}</style>

      <div className="print-toolbar sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {isCustomSelection
            ? "Export d'une sélection de commandes"
            : "Export des commandes soumises"}
          {!loading && !error && orders.length > 0
            ? ` · ${orders.length} commande${orders.length > 1 ? "s" : ""}, ${
                isCustomSelection
                  ? "dans l'ordre de la liste"
                  : "de la plus ancienne soumission à la plus récente"
              }`
            : ""}
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
            {isCustomSelection
              ? "Aucune commande trouvée pour les numéros saisis."
              : "Aucune commande soumise à exporter."}
          </div>
        ) : (
          <section
            className="gap-[7mm]"
            style={{ columnCount: 4, columnGap: "7mm", columnFill: "auto" }}
          >
            {orders.map((order, index) => (
              <ExportOrderCard
                key={order.id}
                order={order}
                rank={isCustomSelection ? null : index + 1}
              />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
