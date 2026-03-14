// admin-app/src/pages/billing/BillingQueuePage.jsx
// Page d'affichage de la file de facturation, avec les stats, les onglets et le tableau. Gère les actions de prise en charge, démarrage, libération et escalade des dossiers de facturation.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ordersService } from "../../services/ordersService";
import BillingQueueHeader from "../../components/billing/BillingQueueHeader";
import BillingQueueAlerts from "../../components/billing/BillingQueueAlerts";
import BillingQueueStats from "../../components/billing/BillingQueueStats";
import BillingQueueTabs from "../../components/billing/BillingQueueTabs";
import BillingQueueTable from "../../components/billing/BillingQueueTable";

export default function BillingQueuePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tab, setTab] = useState("my");
  const [rows, setRows] = useState([]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [myData, queueData, waitingPaymentData, escalatedData] = await Promise.all([
        ordersService.getAll({
          page: 1,
          pageSize: 100,
          assignedOnly: true,
          sort: "billingSlaDeadlineAt",
          dir: "asc",
        }),
        ordersService.getAll({
          page: 1,
          pageSize: 100,
          billingWorkStatus: "QUEUED",
          sort: "billingQueueEnteredAt",
          dir: "asc",
        }),
        ordersService.getAll({
          page: 1,
          pageSize: 100,
          billingWorkStatus: "WAITING_PAYMENT",
          sort: "updatedAt",
          dir: "desc",
        }),
        ordersService.getAll({
          page: 1,
          pageSize: 100,
          billingWorkStatus: "ESCALATED",
          sort: "updatedAt",
          dir: "desc",
        }),
      ]);

      const merged = [
        ...(myData?.data || []),
        ...(queueData?.data || []),
        ...(waitingPaymentData?.data || []),
        ...(escalatedData?.data || []),
      ];

      const uniqueMap = new Map();
      merged.forEach((row) => {
        uniqueMap.set(row.id, row);
      });

      setRows(Array.from(uniqueMap.values()));
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de charger la file de facturation",
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

    if (tab === "queue") {
      return rows.filter((r) => ["QUEUED", "RELEASED"].includes(r.billingWorkStatus));
    }

    if (tab === "waiting-payment") {
      return rows.filter((r) => r.billingWorkStatus === "WAITING_PAYMENT");
    }

    if (tab === "escalated") {
      return rows.filter((r) => r.billingWorkStatus === "ESCALATED");
    }

    return rows.filter((r) =>
      ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER_DATA", "WAITING_PAYMENT"].includes(
        r.billingWorkStatus,
      ),
    );
  }, [rows, tab]);

  const stats = useMemo(() => {
    const all = Array.isArray(rows) ? rows : [];

    return {
      queue: all.filter((r) => ["QUEUED", "RELEASED"].includes(r.billingWorkStatus)).length,
      my: all.filter((r) =>
        ["ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER_DATA", "WAITING_PAYMENT"].includes(
          r.billingWorkStatus,
        ),
      ).length,
      waitingPayment: all.filter((r) => r.billingWorkStatus === "WAITING_PAYMENT").length,
      escalated: all.filter((r) => r.billingWorkStatus === "ESCALATED").length,
    };
  }, [rows]);

  const handleOpen = (row) => {
    navigate(`/orders/${row.id}?tab=workflow`);
  };

  const handleClaimNext = async () => {
    try {
      setClaiming(true);
      setError("");
      setInfo("");

      const result = await ordersService.claimNextBilling();

      if (result?.ok && result?.preorder?.id) {
        setInfo("Dossier attribué avec succès.");
        await load();
        navigate(`/orders/${result.preorder.id}?tab=workflow`);
        return;
      }

      if (result?.reason === "NO_ORDER_AVAILABLE") {
        setInfo("Aucun dossier disponible dans la file.");
        return;
      }

      if (result?.reason === "MAX_ACTIVE_REACHED") {
        setInfo(
          `Limite atteinte : ${result.activeCount}/${result.maxActive} dossiers actifs.`,
        );
        return;
      }

      setInfo("Aucun dossier attribué.");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de prendre le prochain dossier",
      );
    } finally {
      setClaiming(false);
    }
  };

  const handleStart = async (row) => {
    try {
      setError("");
      setInfo("");
      await ordersService.startBilling(row.id);
      setInfo("Traitement démarré.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de démarrer le traitement");
    }
  };

  const handleRelease = async (row) => {
    try {
      setError("");
      setInfo("");
      await ordersService.releaseBilling(row.id, {
        reason: "Libéré depuis la file de facturation",
      });
      setInfo("Dossier remis dans la file.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de libérer le dossier");
    }
  };

  const handleEscalate = async (row) => {
    try {
      setError("");
      setInfo("");
      await ordersService.escalateBilling(row.id, {
        reason: "Escaladé depuis la file de facturation",
      });
      setInfo("Dossier escaladé.");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d’escalader le dossier");
    }
  };

  return (
    <div className="space-y-4">
      <BillingQueueHeader
        loading={loading}
        claiming={claiming}
        onRefresh={load}
        onClaimNext={handleClaimNext}
      />

      <BillingQueueAlerts error={error} info={info} />

      <BillingQueueStats stats={stats} />

      <BillingQueueTabs tab={tab} setTab={setTab} />

      <BillingQueueTable
        rows={filteredRows}
        loading={loading}
        onOpen={handleOpen}
        onStart={handleStart}
        onRelease={handleRelease}
        onEscalate={handleEscalate}
      />
    </div>
  );
}