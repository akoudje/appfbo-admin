// src/pages/SponsorshipReviewPage.jsx
// Vérification d'un parrainage : pièce d'identité à côté des données saisies,
// âge calculé, doublons possibles ; approuver (n° FBO AS400), demander un
// complément ou refuser.

import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { sponsorshipsService } from "../services/sponsorshipsService";
import { SPONSORSHIP_STATUS } from "../components/sponsorships/sponsorshipStatus";
import CounterPurchasePanel from "../components/sponsorships/CounterPurchasePanel";
import useAdminAuth from "../hooks/useAdminAuth";
import { hasPermission, Permission } from "../auth/permissions";

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
  const { role, permissions } = useAdminAuth();
  const canInvoice = hasPermission(role, Permission.INVOICE_CREATE, permissions);
  const [row, setRow] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [fboNumber, setFboNumber] = useState("");
  const [note, setNote] = useState("");

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

  // Fiche « Agrément de distribution » cachetée (impression / archive).
  const openAgreement = async () => {
    const tab = window.open("", "_blank");
    try {
      const response = await sponsorshipsService.agreementPdf(id);
      const url = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
      if (tab) tab.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (tab) tab.close();
      setError("Impossible d'ouvrir la fiche d'agrément.");
    }
  };

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
        <div className="flex items-center gap-2">
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
              <Row label="Adresse" value={[row.addressArea, row.city, row.postalBox && `BP ${row.postalBox}`, row.homeCountry].filter(Boolean).join(", ")} />
              <Row label="Situation de famille" value={[row.maritalStatus, row.childrenCount != null ? `${row.childrenCount} enfant(s)` : null].filter(Boolean).join(" · ")} />
              <Row label="N° RIB" value={row.bankRib} />
            </dl>
          </section>

          {row.spouseLastName || row.spouseFirstNames ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Conjoint</h2>
              <dl>
                <Row label="Nom et prénoms" value={`${row.spouseLastName || ""} ${row.spouseFirstNames || ""}`.trim()} />
                <Row label="Naissance" value={[row.spouseBirthDate && formatDate(row.spouseBirthDate), row.spouseBirthPlace].filter(Boolean).join(" à ")} />
              </dl>
            </section>
          ) : null}

          {row.tradeRegisterNumber || row.profession ? (
            <section className="rounded-2xl border border-gray-200 bg-white p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-900">Activité commerciale</h2>
              <dl>
                <Row label="Profession / secteur" value={[row.profession, row.businessSector].filter(Boolean).join(" · ")} />
                <Row label="Registre de commerce" value={[row.tradeRegisterNumber, row.tradeRegisterDate && formatDate(row.tradeRegisterDate), row.tradeRegisterPlace].filter(Boolean).join(" · ")} />
                <Row label="TVA / ASDI" value={`${row.vatSubject == null ? "—" : row.vatSubject ? "Soumis" : "Non soumis"} / ${row.asdiSubject == null ? "—" : row.asdiSubject ? "Soumis" : "Non soumis"}`} />
              </dl>
            </section>
          ) : null}

          <section className="rounded-2xl border border-gray-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Parrain</h2>
            <dl>
              <Row label="Nom" value={row.sponsorNom} />
              <Row label="N° FBO / niveau" value={`${row.sponsorNumero} · ${row.sponsorGrade}`} />
              <Row label="Téléphone" value={row.sponsorPhone} />
              <Row label="Fait à" value={row.sponsorCity} />
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
                    : "À l'approbation, ce panier deviendra une commande brouillon du filleul (quantités recalées sur le stock) ; le parrain choisira le paiement et la livraison."}
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
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium text-gray-700">N° FBO attribué dans AS400</span>
                <input
                  value={fboNumber}
                  onChange={(e) => setFboNumber(e.target.value)}
                  placeholder="225-000-123-456"
                  className="w-56 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
                />
              </label>
              <button
                type="button"
                disabled={Boolean(busy) || underage || !fboNumber.trim()}
                onClick={() => run("approve", () => sponsorshipsService.approve(row.id, fboNumber), "Parrainage approuvé : le filleul peut commander en Client privilégié.")}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy === "approve" ? "Approbation…" : "Approuver"}
              </button>
              {underage ? <span className="text-sm font-semibold text-red-600">Filleul mineur : approbation impossible.</span> : null}
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
            Filleul <strong className="font-mono">{row.recruitFboNumero}</strong> (Client privilégié). Commande payée d'au moins{" "}
            <strong>{Number(row.minPurchaseFcfa || 0).toLocaleString("fr-FR")} FCFA</strong> attendue avant le{" "}
            <strong>{formatDate(row.purchaseDeadlineAt, true)}</strong>. Vérification automatique toutes les 5 minutes.
          </div>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => run("evaluate", () => sponsorshipsService.evaluate(row.id), "Vérification de l'achat effectuée.")}
            className="rounded-lg border border-violet-300 bg-white px-3 py-1.5 text-xs font-semibold text-violet-800"
          >
            Vérifier l'achat maintenant
          </button>
        </section>
      ) : null}

      {row.status === "APPROVED_PENDING_PURCHASE" && canInvoice ? (
        <section className="space-y-3 rounded-2xl border border-violet-200 bg-white p-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Faire l'achat maintenant (comptoir)</h2>
            <p className="text-xs text-gray-500">Facultatif : préfacturez directement l'achat de parrainage avec la référence et le montant AS400. Sinon, le parrain le fait depuis son espace.</p>
          </div>
          <CounterPurchasePanel sponsorship={row} onDone={load} />
        </section>
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
