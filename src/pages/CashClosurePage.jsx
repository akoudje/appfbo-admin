import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  Loader2,
  RefreshCw,
  Save,
  ShieldCheck,
  Smartphone,
  XCircle,
} from "lucide-react";
import { cashClosureService } from "../services/cashClosureService";
import { formatFcfa, formatDateTime } from "../lib/format";

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toInputAmount(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? String(Math.max(0, Math.round(n))) : "0";
}

function statusLabel(status) {
  const labels = {
    DRAFT: "Brouillon",
    SUBMITTED: "Soumise",
    APPROVED: "Validée",
    REJECTED: "Rejetée",
  };
  return labels[String(status || "").toUpperCase()] || status || "-";
}

function statusClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "APPROVED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (s === "SUBMITTED") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (s === "REJECTED") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function discrepancyClass(value) {
  const n = Number(value || 0);
  if (n === 0) return "text-emerald-700";
  if (n < 0) return "text-red-700";
  return "text-amber-700";
}

function paymentModeIcon(paymentMode) {
  const mode = String(paymentMode || "").toUpperCase();
  if (mode === "ESPECES") return Banknote;
  if (["WAVE", "ORANGE_MONEY", "ECOBANK_PAY"].includes(mode)) return Smartphone;
  if (mode === "TPE_CARD") return CreditCard;
  if (mode === "BANK_TRANSFER") return Landmark;
  return Banknote;
}

const DECLARATION_PAYMENT_MODES = new Set([
  "ESPECES",
  "WAVE",
  "ORANGE_MONEY",
  "TPE_CARD",
  "BANK_TRANSFER",
  "ECOBANK_PAY",
]);

function isVisibleDeclarationLine(line) {
  const mode = String(line?.paymentMode || "").toUpperCase();
  if (DECLARATION_PAYMENT_MODES.has(mode)) return true;
  return (
    Number(line?.expectedFcfa || 0) > 0 ||
    Number(line?.declaredFcfa || 0) > 0 ||
    Number(line?.transactionCount || 0) > 0 ||
    String(line?.note || "").trim().length > 0
  );
}

function SummaryCard({ icon: Icon, label, value, hint, tone = "gray" }) {
  const tones = {
    gray: "border-gray-200 bg-white",
    green: "border-emerald-200 bg-emerald-50",
    amber: "border-amber-200 bg-amber-50",
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tones[tone] || tones.gray}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</div>
          <div className="mt-2 text-2xl font-bold text-gray-950">{value}</div>
        </div>
        <div className="rounded-lg bg-white p-2 text-gray-600 shadow-sm ring-1 ring-gray-200">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

export default function CashClosurePage() {
  const [dateKey, setDateKey] = useState(todayIso());
  const [closure, setClosure] = useState(null);
  const [lines, setLines] = useState([]);
  const [note, setNote] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadDraft = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const data = await cashClosureService.getDraft({ date: dateKey });
      const nextClosure = data.closure || null;
      setClosure(nextClosure);
      setLines(nextClosure?.lines || []);
      setNote(nextClosure?.note || "");
      setReviewNote("");
      setCanReview(Boolean(data.permissions?.canReview));
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Impossible de charger la clôture.");
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const editable = ["DRAFT", "REJECTED"].includes(String(closure?.status || "").toUpperCase());
  const submitted = String(closure?.status || "").toUpperCase() === "SUBMITTED";

  const localTotals = useMemo(() => {
    const expected = lines.reduce((sum, line) => sum + Number(line.expectedFcfa || 0), 0);
    const declared = lines.reduce((sum, line) => sum + Number(line.declaredFcfa || 0), 0);
    const count = lines.reduce((sum, line) => sum + Number(line.transactionCount || 0), 0);
    return {
      expected,
      declared,
      discrepancy: declared - expected,
      count,
    };
  }, [lines]);

  const visibleLines = useMemo(
    () => lines.filter(isVisibleDeclarationLine),
    [lines],
  );

  function updateLine(paymentMode, field, value) {
    setLines((current) =>
      current.map((line) =>
        line.paymentMode === paymentMode
          ? {
              ...line,
              [field]: field === "declaredFcfa" ? Number(value || 0) : value,
              discrepancyFcfa:
                field === "declaredFcfa"
                  ? Number(value || 0) - Number(line.expectedFcfa || 0)
                  : line.discrepancyFcfa,
            }
          : line,
      ),
    );
  }

  async function saveDraft() {
    if (!closure?.id) return false;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await cashClosureService.update(closure.id, {
        note,
        lines: visibleLines.map((line) => ({
          paymentMode: line.paymentMode,
          declaredFcfa: Number(line.declaredFcfa || 0),
          note: line.note || "",
        })),
      });
      setClosure(data.closure);
      setLines(data.closure?.lines || []);
      setNote(data.closure?.note || "");
      setMessage("Clôture enregistrée.");
      return true;
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Erreur lors de l'enregistrement.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submitClosure() {
    const saved = await saveDraft();
    if (!saved) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const data = await cashClosureService.submit(closure.id);
      setClosure(data.closure);
      setLines(data.closure?.lines || []);
      setMessage("Clôture soumise au contrôle.");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Erreur lors de la soumission.");
    } finally {
      setSaving(false);
    }
  }

  async function review(action) {
    if (!closure?.id) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const fn = action === "approve" ? cashClosureService.approve : cashClosureService.reject;
      const data = await fn(closure.id, { reviewNote });
      setClosure(data.closure);
      setLines(data.closure?.lines || []);
      setReviewNote("");
      setMessage(action === "approve" ? "Clôture validée." : "Clôture rejetée.");
    } catch (err) {
      setError(err?.response?.data?.message || err.message || "Erreur lors du contrôle.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-sm font-semibold uppercase tracking-wide text-gray-500">Caisse</div>
          <h1 className="mt-1 text-2xl font-bold text-gray-950">Clôture journalière</h1>
          <p className="mt-1 text-sm text-gray-500">
            Point de caisse par mode de paiement, avec écart entre l'attendu et le déclaré.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 shadow-sm">
            <CalendarDays className="h-4 w-4 text-gray-500" />
            <input
              type="date"
              value={dateKey}
              onChange={(event) => setDateKey(event.target.value || todayIso())}
              className="bg-transparent outline-none"
            />
          </label>
          <button
            type="button"
            onClick={loadDraft}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      {message ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="mt-0.5 h-4 w-4" />
          <span>{message}</span>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusClass(closure?.status)}`}>
              {statusLabel(closure?.status)}
            </span>
            <span className="text-sm text-gray-600">
              Caissière : <strong>{closure?.cashier?.label || "Non renseigné"}</strong>
            </span>
            <span className="text-sm text-gray-500">
              Dernière mise à jour : {formatDateTime(closure?.updatedAt)}
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <SummaryCard
              icon={Banknote}
              label="Attendu"
              value={formatFcfa(localTotals.expected)}
              hint={`${localTotals.count} transaction(s)`}
              tone="blue"
            />
            <SummaryCard
              icon={Save}
              label="Déclaré"
              value={formatFcfa(localTotals.declared)}
              hint="Saisie caisse"
              tone="gray"
            />
            <SummaryCard
              icon={localTotals.discrepancy === 0 ? CheckCircle2 : AlertTriangle}
              label="Écart"
              value={formatFcfa(localTotals.discrepancy)}
              hint={localTotals.discrepancy === 0 ? "Aucun écart" : "À justifier avant validation"}
              tone={localTotals.discrepancy === 0 ? "green" : "amber"}
            />
            <SummaryCard
              icon={Clock}
              label="Statut"
              value={statusLabel(closure?.status)}
              hint={closure?.submittedAt ? `Soumise : ${formatDateTime(closure.submittedAt)}` : "Non soumise"}
              tone="gray"
            />
          </div>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-bold text-gray-950">Déclaration des encaissements</h2>
              <p className="text-sm text-gray-500">
                Renseignez les montants réellement constatés à la caisse pour chaque moyen de paiement.
              </p>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleLines.map((line) => {
                const Icon = paymentModeIcon(line.paymentMode);
                return (
                  <div key={line.paymentMode} className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white p-2 text-gray-700 shadow-sm ring-1 ring-gray-200">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-950">{line.label}</div>
                          <div className="text-xs text-gray-500">
                            {line.transactionCount} transaction(s) détectée(s)
                          </div>
                        </div>
                      </div>
                      <div className={`text-right text-sm font-bold ${discrepancyClass(line.discrepancyFcfa)}`}>
                        {formatFcfa(line.discrepancyFcfa)}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Attendu
                        </label>
                        <div className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-right font-bold text-gray-900">
                          {formatFcfa(line.expectedFcfa)}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Déclaré
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={toInputAmount(line.declaredFcfa)}
                          onChange={(event) => updateLine(line.paymentMode, "declaredFcfa", event.target.value)}
                          disabled={!editable || saving}
                          className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-right font-bold text-gray-950 outline-none focus:border-gray-900 disabled:bg-gray-100"
                        />
                      </div>
                    </div>

                    <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Observation
                    </label>
                    <textarea
                      value={line.note || ""}
                      onChange={(event) => updateLine(line.paymentMode, "note", event.target.value)}
                      disabled={!editable || saving}
                      rows={2}
                      placeholder="Référence, détail du dépôt, justification d'écart..."
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900 disabled:bg-gray-100"
                    />
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-[1fr_420px]">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <label className="text-sm font-bold text-gray-900">Note de clôture</label>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={!editable || saving}
                rows={4}
                className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 disabled:bg-gray-100"
                placeholder="Écart constaté, justification, remarque de caisse..."
              />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-bold text-gray-900">Actions</div>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={!editable || saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Enregistrer le brouillon
                </button>
                <button
                  type="button"
                  onClick={submitClosure}
                  disabled={!editable || saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white hover:bg-black disabled:opacity-60"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Soumettre au contrôle
                </button>
              </div>

              {canReview && submitted ? (
                <div className="mt-5 border-t border-gray-200 pt-5">
                  <label className="text-sm font-bold text-gray-900">Note de contrôle</label>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900"
                    placeholder="Motif de validation ou de rejet..."
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => review("reject")}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-100 disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Rejeter
                    </button>
                    <button
                      type="button"
                      onClick={() => review("approve")}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Valider
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
