import { useEffect, useMemo, useState } from "react";
import { Download, FileCheck2, Printer, Search, ShieldCheck, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { fboDocumentsService } from "../services/fboDocumentsService";

const DEFAULT_SIGNATORY = {
  name: "AHOU YAO EPSE KOFFI",
  title: "DIRECTRICE DES OPERATIONS",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function inputClass() {
  return "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";
}

function Field({ label, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function documentPublicVerifyUrl(doc) {
  const path = doc?.verifyUrl || `/verify/fbo-document/${encodeURIComponent(doc?.verificationToken || "")}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function safeFileName(value) {
  return String(value || "document")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function dataUrlToBytes(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function createPdfBlobFromCanvas(canvas) {
  const jpegDataUrl = canvas.toDataURL("image/jpeg", 0.94);
  const jpegBytes = dataUrlToBytes(jpegDataUrl);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const imageRatio = canvas.width / canvas.height;
  let drawWidth = pageWidth;
  let drawHeight = pageWidth / imageRatio;
  let drawX = 0;
  let drawY = (pageHeight - drawHeight) / 2;
  if (drawHeight > pageHeight) {
    drawHeight = pageHeight;
    drawWidth = pageHeight * imageRatio;
    drawX = (pageWidth - drawWidth) / 2;
    drawY = 0;
  }

  const header = "%PDF-1.4\n";
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
    "\nendstream\nendobj\n",
  ];
  const content = `q\n${drawWidth} 0 0 ${drawHeight} ${drawX} ${drawY} cm\n/Im0 Do\nQ\n`;
  objects.push(`5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`);

  const parts = [header];
  const offsets = [0];
  let length = header.length;
  for (const object of objects) {
    offsets.push(length);
    if (object.includes("stream\n") && object.includes("/Im0")) {
      const [before, after] = object.split("stream\n");
      parts.push(before, "stream\n", jpegBytes, after);
      length += before.length + "stream\n".length + jpegBytes.length + after.length;
    } else {
      parts.push(object);
      length += object.length;
    }
  }
  const xrefOffset = length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  parts.push(trailer);
  return new Blob(parts, { type: "application/pdf" });
}

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  lines.forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

async function downloadActivityCertificatePdf(document) {
  if (!document) return;
  const [logo, qr] = await Promise.all([
    loadImage("/logo-forever.png"),
    QRCode.toDataURL(documentPublicVerifyUrl(document), {
      margin: 1,
      width: 160,
      errorCorrectionLevel: "M",
    }).then(loadImage),
  ]);

  const canvas = window.document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#111111";
  if (logo) {
    const logoWidth = 270;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    ctx.drawImage(logo, (canvas.width - logoWidth) / 2, 72, logoWidth, logoHeight);
  } else {
    ctx.font = "44px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("FOREVER", canvas.width / 2, 118);
  }

  ctx.strokeStyle = "#f4c430";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(170, 170);
  ctx.lineTo(canvas.width - 170, 170);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "bold 34px Georgia, serif";
  ctx.fillText("ATTESTATION D'ACTIVITE", canvas.width / 2, 270);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111111";
  ctx.beginPath();
  ctx.moveTo(430, 282);
  ctx.lineTo(810, 282);
  ctx.stroke();

  ctx.textAlign = "left";
  ctx.font = "28px Georgia, serif";
  let y = 430;
  const x = 145;
  const maxWidth = 950;
  const lineHeight = 42;
  ctx.fillText("Monsieur / Madame,", x, y);
  y += 76;

  const paragraphs = [
    `Je, soussigné, Madame ${document.signatoryName}, ${String(document.signatoryTitle || "").toLowerCase()} de Forever Living Products Côte d'Ivoire (FLP CI), atteste que Monsieur / Madame ${document.fboFullName} est un Forever Business owner des produits de notre société, enregistrée sous le numéro ${document.fboNumber}.`,
    "Créée en 1978, Forever Living Products International (FLPI) est une société internationale présente dans plus de 160 pays et compte plusieurs millions de distributeurs dans le monde.",
    "Premier producteur mondial d'Aloe Vera et de Produits de la Ruche, FLPI commercialise une gamme complète de produits de bien-être et de beauté comprenant des compléments alimentaires, du maquillage et des soins de la peau.",
    `Monsieur / Madame ${document.fboFullName} est autorisé à vendre les produits Forever partout où elle trouvera des acheteurs et clients potentiels et sa rémunération est établie en fonction du flux de son activité et de ses ventes.`,
    "En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.",
  ];
  for (const paragraph of paragraphs) {
    y = drawWrappedText(ctx, paragraph, x, y, maxWidth, lineHeight) + 34;
  }

  ctx.textAlign = "right";
  ctx.fillText(`Fait à ${document.city}, le ${formatDate(document.issuedAt)}`, canvas.width - 150, y + 34);
  y += 210;
  ctx.font = "bold 28px Georgia, serif";
  ctx.fillText(String(document.signatoryName || "").toUpperCase(), canvas.width - 160, y);
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillText(String(document.signatoryTitle || "").toUpperCase(), canvas.width - 160, y + 38);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(canvas.width - 515, y + 8);
  ctx.lineTo(canvas.width - 160, y + 8);
  ctx.moveTo(canvas.width - 515, y + 46);
  ctx.lineTo(canvas.width - 160, y + 46);
  ctx.stroke();

  ctx.strokeStyle = "#dddddd";
  ctx.beginPath();
  ctx.moveTo(145, 1560);
  ctx.lineTo(canvas.width - 145, 1560);
  ctx.stroke();
  ctx.font = "18px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillStyle = "#666666";
  ctx.fillText(`Document : ${document.documentNumber}`, 145, 1610);
  ctx.fillText(`Vérification : ${documentPublicVerifyUrl(document)}`, 145, 1640);
  if (qr) {
    ctx.drawImage(qr, canvas.width - 300, 1580, 130, 130);
    ctx.textAlign = "center";
    ctx.font = "bold 16px Arial, sans-serif";
    ctx.fillText("Verifier", canvas.width - 235, 1725);
  }

  const blob = createPdfBlobFromCanvas(canvas);
  const link = window.document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `attestation-fbo-${safeFileName(document.fboNumber)}-${safeFileName(document.documentNumber)}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function ActivityCertificate({ document }) {
  const [qrDataUrl, setQrDataUrl] = useState("");

  useEffect(() => {
    let mounted = true;
    QRCode.toDataURL(documentPublicVerifyUrl(document), {
      margin: 1,
      width: 110,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (mounted) setQrDataUrl(url);
      })
      .catch(() => {
        if (mounted) setQrDataUrl("");
      });
    return () => {
      mounted = false;
    };
  }, [document]);

  if (!document) return null;
  return (
    <article className="relative mx-auto min-h-[1050px] max-w-[760px] overflow-hidden bg-white px-16 py-16 text-[18px] leading-7 text-black shadow-sm print:shadow-none">
      <div className="pointer-events-none absolute inset-x-0 top-[430px] text-center text-[92px] font-black tracking-[0.2em] text-gray-100/70">
        FOREVER
      </div>
      <header className="relative mb-16 text-center">
        <img src="/logo-forever.png" alt="Forever" className="mx-auto h-10 w-auto object-contain" />
        <div className="mx-auto mt-5 h-1 w-56 bg-[#FFC600]" />
        <div className="mt-4 text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
          Document officiel FBO Service
        </div>
      </header>

      <div className="relative mb-14 text-center">
        <h1 className="text-2xl font-black uppercase underline">Attestation d'activité</h1>
        <div className="mt-3 font-mono text-xs font-bold text-gray-500">{document.documentNumber}</div>
      </div>

      <div className="relative">
      <p className="mb-7">Monsieur / Madame,</p>

      <p className="mb-7 text-justify">
        Je, soussigné, Madame <strong>{document.signatoryName}</strong>, {document.signatoryTitle.toLowerCase()} de
        Forever Living Products Côte d'Ivoire (FLP CI), atteste que Monsieur / Madame{" "}
        <strong>{document.fboFullName}</strong> est un Forever Business owner des produits de notre société,
        enregistrée sous le numéro <strong>{document.fboNumber}</strong>.
      </p>

      <p className="mb-7 text-justify">
        Créée en 1978, Forever Living Products International (FLPI) est une société internationale
        présente dans plus de 160 pays et compte plusieurs millions de distributeurs dans le monde.
      </p>

      <p className="mb-7 text-justify">
        Premier producteur mondial d'Aloe Vera et de Produits de la Ruche, FLPI commercialise une
        gamme complète de produits de bien-être et de beauté comprenant des compléments alimentaires,
        du maquillage et des soins de la peau.
      </p>

      <p className="mb-7 text-justify">
        Monsieur / Madame <strong>{document.fboFullName}</strong> est autorisé à vendre les produits
        Forever partout où elle trouvera des acheteurs et clients potentiels et sa rémunération est
        établie en fonction du flux de son activité et de ses ventes.
      </p>

      <p className="mb-16 text-justify">
        En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit.
      </p>

      <div className="mb-20 text-right">
        Fait à {document.city}, le {formatDate(document.issuedAt)}
      </div>

      <div className="text-right">
        <div className="inline-block min-w-[260px] border-t border-dashed border-gray-300 pt-8 text-center">
          <div className="font-black uppercase underline">{document.signatoryName}</div>
          <div className="font-black uppercase underline">{document.signatoryTitle}</div>
          <div className="mt-4 text-xs font-semibold uppercase text-gray-400">Signature et cachet</div>
        </div>
      </div>
      </div>

      <div className="mt-20 flex items-end justify-between gap-6 border-t border-gray-300 pt-4 text-xs leading-5 text-gray-600">
        <div>
          <div>Document : {document.documentNumber}</div>
          <div>Vérification : {documentPublicVerifyUrl(document)}</div>
        </div>
        {qrDataUrl ? (
          <div className="text-center">
            <img src={qrDataUrl} alt="QR code de vérification" className="h-[92px] w-[92px]" />
            <div className="mt-1 font-semibold">Vérifier</div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function FboDocumentsPage() {
  const [query, setQuery] = useState("");
  const [fbos, setFbos] = useState([]);
  const [selectedFbo, setSelectedFbo] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [city, setCity] = useState("Abidjan");
  const [purpose, setPurpose] = useState("");
  // Le signataire est imposé côté serveur (liste des personnes habilitées) ;
  // ces valeurs ne sont donc pas éditables ici.
  const signatoryName = DEFAULT_SIGNATORY.name;
  const signatoryTitle = DEFAULT_SIGNATORY.title;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreate = useMemo(() => selectedFbo && city.trim() && signatoryName.trim() && signatoryTitle.trim(), [
    selectedFbo,
    city,
    signatoryName,
    signatoryTitle,
  ]);

  async function loadDocuments(params = {}) {
    const response = await fboDocumentsService.listDocuments(params);
    setDocuments(response?.data || []);
  }

  useEffect(() => {
    loadDocuments().catch(() => {});
  }, []);

  async function searchFbos(event) {
    event.preventDefault();
    if (query.trim().length < 2) return;
    try {
      setLoading(true);
      setError("");
      const response = await fboDocumentsService.searchFbos(query);
      setFbos(response?.data || []);
    } catch (err) {
      setError(err?.response?.data?.message || "Recherche FBO impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function createDocument() {
    if (!canCreate) return;
    try {
      setLoading(true);
      setError("");
      setMessage("");
      const doc = await fboDocumentsService.createDocument({
        fboId: selectedFbo.id,
        city,
        purpose,
        signatoryName,
        signatoryTitle,
      });
      setCurrentDocument(doc);
      setMessage(`Attestation générée : ${doc.documentNumber}`);
      await loadDocuments({ fboId: selectedFbo.id });
    } catch (err) {
      setError(err?.response?.data?.message || "Génération impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function cancelDocument(doc) {
    const reason = window.prompt(`Motif d'annulation du document ${doc.documentNumber} ?`);
    if (reason === null) return;
    try {
      setLoading(true);
      setError("");
      await fboDocumentsService.cancelDocument(doc.id, { reason });
      await loadDocuments(selectedFbo?.id ? { fboId: selectedFbo.id } : {});
      if (currentDocument?.id === doc.id) setCurrentDocument(null);
    } catch (err) {
      setError(err?.response?.data?.message || "Annulation impossible.");
    } finally {
      setLoading(false);
    }
  }

  function printDocument() {
    window.print();
  }

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #fbo-document-print, #fbo-document-print * { visibility: visible; }
          #fbo-document-print { position: absolute; inset: 0; background: white; }
        }
      `}</style>

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-600">Documents FBO</p>
          <h1 className="text-2xl font-black text-gray-950">Attestations d'activité</h1>
          <p className="mt-1 text-sm text-gray-500">
            Générez, imprimez et tracez les attestations délivrées aux FBO.
          </p>
        </div>
        {currentDocument ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadActivityCertificatePdf(currentDocument)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FFC600] px-4 py-2 text-sm font-black text-black"
            >
              <Download className="h-4 w-4" />
              Télécharger PDF
            </button>
            <button
              type="button"
              onClick={printDocument}
              className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-4 py-2 text-sm font-bold text-white"
            >
              <Printer className="h-4 w-4" />
              Imprimer
            </button>
          </div>
        ) : null}
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700 print:hidden">{error}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700 print:hidden">{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="space-y-4 print:hidden">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <form onSubmit={searchFbos} className="space-y-3">
              <Field label="Rechercher un FBO">
                <div className="flex gap-2">
                  <input
                    className={inputClass()}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Nom, numéro FBO, email"
                  />
                  <button type="submit" disabled={loading} className="rounded-lg bg-gray-950 px-4 text-white">
                    <Search className="h-4 w-4" />
                  </button>
                </div>
              </Field>
            </form>

            <div className="mt-4 space-y-2">
              {fbos.map((fbo) => (
                <button
                  key={fbo.id}
                  type="button"
                  onClick={() => {
                    setSelectedFbo(fbo);
                    loadDocuments({ fboId: fbo.id }).catch(() => {});
                  }}
                  className={`w-full rounded-xl border p-3 text-left ${
                    selectedFbo?.id === fbo.id ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="font-bold text-gray-950">{fbo.nomComplet}</div>
                  <div className="mt-1 text-sm text-gray-500">FBO {fbo.numeroFbo} · {fbo.grade}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-gray-950">Créer une attestation</h2>
            <div className="mt-4 space-y-3">
              <Field label="FBO sélectionné">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold">
                  {selectedFbo ? `${selectedFbo.nomComplet} (${selectedFbo.numeroFbo})` : "Aucun FBO sélectionné"}
                </div>
              </Field>
              <Field label="Ville d'émission">
                <input className={inputClass()} value={city} onChange={(event) => setCity(event.target.value)} />
              </Field>
              <Field label="Motif interne">
                <textarea className={inputClass()} rows={2} value={purpose} onChange={(event) => setPurpose(event.target.value)} />
              </Field>
              <Field label="Signataire">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold">
                  {signatoryName}
                </div>
              </Field>
              <Field label="Fonction du signataire">
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm font-semibold">
                  {signatoryTitle}
                </div>
              </Field>
              <button
                type="button"
                onClick={createDocument}
                disabled={loading || !canCreate}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFC600] px-4 py-3 text-sm font-black text-black disabled:opacity-50"
              >
                <FileCheck2 className="h-4 w-4" />
                Générer l'attestation
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="font-black text-gray-950">Historique</h2>
            <div className="mt-3 space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-xl border border-gray-200 p-3">
                  <button type="button" onClick={() => setCurrentDocument(doc)} className="block w-full text-left">
                    <div className="font-mono text-xs font-bold text-gray-500">{doc.documentNumber}</div>
                    <div className="mt-1 font-bold">{doc.fboFullName}</div>
                    <div className="text-sm text-gray-500">{formatDate(doc.issuedAt)} · {doc.status}</div>
                  </button>
                  {doc.status === "ISSUED" ? (
                    <button
                      type="button"
                      onClick={() => cancelDocument(doc)}
                      className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-red-700"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Annuler
                    </button>
                  ) : null}
                </div>
              ))}
              {!documents.length ? <div className="text-sm text-gray-500">Aucun document.</div> : null}
            </div>
          </div>
        </section>

        <section id="fbo-document-print" className="rounded-2xl border border-gray-200 bg-gray-100 p-4 print:border-0 print:bg-white print:p-0">
          {currentDocument ? (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-sm print:hidden">
                <div className="inline-flex items-center gap-2 font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Vérifiable par QR/lien public
                </div>
                <a href={documentPublicVerifyUrl(currentDocument)} target="_blank" rel="noreferrer" className="font-mono text-xs text-gray-500 underline">
                  {currentDocument.documentNumber}
                </a>
              </div>
              <ActivityCertificate document={currentDocument} />
            </>
          ) : (
            <div className="flex min-h-[520px] items-center justify-center rounded-xl bg-white text-sm text-gray-500">
              Sélectionnez ou générez une attestation pour afficher l'aperçu.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
