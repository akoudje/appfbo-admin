import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, CheckCircle2, PauseCircle, RefreshCw, Save, XCircle } from "lucide-react";
import { as400GatewayService } from "../services/as400GatewayService";

const STATUSES = [
  { value: "", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "RUNNING", label: "En cours" },
  { value: "WAITING_HUMAN", label: "Manuel" },
  { value: "COMPLETED", label: "Terminé" },
  { value: "FAILED", label: "Erreur" },
  { value: "CANCELLED", label: "Annulé" },
];

const STATUS_TONES = {
  PENDING: "border-amber-200 bg-amber-50 text-amber-800",
  RUNNING: "border-blue-200 bg-blue-50 text-blue-800",
  WAITING_HUMAN: "border-orange-200 bg-orange-50 text-orange-800",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  FAILED: "border-red-200 bg-red-50 text-red-800",
  CANCELLED: "border-gray-200 bg-gray-50 text-gray-700",
};

const DEFAULT_CONFIG = {
  enabled: false,
  defaultMode: "OBSERVATION",
  allowObservation: true,
  allowAssisted: false,
  allowAutomatic: false,
  workerId: "",
  hllapiProfileName: "",
  sessionName: "",
  environmentLabel: "",
  maxAttempts: 1,
  lockTimeoutSeconds: 900,
  pollIntervalSeconds: 30,
  claimBatchSize: 1,
  lastHeartbeatAt: null,
};

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatFcfa(value) {
  const amount = Number(value || 0);
  if (!amount) return "-";
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${STATUS_TONES[status] || STATUS_TONES.CANCELLED}`}>
      {status || "-"}
    </span>
  );
}

function StatCard({ label, value, tone = "gray" }) {
  const tones = {
    gray: "border-gray-200 bg-white",
    amber: "border-amber-200 bg-amber-50",
    orange: "border-orange-200 bg-orange-50",
    emerald: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
  };

  return (
    <div className={`border p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-gray-950">{value}</div>
    </div>
  );
}

export default function AS400GatewayPage() {
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [actionLoading, setActionLoading] = useState("");
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [configSaving, setConfigSaving] = useState(false);

  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) || rows[0] || null,
    [rows, selectedId],
  );

  const stats = useMemo(() => {
    const base = { total: rows.length, pending: 0, manual: 0, completed: 0, failed: 0 };
    rows.forEach((row) => {
      if (row.status === "PENDING") base.pending += 1;
      if (row.status === "WAITING_HUMAN") base.manual += 1;
      if (row.status === "COMPLETED") base.completed += 1;
      if (row.status === "FAILED") base.failed += 1;
    });
    return base;
  }, [rows]);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await as400GatewayService.listRequests({
        status: status || undefined,
        q: q || undefined,
        take: 100,
      });
      const items = Array.isArray(data?.items) ? data.items : [];
      setRows(items);
      setSelectedId((prev) => (prev && items.some((item) => item.id === prev) ? prev : items[0]?.id || null));
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible de charger les demandes AS400.");
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig() {
    try {
      const data = await as400GatewayService.getConfig();
      setConfig({ ...DEFAULT_CONFIG, ...(data || {}) });
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible de charger la configuration AS400.");
    }
  }

  useEffect(() => {
    load();
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function updateConfigField(key, value) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function saveConfig() {
    setConfigSaving(true);
    setError("");
    try {
      const saved = await as400GatewayService.updateConfig({
        enabled: config.enabled,
        defaultMode: config.defaultMode,
        allowObservation: config.allowObservation,
        allowAssisted: config.allowAssisted,
        allowAutomatic: config.allowAutomatic,
        workerId: config.workerId,
        hllapiProfileName: config.hllapiProfileName,
        sessionName: config.sessionName,
        environmentLabel: config.environmentLabel,
        maxAttempts: config.maxAttempts,
        lockTimeoutSeconds: config.lockTimeoutSeconds,
        pollIntervalSeconds: config.pollIntervalSeconds,
        claimBatchSize: config.claimBatchSize,
      });
      setConfig({ ...DEFAULT_CONFIG, ...(saved || {}) });
    } catch (err) {
      setError(err?.response?.data?.message || "Impossible d'enregistrer la configuration AS400.");
    } finally {
      setConfigSaving(false);
    }
  }

  async function runAction(kind, request) {
    if (!request) return;
    setActionLoading(`${kind}:${request.id}`);
    setError("");
    try {
      if (kind === "manual") {
        await as400GatewayService.markWaitingHuman(request.id, {
          reason: "Bascule manuelle depuis la supervision AS400.",
        });
      }
      if (kind === "cancel") {
        await as400GatewayService.cancelRequest(request.id, {
          reason: "Annulation depuis la supervision AS400.",
        });
      }
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || "Action AS400 impossible.");
    } finally {
      setActionLoading("");
    }
  }

  const canAct = selected && ["PENDING", "RUNNING", "WAITING_HUMAN"].includes(selected.status);

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <section className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-950">Gateway AS400</h1>
          <p className="mt-1 max-w-3xl text-sm text-gray-600">
            Supervision passive des demandes d'intégration AS400. Aucun automate écran vert n'est exécuté depuis cet écran.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Actualiser
        </button>
      </section>

      {error ? (
        <div className="mb-4 flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : null}

      <section className="mb-5 grid gap-3 md:grid-cols-5">
        <StatCard label="Total affiché" value={stats.total} />
        <StatCard label="En attente" value={stats.pending} tone="amber" />
        <StatCard label="Manuel" value={stats.manual} tone="orange" />
        <StatCard label="Terminées" value={stats.completed} tone="emerald" />
        <StatCard label="Erreurs" value={stats.failed} tone="red" />
      </section>

      <section className="mb-5 border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Configuration gateway</h2>
            <p className="mt-1 text-sm text-gray-600">
              Paramètres de consommation des demandes par l'automate externe. Les mots de passe et secrets AS400 restent sur le poste automate.
            </p>
          </div>
          <button
            type="button"
            onClick={saveConfig}
            disabled={configSaving}
            className="inline-flex items-center justify-center gap-2 border border-gray-900 bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
          >
            <Save size={16} />
            Enregistrer
          </button>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-4">
          <label className="flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800">
            <input
              type="checkbox"
              checked={Boolean(config.enabled)}
              onChange={(event) => updateConfigField("enabled", event.target.checked)}
            />
            Gateway activé
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Mode par défaut
            <select
              value={config.defaultMode}
              onChange={(event) => updateConfigField("defaultMode", event.target.value)}
              className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
            >
              <option value="OBSERVATION">Observation</option>
              <option value="ASSISTED">Assisté</option>
              <option value="AUTOMATIC">Automatique</option>
            </select>
          </label>

          <Field
            label="Worker"
            value={config.workerId || ""}
            onChange={(value) => updateConfigField("workerId", value)}
            placeholder="as400-bot-poste-1"
          />
          <Field
            label="Profil HLLAPI"
            value={config.hllapiProfileName || ""}
            onChange={(value) => updateConfigField("hllapiProfileName", value)}
            placeholder="IBM i Access"
          />
          <Field
            label="Session"
            value={config.sessionName || ""}
            onChange={(value) => updateConfigField("sessionName", value)}
            placeholder="A"
          />
          <Field
            label="Environnement"
            value={config.environmentLabel || ""}
            onChange={(value) => updateConfigField("environmentLabel", value)}
            placeholder="Production AS400 CIV"
          />
          <NumberField
            label="Tentatives"
            value={config.maxAttempts}
            onChange={(value) => updateConfigField("maxAttempts", value)}
            min={1}
            max={10}
          />
          <NumberField
            label="Timeout verrou sec."
            value={config.lockTimeoutSeconds}
            onChange={(value) => updateConfigField("lockTimeoutSeconds", value)}
            min={60}
            max={7200}
          />
          <NumberField
            label="Poll sec."
            value={config.pollIntervalSeconds}
            onChange={(value) => updateConfigField("pollIntervalSeconds", value)}
            min={5}
            max={3600}
          />
          <NumberField
            label="Lot de prise"
            value={config.claimBatchSize}
            onChange={(value) => updateConfigField("claimBatchSize", value)}
            min={1}
            max={20}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(config.allowObservation)}
              onChange={(event) => updateConfigField("allowObservation", event.target.checked)}
            />
            Observation
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(config.allowAssisted)}
              onChange={(event) => updateConfigField("allowAssisted", event.target.checked)}
            />
            Assisté
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(config.allowAutomatic)}
              onChange={(event) => updateConfigField("allowAutomatic", event.target.checked)}
            />
            Automatique
          </label>
          <span>Dernier heartbeat: {formatDateTime(config.lastHeartbeatAt)}</span>
        </div>
      </section>

      <section className="mb-5 grid gap-3 border border-gray-200 bg-white p-4 md:grid-cols-[180px_1fr_auto]">
        <label className="text-sm font-semibold text-gray-700">
          Statut
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
          >
            {STATUSES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700">
          Recherche
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") load();
            }}
            placeholder="Commande, FBO, facture AS400"
            className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
        </label>
        <button
          type="button"
          onClick={load}
          className="self-end bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Filtrer
        </button>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Commande</th>
                  <th className="px-4 py-3">FBO</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Montant</th>
                  <th className="px-4 py-3">Créée</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Chargement...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="6" className="px-4 py-8 text-center text-gray-500">Aucune demande AS400.</td></tr>
                ) : rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className={`cursor-pointer border-t border-gray-100 align-top hover:bg-amber-50/50 ${selected?.id === row.id ? "bg-amber-50" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-950">{row.preorder?.preorderNumber || row.preorderId}</div>
                      <div className="mt-1 text-xs text-gray-500">{row.as400InvoiceReference || "Facture AS400 non renseignée"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{row.preorder?.fboNomComplet || "-"}</div>
                      <div className="text-xs text-gray-500">{row.preorder?.fboNumero || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{row.mode}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    <td className="px-4 py-3 font-medium text-gray-900">{formatFcfa(row.requestedAmountFcfa || row.as400AmountFcfa)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDateTime(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="border border-gray-200 bg-white">
          {selected ? (
            <div className="divide-y divide-gray-200">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-950">Détail demande</h2>
                    <p className="mt-1 text-xs text-gray-500">{selected.id}</p>
                  </div>
                  <StatusBadge status={selected.status} />
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <Row label="Action" value={selected.action} />
                  <Row label="Mode" value={selected.mode} />
                  <Row label="Tentatives" value={`${selected.attempts || 0}/${selected.maxAttempts || 1}`} />
                  <Row label="Commande" value={selected.preorder?.preorderNumber || selected.preorderId} />
                  <Row label="Facture AS400" value={selected.as400InvoiceReference || "-"} />
                  <Row label="Validée AS400" value={selected.as400Validated ? "Oui" : "Non"} />
                  <Row label="Montant demandé" value={formatFcfa(selected.requestedAmountFcfa)} />
                  <Row label="Erreur" value={selected.errorMessage || selected.humanReason || "-"} />
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to={`/orders/${selected.preorderId}?tab=billing`}
                    className="inline-flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-100"
                  >
                    Voir commande
                  </Link>
                  <button
                    type="button"
                    disabled={!canAct || actionLoading === `manual:${selected.id}`}
                    onClick={() => runAction("manual", selected)}
                    className="inline-flex items-center gap-2 border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100 disabled:opacity-50"
                  >
                    <PauseCircle size={14} />
                    Traitement manuel
                  </button>
                  <button
                    type="button"
                    disabled={!canAct || actionLoading === `cancel:${selected.id}`}
                    onClick={() => runAction("cancel", selected)}
                    className="inline-flex items-center gap-2 border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Annuler
                  </button>
                </div>
              </div>

              <div className="p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-950">
                  <CheckCircle2 size={16} />
                  Journal
                </h3>
                <div className="space-y-3">
                  {(selected.logs || []).length === 0 ? (
                    <div className="text-sm text-gray-500">Aucun log.</div>
                  ) : selected.logs.map((log) => (
                    <div key={log.id} className="border border-gray-200 bg-gray-50 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-gray-900">{log.event}</span>
                        <span className="text-xs text-gray-500">{formatDateTime(log.createdAt)}</span>
                      </div>
                      {log.message ? <p className="mt-1 text-gray-600">{log.message}</p> : null}
                      {log.actorAdmin ? (
                        <p className="mt-1 text-xs text-gray-500">Par {log.actorAdmin.fullName || log.actorAdmin.email}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-gray-500">Sélectionnez une demande AS400.</div>
          )}
        </aside>
      </section>
    </main>
  );
}

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="break-words font-medium text-gray-900">{value || "-"}</dd>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }) {
  return (
    <label className="text-sm font-semibold text-gray-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
      />
    </label>
  );
}

function NumberField({ label, value, onChange, min, max }) {
  return (
    <label className="text-sm font-semibold text-gray-700">
      {label}
      <input
        type="number"
        value={value ?? ""}
        min={min}
        max={max}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400"
      />
    </label>
  );
}
