// admin-app/src/components/cashier/CashRegisterStatusPanel.jsx
// Interrupteur temporaire "précommandes payables en ligne / non" — personnel
// pour un facturier caissier (rôle combiné), partagé pour les autres rôles
// (responsables, modèle classique séparé CAISSIERE/INVOICER). Fermer :
//  - ANNULE (statut CANCELLED) les précommandes préfacturées encore en
//    attente de paiement qui lui sont assignées (ou tout le pays pour une
//    fermeture globale), et bloque toute nouvelle initiation de paiement
//    Wave publique pour elles ;
// pour éviter qu'un client paie alors que personne ne peut le servir. Les
// liens de paiement hors app (QR) et les billets d'événement ne sont pas
// concernés. À retirer une fois l'automatisation réelle des horaires de
// caisse en place.

import { useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";
import { cashRegisterStatusService } from "../../services/cashRegisterStatusService";
import CloseRegisterDialog from "./CloseRegisterDialog";
import { requestLaunchRemindersRefresh } from "../../hooks/useLaunchReminders";

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
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

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

  const isPersonal = status?.scope === "personal";
  const registerLabel = isPersonal ? "Ma caisse" : "Caisse (comptoir)";

  // La confirmation (liste des préfactures annulées, encaissements espèces
  // non saisis) se fait dans CloseRegisterDialog.
  async function handleClose({ confirmNoUnrecordedCash }) {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const response = await cashRegisterStatusService.close("", { confirmNoUnrecordedCash });
      setStatus(response?.status || null);
      setCloseDialogOpen(false);
      setMessage(`Caisse fermée : ${response?.cancelledPreordersCount || 0} précommande(s) préfacturée(s) annulée(s).`);
      requestLaunchRemindersRefresh();
    } catch (err) {
      setCloseDialogOpen(false);
      setError(
        err?.response?.data?.code === "CLOSURE_CONFIRMATION_REQUIRED"
          ? "De nouvelles préfactures sont arrivées entre-temps : rouvrez la fermeture pour les vérifier."
          : err?.response?.data?.message || "Fermeture impossible.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleOpen() {
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const response = await cashRegisterStatusService.open();
      setStatus(response?.status || null);
      requestLaunchRemindersRefresh();
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
            {registerLabel} : {isOpen ? "Ouverte" : "Fermée"}
          </div>
          {isOpen ? (
            <p className="mt-0.5 text-xs text-emerald-800">
              Paiement des précommandes préfacturées disponible normalement.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-red-800">
              Fermée{status?.closedAt ? ` le ${formatDateTime(status.closedAt)}` : ""}
              {actorLabel(status?.closedBy) ? ` par ${actorLabel(status.closedBy)}` : ""}. Précommandes préfacturées
              en attente annulées, nouveaux paiements bloqués.
            </p>
          )}
          {message ? <p className="mt-1 text-xs font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-1 text-xs font-semibold text-red-700">{error}</p> : null}
        </div>
      </div>

      {isOpen ? (
        <button
          type="button"
          onClick={() => setCloseDialogOpen(true)}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          <Lock className="h-4 w-4" />
          Fermer {isPersonal ? "ma caisse" : "la caisse"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Unlock className="h-4 w-4" />
          Rouvrir {isPersonal ? "ma caisse" : "la caisse"}
        </button>
      )}
      {closeDialogOpen ? (
        <CloseRegisterDialog
          isPersonal={isPersonal}
          busy={busy}
          onCancel={() => setCloseDialogOpen(false)}
          onConfirm={handleClose}
        />
      ) : null}
    </div>
  );
}
