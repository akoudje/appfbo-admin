// src/pages/SponsorshipReviewPage.jsx
// Vérification d'un parrainage : pièce d'identité à côté des données saisies,
// âge calculé, doublons possibles ; approuver (n° FBO AS400), demander un
// complément ou refuser.

import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink, Printer } from "lucide-react";
import { sponsorshipsService } from "../services/sponsorshipsService";
import { PURCHASE_PAYMENT_MODES, SPONSORSHIP_STATUS } from "../components/sponsorships/sponsorshipStatus";
import CounterPurchasePanel from "../components/sponsorships/CounterPurchasePanel";
import useAdminAuth from "../hooks/useAdminAuth";
import { hasPermission, Permission } from "../auth/permissions";
import { formatFboNumber, defaultFboNumberPrefix } from "../utils/fboNumber";

const ID_DOCUMENT_LABELS = {
  CNI: "CNI",
  PASSPORT: "Passeport",
  DRIVING_LICENSE: "Permis de conduire",
  CONSULAR_CARD: "Carte consulaire",
  OTHER: "Autre pièce officielle",
};

const DOCUMENT_LABELS = { ID_FRONT: "CNI recto", ID_BACK: "CNI verso", PASSPORT: "Passeport", OTHER: "Autre pièce" };

function formatDate(value, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", withTime
    ? { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

function Row({ label, value }) {
  return (
    <div className="grid grid-cols-[150px_1fr] gap-2 py-1 text-sm">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium text-gray-900 break-words">{value || "—"}</dd>
    </div>
  );
}

function DocumentViewer({ sponsorshipId, document }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let objectUrl = "";
    let active = true;
    sponsorshipsService
      .downloadDocument(sponsorshipId, document.id)
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(new Blob([response.data], { type: document.mimeType }));
        setUrl(objectUrl);
      })
      .catch(() => active && setError("Impossible de charger la pièce."));
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [sponsorshipId, document.id, document.mimeType]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">{DOCUMENT_LABELS[document.type] || document.type}</span>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
            Ouvrir <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
      {error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : !url ? (
        <div className="py-10 text-center text-sm text-gray-400">Chargement…</div>
      ) : document.mimeType === "application/pdf" ? (
        <iframe title={DOCUMENT_LABELS[document.type]} src={url} className="h-96 w-full rounded-lg border" />
      ) : (
        <img src={url} alt={DOCUMENT_LABELS[document.type]} className="max-h-[28rem] w-full rounded-lg object-contain bg-gray-50" />
      )}
    </div>
  );
}

const AGREEMENT_STATUSES = new Set(["APPROVED_PENDING_PURCHASE", "VALIDATED", "EXPIRED"]);

export default function SponsorshipReviewPage() {
  const { id } = useParams();
  const location = useLocation();
  const { role, permissions } = useAdminAuth();
  const canInvoice = hasPermission(role, Permission.INVOICE_CREATE, permissions);
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [busy, setBusy] = useState("");
  const [fboNumber, setFboNumber] = useState(defaultFboNumberPrefix);
  const [note, setNote] = useState("");
  // Achat préfacturé à l'approbation : référence, montant et paiement AS400.
  const [invoice, setInvoice] = useState({ factureReference: "", invoiceAmountFcfa: "", paymentMode: "" });
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setRow(await sponsorshipsService.get(id));
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de charger ce parrainage.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (kind, action, success) => {
    setBusy(kind);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(success);
      setNote("");
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Action impossible.");
    } finally {
      setBusy("");
    }
  };

  // Approuver = attribuer le n° FBO + préfacturer l'achat, puis notification
  // fusionnée (parrain et filleul, SMS + email avec la fiche cachetée).
  const approve = async () => {
    setBusy("approve");
    setError("");
    setNotice("");
    try {
      const result = await sponsorshipsService.approve(row.id, {
        recruitFboNumero: fboNumber,
        factureReference: invoice.factureReference,
        invoiceAmountFcfa: Number(invoice.invoiceAmountFcfa),
        paymentMode: invoice.paymentMode || row.purchasePaymentMode,
        deliveryMode: row.purchaseDeliveryMode || "RETRAIT_SITE_FLP",
      });
      if (result.ok === false) setError(result.purchaseError);
      else setNotice(`Parrainage approuvé et achat préfacturé (${result.purchasePreorderNumber}). Parrain et filleul sont notifiés par SMS et email.`);
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Approbation impossible.");
    } finally {
      setBusy("");
    }
  };

  // Ouvre un PDF du parrainage dans un nouvel onglet (imprimer ou enregistrer depuis la visionneuse).
  const openPdf = async (fetchPdf, errorMessage) => {
    const tab = window.open("", "_blank");
    try {
      const response = await fetchPdf(id);
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (tab) tab.close();
      setError(errorMessage);
    }
  };
  // Fiche « Agrément de distribution » cachetée (impression / archive).
  const openAgreement = () => openPdf(sponsorshipsService.agreementPdf, "Impossible d'ouvrir la fiche d'agrément.");
  // Dossier de traitement : fiche + pièce d'identité, à tout statut.
  const openDossier = () => openPdf(sponsorshipsService.dossierPdf, "Impossible de générer le dossier.");

  if (!row) {
    return <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500">{error || "Chargement…"}</div>;
  }

  const status = SPONSORSHIP_STATUS[row.status] || { label: row.status, style: "" };
  const underage = row.recruitAge != null && row.recruitAge < 18;
  const canDecide = row.status === "SUBMITTED";
  const canReject = ["SUBMITTED", "CHANGES_REQUESTED"].includes(row.status);

  return (
    <div className="space-y-5">
      <Link to="/sponsorships" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Parrainages
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{row.lastName} {row.firstNames}</h1>
          <p className="text-sm text-gray-500">
            Parrainé par {row.sponsorNom} ({row.sponsorNumero}) · soumis le {formatDate(row.submittedAt, true)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openDossier}
            title="Fiche de parrainage et pièce d'identité dans un seul PDF, à imprimer ou enregistrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            <Printer className="h-4 w-4" /> Dossier complet (PDF)
          </button>
          {AGREEMENT_STATUSES.has(row.status) && row.recruitFboNumero ? (
            <button type="button" onClick={openAgreement} className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
              <Download className="h-4 w-4" /> Fiche d'agrément (PDF)
            </button>
          ) : null}
          <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${status.style}`}>{status.label}</span>
        </div>
      </div>

      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {row.duplicates?.length ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <div className="font-semibold">Doublon possible : même pièce, même mobile ou même email sur un autre parrainage</div>
          <ul className="mt-1 list-disc pl-5">
            {row.duplicates.map((d) => (
              <li key={d.id}>
                <Link to={`/sponsorships/${d.id}`} className="underline">{d.lastName} {d.firstNames}</Link> · {SPONSORSHIP_STATUS[d.status]?.label || d.status} · pièce {d.idDocumentNumber} · {d.mobile} · {d.email}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Filleul</h2>
            <dl>
              <Row label="Nom" value={row.lastName} />
              <Row label="Prénoms" value={row.firstNames} />
              <Row
                label="Date de naissance"
                value={
                  <span className={underage ? "font-bold text-red-600" : ""}>
                    {formatDate(row.birthDate)} · {row.recruitAge != null ? `${row.recruitAge} ans` : "âge inconnu"}
                    {underage ? " — MINEUR" : ""}
                  </span>
                }
              />
              <Row label="Lieu de naissance" value={row.birthPlace} />
              <Row label="Pièce d'identité" value={`${ID_DOCUMENT_LABELS[row.idDocumentType] || "CNI"} n° ${row.idDocumentNumber}`} />
              {row.passportNumber ? <Row label="N° passeport" value={row.passportNumber} /> : null}
              <Row label="Mobile" value={row.mobile} />
              <Row label="Email" value={row.email} />
              <Row label="Adresse" value={[row.addressArea, row.city, row.homeCountry].filter(Boolean).join(", ")} />
            </dl>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Parrain</h2>
            {row.sponsorVerified === false ? (
              <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                ⚠️ Numéro FBO non reconnu par l'annuaire : nom et grade déclarés par le filleul, à vérifier avant d'approuver.
              </div>
            ) : null}
            <dl>
              <Row label="Nom" value={row.sponsorNom} />
              <Row label="N° FBO / niveau" value={`${row.sponsorNumero} · ${row.sponsorGrade}`} />
              <Row label="Téléphone" value={row.sponsorPhone} />
              <Row label="Attestation" value={row.consentAcceptedAt ? `Acceptée le ${formatDate(row.consentAcceptedAt, true)}` : "—"} />
            </dl>
            {row.consentText ? <p className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">« {row.consentText} »</p> : null}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Achat de parrainage prévu</h2>
            {Array.isArray(row.purchaseItems) && row.purchaseItems.length ? (
              <>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-gray-500">
                    <tr>
                      <th className="py-1">Produit</th>
                      <th className="py-1 text-right">Qté</th>
                      <th className="py-1 text-right">Montant indicatif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {row.purchaseItems.map((line) => (
                      <tr key={line.productId}>
                        <td className="py-1">{line.nom}{line.sku ? <span className="text-xs text-gray-500"> · {line.sku}</span> : null}</td>
                        <td className="py-1 text-right">{line.qty}</td>
                        <td className="py-1 text-right">{Number(line.lineTotalFcfa || 0).toLocaleString("fr-FR")} F</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-2 flex justify-between border-t border-gray-100 pt-2 text-sm font-semibold">
                  <span>Total indicatif (prix Client privilégié)</span>
                  <span>{Number(row.purchaseIndicativeTotalFcfa || 0).toLocaleString("fr-FR")} F</span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {row.purchasePreorder
                    ? `Commande créée à l'approbation : ${row.purchasePreorder.preorderNumber} (${row.purchasePreorder.status === "DRAFT" ? "brouillon, en attente du parrain" : row.purchasePreorder.status}).`
                    : "À l'approbation, ce panier devient la commande préfacturée du filleul (quantités recalées sur le stock)."}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Aucun panier préparé : le parrain composera l'achat après l'approbation.</p>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Pièces d'identité ({row.documents?.length || 0})</h2>
          {row.documents?.length ? (
            row.documents.map((document) => <DocumentViewer key={document.id} sponsorshipId={row.id} document={document} />)
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">Aucune pièce jointe.</div>
          )}
        </div>
      </div>

      {canDecide || canReject ? (
        <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-gray-900">Décision</h2>
          {canDecide ? (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">
                Approuver attribue le n° FBO et préfacture l'achat de parrainage : parrain et filleul reçoivent alors, par SMS et par email,
                le n° FBO, la fiche cachetée et le lien de paiement. Le parrainage est validé au paiement, sans délai.
              </p>
              <div className="flex flex-wrap items-end gap-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">N° FBO attribué dans AS400</span>
                  <input
                    value={fboNumber}
                    onChange={(e) => setFboNumber(formatFboNumber(e.target.value))}
                    placeholder="225-000-123-456"
                    inputMode="numeric"
                    maxLength={15}
                    className="w-56 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Référence AS400 de l'achat</span>
                  <input
                    value={invoice.factureReference}
                    onChange={(e) => setInvoice((v) => ({ ...v, factureReference: e.target.value }))}
                    className="w-44 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Montant AS400 (FCFA)</span>
                  <input
                    type="number"
                    min="0"
                    value={invoice.invoiceAmountFcfa}
                    onChange={(e) => setInvoice((v) => ({ ...v, invoiceAmountFcfa: e.target.value }))}
                    className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Paiement</span>
                  <select
                    value={invoice.paymentMode || row.purchasePaymentMode || ""}
                    onChange={(e) => setInvoice((v) => ({ ...v, paymentMode: e.target.value }))}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="" disabled>Choisir…</option>
                    {PURCHASE_PAYMENT_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}{m.value === row.purchasePaymentMode ? " (choix du parrain)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={
                    Boolean(busy) || underage || !canInvoice || !fboNumber.trim() || !invoice.factureReference.trim() ||
                    !(Number(invoice.invoiceAmountFcfa) > 0) || !(invoice.paymentMode || row.purchasePaymentMode)
                  }
                  onClick={approve}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy === "approve" ? "Approbation…" : "Approuver et préfacturer"}
                </button>
              </div>
              {underage ? <p className="text-sm font-semibold text-red-600">Filleul mineur : approbation impossible.</p> : null}
              {!canInvoice ? <p className="text-sm text-amber-700">L'approbation préfacture l'achat : il faut aussi le droit de facturer.</p> : null}
            </div>
          ) : null}
          <div className="space-y-2">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Complément attendu ou motif du refus (envoyé au parrain)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="flex flex-wrap gap-2">
              {canDecide ? (
                <button
                  type="button"
                  disabled={Boolean(busy) || !note.trim()}
                  onClick={() => run("changes", () => sponsorshipsService.requestChanges(row.id, note), "Complément demandé au parrain.")}
                  className="rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 disabled:opacity-50"
                >
                  Demander un complément
                </button>
              ) : null}
              <button
                type="button"
                disabled={Boolean(busy) || !note.trim()}
                onClick={() => run("reject", () => sponsorshipsService.reject(row.id, note), "Parrainage refusé.")}
                className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
              >
                Refuser
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {row.status === "APPROVED_PENDING_PURCHASE" ? (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
          <div>
            Filleul <strong className="font-mono">{row.recruitFboNumero}</strong> (Client privilégié).{" "}
            {row.purchasePreorder ? (
              <>
                Achat : <Link to={`/orders/${row.purchasePreorder.id}`} className="font-semibold underline">{row.purchasePreorder.preorderNumber}</Link> ({row.purchasePreorder.status}).{" "}
              </>
            ) : null}
            Validation automatique au paiement (contrôle toutes les 5 minutes), sans délai.
            {row.purchaseDeadlineAt ? <> Ancien délai : {formatDate(row.purchaseDeadlineAt, true)}.</> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => run("evaluate", () => sponsorshipsService.evaluate(row.id), "Vérification de l'achat effectuée.")}
              className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800"
            >
              Vérifier l'achat maintenant
            </button>
            <input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Motif d'annulation"
              className="w-48 rounded-lg border border-violet-300 bg-white px-2 py-1.5 text-xs"
            />
            <button
              type="button"
              disabled={Boolean(busy) || !cancelReason.trim()}
              onClick={() => {
                if (!window.confirm("Annuler ce parrainage ? L'achat n'est pas payé ; la commande éventuelle reste à annuler depuis les commandes.")) return;
                run("cancel", () => sponsorshipsService.cancel(row.id, cancelReason), "Parrainage annulé.").then(() => setCancelReason(""));
              }}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
            >
              Annuler le parrainage
            </button>
          </div>
        </section>
      ) : null}

      {row.status === "APPROVED_PENDING_PURCHASE" && canInvoice && (!row.purchasePreorder || ["DRAFT", "CANCELLED"].includes(row.purchasePreorder.status)) ? (
        <section className="space-y-3 rounded-2xl border border-violet-200 bg-white p-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Relancer l'achat</h2>
            <p className="text-xs text-gray-500">
              Aucune commande préfacturée en cours (échec à l'approbation ou commande annulée faute de paiement) : préfacturez de nouveau
              l'achat. Parrain et filleul reçoivent un nouveau lien de paiement.
            </p>
          </div>
          <CounterPurchasePanel sponsorship={row} onDone={load} />
        </section>
      ) : null}

      {row.status === "CANCELLED" && row.cancellationReason ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">Motif de l'annulation : {row.cancellationReason}</div>
      ) : null}
      {row.status === "REJECTED" && row.rejectionReason ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">Motif du refus : {row.rejectionReason}</div>
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-gray-900">Historique</h2>
        <ul className="space-y-1 text-sm">
          {(row.logs || []).map((log) => (
            <li key={log.id} className="flex gap-3">
              <span className="whitespace-nowrap text-xs text-gray-500">{formatDate(log.createdAt, true)}</span>
              <span>{log.note || log.action}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
