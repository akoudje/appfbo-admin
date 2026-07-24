import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { cashierService } from "../services/cashierService";
import { RECEIPT_STYLE_CSS, buildReceiptBodyHtml } from "../utils/cashierReceipt";

export default function CashierReceiptsPrintPage() {
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await cashierService.getPaidToday(idsParam ? { ids: idsParam } : {});
        if (!active) return;
        setRows(Array.isArray(result?.rows) ? result.rows : []);
      } catch (fetchError) {
        if (!active) return;
        setError(
          fetchError?.response?.data?.message ||
            fetchError?.message ||
            "Impossible de charger les commandes payées du jour.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [idsParam]);

  useEffect(() => {
    if (loading || error || hasPrintedRef.current || rows.length === 0) return;
    hasPrintedRef.current = true;
    const timer = window.setTimeout(() => {
      window.print();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [loading, error, rows]);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <style>{`
        @page { size: 80mm auto; margin: 5mm; }
        ${RECEIPT_STYLE_CSS}
        @media print {
          .print-toolbar { display: none !important; }
        }
      `}</style>

      <div className="print-toolbar sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {idsParam ? "Impression de la sélection" : "Impression groupée des reçus payés du jour"}{" "}
          {rows.length ? `(${rows.length})` : ""}
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

      <main className="p-[8mm]">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Préparation des reçus…</div>
        ) : error ? (
          <div className="py-12 text-center text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            {idsParam ? "Aucune commande sélectionnée introuvable." : "Aucune commande payée aujourd'hui."}
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.id} dangerouslySetInnerHTML={{ __html: buildReceiptBodyHtml(row) }} />
          ))
        )}
      </main>
    </div>
  );
}
