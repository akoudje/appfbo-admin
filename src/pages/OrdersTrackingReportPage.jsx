// src/pages/OrdersTrackingReportPage.jsx
// Tableau de suivi d'une liste de précommandes collée par l'utilisateur :
// client, n° FBO, référence et montant AS400, statut. Respecte l'ordre de la
// liste, signale doublons et numéros introuvables, totalise par statut.

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ordersService } from "../services/ordersService";

const STATUS_LABELS = {
  DRAFT: "Brouillon",
  SUBMITTED: "Soumise",
  INVOICED: "Préfacturée",
  PAYMENT_PENDING: "Paiement en attente",
  PAID: "Payée",
  READY: "Prête",
  FULFILLED: "Remise",
  CANCELLED: "Annulée",
};

// Commande facturée : le montant AS400 fait foi ; avant facturation, montant indicatif.
const hasAs400Amount = (order) => order?.as400InvoiceTotalFcfa != null && Boolean(order?.factureReference);

function formatFcfa(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  // Espace fine insécable de fr-FR -> espace simple (lisible partout, y compris à l'impression).
  return Number(value).toLocaleString("fr-FR").replace(/[\u202f\u00a0]/g, " ");
}

function parseNumbers(raw) {
  return String(raw || "")
    .split(/[\s,;]+/)
    .map((n) => n.trim().toUpperCase())
    .filter(Boolean);
}

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function OrdersTrackingReportPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);

  const requestedNumbers = useMemo(
    () => parseNumbers(searchParams.get("preorderNumbers")),
    [searchParams],
  );

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const uniqueNumbers = Array.from(new Set(requestedNumbers));
        const result = await ordersService.getSubmittedExport({
          preorderNumbers: uniqueNumbers.join(","),
        });
        if (!active) return;
        setOrders(Array.isArray(result?.data) ? result.data : []);
      } catch (fetchError) {
        if (!active) return;
        setError(
          fetchError?.response?.data?.message ||
            fetchError?.message ||
            "Impossible de charger les commandes.",
        );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [requestedNumbers]);

  // Une ligne par numéro saisi, dans l'ordre de la liste.
  const rows = useMemo(() => {
    const byNumber = new Map(orders.map((o) => [String(o.preorderNumber).toUpperCase(), o]));
    const seen = new Set();
    return requestedNumbers.map((number) => {
      const duplicate = seen.has(number);
      seen.add(number);
      return { number, order: byNumber.get(number) || null, duplicate };
    });
  }, [orders, requestedNumbers]);

  const summary = useMemo(() => {
    const byStatus = new Map();
    let total = 0;
    let count = 0;
    for (const { order, duplicate } of rows) {
      if (!order || duplicate) continue;
      const amount = hasAs400Amount(order) ? order.as400InvoiceTotalFcfa : order.indicativeTotalFcfa;
      const label = STATUS_LABELS[order.status] || order.status;
      const entry = byStatus.get(label) || { count: 0, amount: 0 };
      entry.count += 1;
      entry.amount += Number(amount || 0);
      byStatus.set(label, entry);
      if (order.status !== "CANCELLED") {
        total += Number(amount || 0);
        count += 1;
      }
    }
    return {
      byStatus: Array.from(byStatus.entries()),
      total,
      count,
      notFound: rows.filter((r) => !r.order && !r.duplicate).length,
      duplicates: rows.filter((r) => r.duplicate).length,
    };
  }, [rows]);

  const downloadCsv = () => {
    const header = ["N° précommande", "Client", "N° FBO", "Réf AS400", "Montant AS400 (FCFA)", "Montant indicatif (FCFA)", "Statut", "Remarque"];
    const lines = rows.map(({ number, order, duplicate }) => {
      if (duplicate) return [number, "", "", "", "", "", "", "Doublon dans la liste"];
      if (!order) return [number, "", "", "", "", "", "", "Introuvable"];
      return [
        number,
        order.fboNomComplet,
        order.fboNumero,
        order.factureReference,
        hasAs400Amount(order) ? order.as400InvoiceTotalFcfa : "",
        hasAs400Amount(order) ? "" : order.indicativeTotalFcfa,
        STATUS_LABELS[order.status] || order.status,
        order.status === "CANCELLED" ? order.cancelReason : "",
      ];
    });
    const csv = "﻿" + [header, ...lines].map((line) => line.map(csvCell).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `suivi-commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print {
          body { background: #fff; }
          .print-toolbar { display: none !important; }
          .print-sheet { padding: 0 !important; }
        }
      `}</style>

      <div className="print-toolbar sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-600">
          Tableau de suivi · {requestedNumbers.length} numéro{requestedNumbers.length > 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={downloadCsv}
            disabled={loading || Boolean(error) || rows.length === 0}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            Télécharger (Excel/CSV)
          </button>
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

      <main className="print-sheet p-4 md:p-[10mm]">
        {loading ? (
          <div className="py-12 text-center text-gray-500">Chargement des commandes…</div>
        ) : error ? (
          <div className="py-12 text-center text-red-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center text-gray-500">Aucun numéro de commande fourni.</div>
        ) : (
          <>
            <h1 className="text-lg font-bold mb-1">Suivi des précommandes</h1>
            <p className="text-xs text-gray-500 mb-4">
              Édité le {new Date().toLocaleString("fr-FR")}. Montant AS400 pour les commandes facturées,
              montant indicatif (en italique) pour celles qui ne le sont pas encore.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="border border-gray-300 px-2 py-1.5">N° précommande</th>
                    <th className="border border-gray-300 px-2 py-1.5">Client</th>
                    <th className="border border-gray-300 px-2 py-1.5">N° FBO</th>
                    <th className="border border-gray-300 px-2 py-1.5">Réf AS400</th>
                    <th className="border border-gray-300 px-2 py-1.5 text-right">Montant (FCFA)</th>
                    <th className="border border-gray-300 px-2 py-1.5">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ number, order, duplicate }, index) => (
                    <tr key={`${number}-${index}`} className={!order || duplicate ? "bg-amber-50" : ""}>
                      <td className="border border-gray-300 px-2 py-1 font-mono whitespace-nowrap">{number}</td>
                      {duplicate ? (
                        <td colSpan={5} className="border border-gray-300 px-2 py-1 text-amber-800">
                          Doublon dans la liste (non compté)
                        </td>
                      ) : !order ? (
                        <td colSpan={5} className="border border-gray-300 px-2 py-1 text-amber-800">
                          Introuvable
                        </td>
                      ) : (
                        <>
                          <td className="border border-gray-300 px-2 py-1">{order.fboNomComplet || "—"}</td>
                          <td className="border border-gray-300 px-2 py-1 whitespace-nowrap">{order.fboNumero || "—"}</td>
                          <td className="border border-gray-300 px-2 py-1">{order.factureReference || "—"}</td>
                          <td className="border border-gray-300 px-2 py-1 text-right whitespace-nowrap">
                            {hasAs400Amount(order) ? (
                              formatFcfa(order.as400InvoiceTotalFcfa)
                            ) : (
                              <span className="italic text-gray-500">{formatFcfa(order.indicativeTotalFcfa)}</span>
                            )}
                          </td>
                          <td className="border border-gray-300 px-2 py-1">
                            {STATUS_LABELS[order.status] || order.status}
                            {order.status === "CANCELLED" && order.cancelReason ? (
                              <div className="text-[10px] text-gray-500">{order.cancelReason}</div>
                            ) : null}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="border border-gray-300 px-2 py-1.5">
                      Total ({summary.count} commande{summary.count > 1 ? "s" : ""}, hors annulées)
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5 text-right whitespace-nowrap">
                      {formatFcfa(summary.total)}
                    </td>
                    <td className="border border-gray-300 px-2 py-1.5" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs">
              <table className="border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-left">
                    <th className="border border-gray-300 px-2 py-1">Statut</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Commandes</th>
                    <th className="border border-gray-300 px-2 py-1 text-right">Montant (FCFA)</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.byStatus.map(([label, entry]) => (
                    <tr key={label}>
                      <td className="border border-gray-300 px-2 py-1">{label}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{entry.count}</td>
                      <td className="border border-gray-300 px-2 py-1 text-right">{formatFcfa(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(summary.duplicates > 0 || summary.notFound > 0) && (
                <div className="text-amber-800 space-y-1">
                  {summary.duplicates > 0 && <div>{summary.duplicates} doublon(s) dans la liste.</div>}
                  {summary.notFound > 0 && <div>{summary.notFound} numéro(s) introuvable(s).</div>}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
