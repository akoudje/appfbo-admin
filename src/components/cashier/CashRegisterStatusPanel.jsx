// admin-app/src/components/cashier/CashRegisterStatusPanel.jsx
// Interrupteur temporaire "paiements en ligne ouverts / fermés" pour la caisse
// physique. Fermer annule les liens de paiement hors précommande encore
// actifs et bloque la génération de nouveaux liens via le kiosque QR, pour
// éviter qu'un client paie alors que le comptoir est fermé. À retirer une
// fois l'automatisation réelle des horaires de caisse en place.

import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { cashRegisterStatusService } from "../../services/cashRegisterStatusService";

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

function actorLabel(actor) {
  return actor?.fullName || actor?.email || null;
}

export default function CashRegisterStatusPanel() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      setError("");
      const response = await cashRegisterStatusService.get();
      setStatus(response?.status || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Statut caisse indisponible.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleClose() {
    const confirmed = window.confirm(
      "Fermer les paiements en ligne ? Tous les liens de paiement hors précommande encore actifs seront annulés, et le kiosque QR n'en génèrera plus jusqu'à réouverture.",
    );
    if (!confirmed) return;

    try {
      setBusy(true);
      setError("");
      const response = await cashRegisterStatusService.close();
      setStatus(response?.status || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Fermeture impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen() {
    try {
      setBusy(true);
      setError("");
      const response = await cashRegisterStatusService.open();
      setStatus(response?.status || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Réouverture impossible.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return null;

  const isOpen = status?.isOpen !== false;

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between ${
        isOpen ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2 ${isOpen ? "bg-white text-emerald-700" : "bg-white text-red-700"}`}>
          {isOpen ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        </div>
        <div>
          <div className={`text-sm font-bold ${isOpen ? "text-emerald-900" : "text-red-900"}`}>
            Paiements en ligne (liens hors app) : {isOpen ? "Ouverts" : "Fermés"}
          </div>
          {isOpen ? (
            <p className="mt-0.5 text-xs text-emerald-800">
              Le kiosque QR peut générer des liens Wave normalement.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-red-800">
              Fermé{status?.closedAt ? ` le ${formatDateTime(status.closedAt)}` : ""}
              {actorLabel(status?.closedBy) ? ` par ${actorLabel(status.closedBy)}` : ""}. Liens en attente
              annulés, kiosque QR bloqué.
            </p>
          )}
          {error ? <p className="mt-1 text-xs font-semibold text-red-700">{error}</p> : null}
        </div>
      </div>

      {isOpen ? (
        <button
          type="button"
          onClick={handleClose}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          Fermer les paiements en ligne
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Unlock className="h-4 w-4" />
          Rouvrir les paiements en ligne
        </button>
      )}
    </div>
  );
}
