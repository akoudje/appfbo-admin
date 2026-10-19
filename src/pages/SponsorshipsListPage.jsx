// src/pages/SponsorshipsListPage.jsx
// File des parrainages : à vérifier (FIFO), en attente d'achat, validés, etc.

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, UserPlus } from "lucide-react";
import { sponsorshipsService } from "../services/sponsorshipsService";
import { SPONSORSHIP_STATUS } from "../components/sponsorships/sponsorshipStatus";

const TABS = ["SUBMITTED", "CHANGES_REQUESTED", "APPROVED_PENDING_PURCHASE", "VALIDATED", "REJECTED", "EXPIRED"];

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SponsorshipsListPage() {
  const [status, setStatus] = useState("SUBMITTED");
  const [query, setQuery] = useState("");
  const [data, setData] = useState({ data: [], counts: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await sponsorshipsService.list({ status, q: query.trim() || undefined }));
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger les parrainages.");
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    const timer = setTimeout(load, query ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <UserPlus className="h-6 w-6" /> Parrainages
          </h1>
          <p className="text-sm text-gray-500">
            Vérifiez la fiche et la pièce d'identité, puis approuvez avec le n° FBO attribué dans AS400. Les plus anciennes soumissions en premier.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, CNI, mobile, n° FBO…"
            className="w-full max-w-xs rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <Link
            to="/sponsorships/new-counter"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#FFC600] px-3 py-2 text-sm font-semibold text-black hover:bg-[#e6b200]"
          >
            <Plus className="h-4 w-4" /> Nouveau (comptoir)
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setStatus(key)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold ${
              status === key ? "bg-gray-900 text-white" : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {SPONSORSHIP_STATUS[key].label}
            <span className={`rounded-full px-2 text-xs ${status === key ? "bg-white/20" : "bg-gray-100"}`}>{data.counts?.[key] || 0}</span>
          </button>
        ))}
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2">Soumis le</th>
              <th className="px-4 py-2">Filleul</th>
              <th className="px-4 py-2">Âge</th>
              <th className="px-4 py-2">Parrain</th>
              <th className="px-4 py-2">Pièces</th>
              <th className="px-4 py-2">N° FBO / échéance</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Chargement…</td></tr>
            ) : data.data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Aucun parrainage dans cette liste.</td></tr>
            ) : (
              data.data.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 whitespace-nowrap">{formatDateTime(row.submittedAt || row.createdAt)}</td>
                  <td className="px-4 py-2">
                    <div className="font-semibold text-gray-900">{row.lastName} {row.firstNames}</div>
                    <div className="text-xs text-gray-500">{row.mobile} · {row.city}</div>
                  </td>
                  <td className={`px-4 py-2 ${row.recruitAge != null && row.recruitAge < 18 ? "font-bold text-red-600" : ""}`}>
                    {row.recruitAge != null ? `${row.recruitAge} ans` : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div>{row.sponsorNom}</div>
                    <div className="text-xs text-gray-500">{row.sponsorNumero}</div>
                  </td>
                  <td className="px-4 py-2">{row._count?.documents || 0}</td>
                  <td className="px-4 py-2 text-xs">
                    {row.recruitFboNumero ? <div className="font-mono">{row.recruitFboNumero}</div> : "—"}
                    {row.status === "APPROVED_PENDING_PURCHASE" ? <div className="text-gray-500">avant le {formatDateTime(row.purchaseDeadlineAt)}</div> : null}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Link to={`/sponsorships/${row.id}`} className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                      {row.status === "SUBMITTED" ? "Vérifier" : "Ouvrir"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
