// Onglet « En attente paiement » : renvoi groupé des notifications de paiement
// (réservé aux superviseurs de la facturation). Aperçu → confirmation → suivi
// → compte rendu. Les commandes notifiées il y a moins de 30 min, payées ou
// avec un paiement Wave en cours sont écartées par le serveur.
import { useCallback, useEffect, useRef, useState } from "react";
import { ordersService } from "../../services/ordersService";

const POLL_MS = 2000;

const OUTCOME_LABELS = {
  SENT: "Envoyée",
  QUEUED: "En file d'envoi",
  FAILED: "Échec",
  SKIPPED: "Sautée",
};

function plural(n, word) {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

function errorMessage(e, fallback) {
  return e?.response?.data?.message || fallback;
}

export default function BulkPaymentNotificationsPanel({ onFinished }) {
  const [preview, setPreview] = useState(null);
  const [job, setJob] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSkipped, setShowSkipped] = useState(false);
  const pollRef = useRef(null);
  const onFinishedRef = useRef(onFinished);
  useEffect(() => {
    onFinishedRef.current = onFinished;
  }, [onFinished]);

  const stopPolling = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = null;
  };

  const poll = useCallback((jobId) => {
    stopPolling();
    pollRef.current = setTimeout(async () => {
      try {
        const data = await ordersService.getBulkPaymentNotificationsJob(jobId);
        setJob(data?.job || null);
        if (data?.job?.status === "RUNNING") poll(jobId);
        else onFinishedRef.current?.();
      } catch (e) {
        setError(errorMessage(e, "Impossible de suivre le renvoi groupé."));
      }
    }, POLL_MS);
  }, []);

  // Un renvoi groupé déjà lancé (par vous ou un collègue) est repris à l'ouverture.
  useEffect(() => {
    let cancelled = false;
    ordersService
      .getBulkPaymentNotificationsJob("current")
      .then((data) => {
        if (cancelled || !data?.job) return;
        if (data.job.status === "RUNNING") {
          setJob(data.job);
          poll(data.job.id);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [poll]);

  const openPreview = async () => {
    setBusy(true);
    setError("");
    setJob(null);
    setShowSkipped(false);
    try {
      const data = await ordersService.previewBulkPaymentNotifications();
      if (data?.current?.status === "RUNNING") {
        setJob(data.current);
        poll(data.current.id);
      } else {
        setPreview(data);
      }
    } catch (e) {
      setError(errorMessage(e, "Impossible de préparer le renvoi groupé."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    setError("");
    try {
      const data = await ordersService.startBulkPaymentNotifications();
      setPreview(null);
      setJob(data?.job || null);
      if (data?.job?.status === "RUNNING") poll(data.job.id);
    } catch (e) {
      const running = e?.response?.data?.job;
      if (running?.status === "RUNNING") {
        setPreview(null);
        setJob(running);
        poll(running.id);
      }
      setError(errorMessage(e, "Impossible de lancer le renvoi groupé."));
    } finally {
      setBusy(false);
    }
  };

  const running = job?.status === "RUNNING";
  const finished = job && !running;
  const problems = (job?.results || []).filter((r) => r.outcome === "FAILED" || r.outcome === "SKIPPED");
  const skippedBefore = preview?.skipped || job?.skipped || [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Notifications de paiement</div>
          <div className="text-xs text-gray-500">
            Renvoie le lien de paiement à toutes les commandes préfacturées en attente de paiement.
            Chaque renvoi remplace le lien précédent (valable 3 h).
          </div>
        </div>
        {!preview && !running ? (
          <button
            type="button"
            onClick={openPreview}
            disabled={busy}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? "Préparation…" : "Renvoyer à toutes les commandes"}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      ) : null}

      {preview ? (
        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          {preview.eligible.length ? (
            <div className="font-medium">
              {plural(preview.eligible.length, "commande")} {preview.eligible.length > 1 ? "seront relancées" : "sera relancée"}
              {preview.skipped.length ? `, ${plural(preview.skipped.length, "commande")} ${preview.skipped.length > 1 ? "écartées" : "écartée"}` : ""}.
            </div>
          ) : (
            <div className="font-medium">Aucune commande à relancer pour le moment.</div>
          )}
          {preview.truncated ? (
            <div className="mt-1 text-xs">
              Limité aux {preview.max} commandes les plus anciennes : relancez de nouveau ensuite pour les suivantes.
            </div>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {preview.eligible.length ? (
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {busy ? "Lancement…" : `Confirmer l'envoi (${preview.eligible.length})`}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setPreview(null)}
              disabled={busy}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {running ? (
        <div className="mt-3 text-sm text-gray-700">
          <div className="font-medium">
            Renvoi en cours : {job.done} / {job.total}
            {job.startedBy?.label ? ` · lancé par ${job.startedBy.label}` : ""}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-[width] duration-500"
              style={{ width: `${job.total ? Math.round((job.done / job.total) * 100) : 100}%` }}
            />
          </div>
        </div>
      ) : null}

      {finished ? (
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
          <div className="font-medium">
            Renvoi terminé : {plural(job.sent, "envoyée")}
            {job.queued ? `, ${job.queued} en file d'envoi` : ""}
            {job.failed ? `, ${plural(job.failed, "échec")}` : ""}
            {skippedBefore.length ? `, ${plural(skippedBefore.length, "écartée")} avant l'envoi` : ""}.
          </div>
          {problems.length ? (
            <ul className="mt-2 space-y-1 text-xs">
              {problems.map((r) => (
                <li key={r.id} className={r.outcome === "FAILED" ? "text-red-700" : "text-gray-600"}>
                  {r.reference} · {r.fboNomComplet || "—"} : {OUTCOME_LABELS[r.outcome]}
                  {r.detail ? ` (${r.detail})` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          <button
            type="button"
            onClick={() => setJob(null)}
            className="mt-2 text-xs font-medium text-blue-700 hover:underline"
          >
            Fermer le compte rendu
          </button>
        </div>
      ) : null}

      {skippedBefore.length && (preview || finished) ? (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowSkipped((v) => !v)}
            className="text-xs font-medium text-gray-600 hover:underline"
          >
            {showSkipped ? "Masquer" : "Voir"} les commandes écartées ({skippedBefore.length})
          </button>
          {showSkipped ? (
            <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
              {skippedBefore.map((s) => (
                <li key={s.id}>
                  {s.reference} · {s.fboNomComplet || "—"} : {s.reasonLabel}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
