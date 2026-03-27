// admin-app/src/pages/preparation/PreparationQueuePage.jsx
// Page d'affichage de la file de préparation, avec les stats, les onglets et le tableau. Gère les actions de préparation des commandes.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ordersService } from "../../services/ordersService";
import PreparationQueueHeader from "../../components/preparation/PreparationQueueHeader";
import PreparationQueueAlerts from "../../components/preparation/PreparationQueueAlerts";
import PreparationQueueStats from "../../components/preparation/PreparationQueueStats";
import PreparationQueueTabs from "../../components/preparation/PreparationQueueTabs";
import PreparationQueueTable from "../../components/preparation/PreparationQueueTable";

export default function PreparationQueuePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tab, setTab] = useState("to-prepare");
  const [rows, setRows] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [paidData, readyData, fulfilledData] = await Promise.all([
        ordersService.getAll({
          page: 1,
          pageSize: 100,
          status: "PAID",
          paymentStatus: "PAID",
          sort: "paidAt",
          dir: "asc",
        }),
        ordersService.getAll({
          page: 1,
          pageSize: 100,
          status: "READY",
          sort: "updatedAt",
          dir: "desc",
        }),
        ordersService.getAll({
          page: 1,
          pageSize: 100,
          status: "FULFILLED",
          sort: "fulfilledAt",
          dir: "desc",
        }),
      ]);

      const merged = [
        ...(paidData?.data || []),
        ...(readyData?.data || []),
        ...(fulfilledData?.data || []),
      ];

      const uniqueMap = new Map();
      merged.forEach((row) => {
        uniqueMap.set(row.id, row);
      });

      setRows(Array.from(uniqueMap.values()));
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de charger la file de préparation",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];

    if (tab === "ready") {
      return rows.filter((r) => r.status === "READY");
    }

    if (tab === "fulfilled") {
      return rows.filter((r) => r.status === "FULFILLED");
    }

    return rows.filter((r) => r.status === "PAID" && r.preparationLaunchedAt);
  }, [rows, tab]);

  const stats = useMemo(() => {
    const all = Array.isArray(rows) ? rows : [];

    return {
      toPrepare: all.filter((r) => r.status === "PAID" && r.preparationLaunchedAt)
        .length,
      ready: all.filter((r) => r.status === "READY").length,
      fulfilled: all.filter((r) => r.status === "FULFILLED").length,
      total: all.length,
    };
  }, [rows]);

  const handleOpen = (row) => {
    navigate(`/orders/${row.id}?tab=preparation`);
  };

  const handlePrepare = async (row) => {
    try {
      setActionLoadingId(row.id);
      setError("");
      setInfo("");

      await ordersService.prepare(row.id, {
        packingNote: "Préparée depuis la file de préparation",
      });

      setInfo("Commande marquée comme prête et SMS client envoyé.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de préparer la commande");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="space-y-4">
      <PreparationQueueHeader loading={loading} onRefresh={load} />

      <PreparationQueueAlerts error={error} info={info} />

      <PreparationQueueStats stats={stats} />

      <PreparationQueueTabs tab={tab} setTab={setTab} />

      <PreparationQueueTable
        rows={filteredRows}
        loading={loading || !!actionLoadingId}
        onOpen={handleOpen}
        onPrepare={handlePrepare}
      />
    </div>
  );
}
