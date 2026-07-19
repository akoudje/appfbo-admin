import { useEffect, useMemo, useState } from "react";
import { Download, FileCheck2, Printer, Search, ShieldCheck, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { fboDocumentsService } from "../services/fboDocumentsService";

const DEFAULT_SIGNATORY = {
  name: "AHOU YAO EPSE KOFFI",
  title: "DIRECTRICE DES OPERATIONS",
  civility: "MME",
};

function signatoryPhrase(civility) {
  return String(civility || "").trim().toUpperCase() === "M"
    ? { honorific: "Monsieur", participle: "soussigné" }
    : { honorific: "Madame", participle: "soussignée" };
}

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

// La page de vérification publique (/verify/fbo-document/:token) n'existe
// que dans l'app frontend client, pas dans l'admin. Utiliser
// window.location.origin ici pointerait vers le domaine admin (qui exige
// une connexion et n'a pas cette route) : le lien/QR scanné par un tiers
// externe atterrirait sur l'écran de login admin, donc "on ne voit rien".
function publicFrontendOrigin() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (origin.includes("517") || origin.includes("localhost")) {
    return "http://127.0.0.1:5173";
  }
  return "https://forevercivstore.com";
}

function documentPublicVerifyUrl(doc) {
  const path = doc?.verifyUrl || `/verify/fbo-document/${encodeURIComponent(doc?.verificationToken || "")}`;
  return `${publicFrontendOrigin()}${path}`;
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

  const content = `q\n${drawWidth} 0 0 ${drawHeight} ${drawX} ${drawY} cm\n/Im0 Do\nQ\n`;

  // Chaque entrée correspond à EXACTEMENT un objet PDF (1 à 5), avec un seul
  // offset de xref chacun. L'objet 4 (image) est un tableau [avant, bytes,
  // après] car il contient le flux binaire JPEG, qu'on ne peut pas
  // concaténer comme du texte. Avant, le texte de fermeture du flux image
  // ("endstream\nendobj") était une entrée séparée du tableau, ce qui
  // ajoutait une fausse entrée dans la table xref, décalait le numéro
  // d'objet du flux de contenu (5 0 obj) et rendait le PDF illisible (page
  // blanche) pour la plupart des lecteurs.
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`,
    [
      `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`,
      jpegBytes,
      "\nendstream\nendobj\n",
    ],
    `5 0 obj\n<< /Length ${content.length} >>\nstream\n${content}endstream\nendobj\n`,
  ];

  const header = "%PDF-1.4\n";
  const parts = [header];
  const offsets = [0];
  let length = header.length;
  for (const object of objects) {
    offsets.push(length);
    if (Array.isArray(object)) {
      const [before, bytes, after] = object;
      parts.push(before, bytes, after);
      length += before.length + bytes.length + after.length;
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

// Dessine un paragraphe pouvant mélanger texte normal et texte en gras
// (noms propres, numéro FBO). `segments` est une liste de { text, bold }.
function drawWrappedRichText(ctx, segments, x, y, maxWidth, lineHeight, baseFont, boldFont) {
  const words = [];
  for (const segment of segments) {
    for (const word of String(segment.text || "").split(/\s+/).filter(Boolean)) {
      words.push({ text: word, bold: Boolean(segment.bold) });
    }
  }

  function measureLine(lineWords) {
    let width = 0;
    lineWords.forEach((word, index) => {
      ctx.font = word.bold ? boldFont : baseFont;
      width += ctx.measureText(word.text).width;
      if (index < lineWords.length - 1) {
        ctx.font = baseFont;
        width += ctx.measureText(" ").width;
      }
    });
    return width;
  }

  function drawLine(lineWords, lineY) {
    let cursorX = x;
    ctx.textAlign = "left";
    lineWords.forEach((word, index) => {
      ctx.font = word.bold ? boldFont : baseFont;
      ctx.fillText(word.text, cursorX, lineY);
      cursorX += ctx.measureText(word.text).width;
      if (index < lineWords.length - 1) {
        ctx.font = baseFont;
        cursorX += ctx.measureText(" ").width;
      }
    });
  }

  const lines = [];
  let line = [];
  for (const word of words) {
    const testLine = [...line, word];
    if (measureLine(testLine) > maxWidth && line.length) {
      lines.push(line);
      line = [word];
    } else {
      line = testLine;
    }
  }
  if (line.length) lines.push(line);

  lines.forEach((lineWords, index) => drawLine(lineWords, y + index * lineHeight));
  return y + lines.length * lineHeight;
}

async function downloadActivityCertificatePdf(document) {
  if (!document) return;
  // Pas de logo/filet jaune: le document est imprimé sur papier à entête
  // déjà floqué au nom de Forever.
  const qr = await QRCode.toDataURL(documentPublicVerifyUrl(document), {
    margin: 1,
    width: 160,
    errorCorrectionLevel: "M",
  }).then(loadImage);

  const canvas = window.document.createElement("canvas");
  canvas.width = 1240;
  canvas.height = 1754;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";

  ctx.textAlign = "center";
  ctx.font = "bold 34px Georgia, serif";
  ctx.fillText("ATTESTATION D'ACTIVITE", canvas.width / 2, 180);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111111";
  ctx.beginPath();
  ctx.moveTo(430, 192);
  ctx.lineTo(810, 192);
  ctx.stroke();

  const baseFont = "28px Georgia, serif";
  const boldFont = "bold 28px Georgia, serif";
  ctx.textAlign = "left";
  ctx.font = baseFont;
  let y = 300;
  const x = 145;
  const maxWidth = 950;
  const lineHeight = 42;
  ctx.fillText("Monsieur / Madame,", x, y);
  y += 76;

  const { honorific, participle } = signatoryPhrase(document.signatoryCivility);
  const signatoryTitleLower = String(document.signatoryTitle || "").toLowerCase();
  // Les noms propres et le numéro FBO ressortent en gras dans le corps du
  // texte ; le reste du paragraphe est du texte normal.
  const paragraphs = [
    [
      { text: `Je, ${participle}, ${honorific} ` },
      { text: document.signatoryName, bold: true },
      { text: `, ${signatoryTitleLower} de Forever Living Products Côte d'Ivoire (FLP CI), atteste que Monsieur / Madame ` },
      { text: document.fboFullName, bold: true },
      { text: " est un Forever Business owner des produits de notre société, enregistrée sous le numéro " },
      { text: document.fboNumber, bold: true },
      { text: "." },
    ],
    [{ text: "Créée en 1978, Forever Living Products International (FLPI) est une société internationale présente dans plus de 160 pays et compte plusieurs millions de distributeurs dans le monde." }],
    [{ text: "Premier producteur mondial d'Aloe Vera et de Produits de la Ruche, FLPI commercialise une gamme complète de produits de bien-être et de beauté comprenant des compléments alimentaires, du maquillage et des soins de la peau." }],
    [
      { text: "Monsieur / Madame " },
      { text: document.fboFullName, bold: true },
      { text: " est autorisé à vendre les produits Forever partout où elle trouvera des acheteurs et clients potentiels et sa rémunération est établie en fonction du flux de son activité et de ses ventes." },
    ],
    [{ text: "En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit." }],
  ];
  for (const paragraph of paragraphs) {
    y = drawWrappedRichText(ctx, paragraph, x, y, maxWidth, lineHeight, baseFont, boldFont) + 34;
  }

  // "Fait à..." et le QR code à gauche ; le nom/titre du signataire et
  // l'espace de signature/cachet à droite, sur la même ligne. Tout est
  // positionné à partir de `y` (fin réelle du texte), jamais à une
  // coordonnée absolue fixe.
  ctx.textAlign = "left";
  ctx.font = baseFont;
  ctx.fillText(`Fait à ${document.city}, le ${formatDate(document.issuedAt)}`, x, y + 34);
  y += 70;

  if (qr) {
    ctx.drawImage(qr, x, y, 130, 130);
  }

  ctx.textAlign = "right";
  ctx.font = boldFont;
  ctx.fillText(String(document.signatoryName || "").toUpperCase(), canvas.width - 160, y + 40);
  ctx.font = "bold 22px Georgia, serif";
  ctx.fillText(String(document.signatoryTitle || "").toUpperCase(), canvas.width - 160, y + 78);
  ctx.strokeStyle = "#111111";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(canvas.width - 515, y + 50);
  ctx.lineTo(canvas.width - 160, y + 50);
  ctx.moveTo(canvas.width - 515, y + 88);
  ctx.lineTo(canvas.width - 160, y + 88);
  ctx.stroke();

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
  const { honorific, participle } = signatoryPhrase(document.signatoryCivility);
  return (
    <article className="relative mx-auto min-h-[1050px] max-w-[760px] overflow-hidden bg-white px-16 py-16 text-[18px] leading-7 text-black shadow-sm print:shadow-none">
      <div className="pointer-events-none absolute inset-x-0 top-[430px] text-center text-[92px] font-black tracking-[0.2em] text-gray-100/70">
        FOREVER
      </div>
      <header className="relative mb-10 text-center">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
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
        Je, {participle}, {honorific} <strong>{document.signatoryName}</strong>, {document.signatoryTitle.toLowerCase()} de
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

      <div className="flex items-end justify-between gap-6">
        <div className="text-left">
          <div className="mb-3">Fait à {document.city}, le {formatDate(document.issuedAt)}</div>
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code de vérification" className="h-[92px] w-[92px]" />
          ) : null}
        </div>

        <div className="text-right">
          <div className="inline-block min-w-[260px] border-t border-dashed border-gray-300 pt-8 text-center">
            <div className="font-black uppercase underline">{document.signatoryName}</div>
            <div className="font-black uppercase underline">{document.signatoryTitle}</div>
            <div className="mt-4 text-xs font-semibold uppercase text-gray-400">Signature et cachet</div>
          </div>
        </div>
      </div>
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
  // La liste des signataires habilités vient du serveur (source de vérité
  // pour la validation) ; on ne propose ici que ce qu'il autorisera.
  const [signatories, setSignatories] = useState([DEFAULT_SIGNATORY]);
  const [signatoryIndex, setSignatoryIndex] = useState(0);
  const selectedSignatory = signatories[signatoryIndex] || signatories[0] || DEFAULT_SIGNATORY;
  const signatoryName = selectedSignatory.name;
  const signatoryTitle = selectedSignatory.title;
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
    fboDocumentsService
      .listSignatories()
      .then((response) => {
        const list = response?.data || [];
        if (list.length) setSignatories(list);
      })
      .catch(() => {});
  }, []);

  async function searchFbos(event) {
    event.preventDefault();
    setFbos([]);
    setSelectedFbo(null);
    setError("");
    setMessage("");

    const digits = query.replace(/\D/g, "");
    if (digits.length !== 12) {
      setError("Saisissez le numéro FBO complet (12 chiffres).");
      return;
    }

    try {
      setLoading(true);
      // Les informations FBO (nom, grade...) viennent exclusivement de FBO
      // Service : cette recherche interroge le registre officiel en temps
      // réel, elle ne fait pas de recherche floue par nom localement.
      const response = await fboDocumentsService.searchFbos(query);
      setFbos(response?.data || []);
    } catch (err) {
      setFbos([]);
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
        numeroFbo: selectedFbo.numeroFbo,
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
              <Field label="Numéro FBO complet">
                <div className="flex gap-2">
                  <input
                    className={inputClass()}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="12 chiffres, avec ou sans tirets"
                    inputMode="numeric"
                  />
                  <button type="submit" disabled={loading} className="rounded-lg bg-gray-950 px-4 text-white">
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-400">
                  Recherche directement dans FBO Service (registre officiel).
                </span>
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
                  {fbo.activeDocument ? (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                      <FileCheck2 className="h-3.5 w-3.5" />
                      Attestation déjà émise le {formatDate(fbo.activeDocument.issuedAt)}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </div>

          {selectedFbo?.activeDocument ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
              <div className="flex items-center gap-2 font-black text-emerald-800">
                <FileCheck2 className="h-4 w-4" />
                Attestation déjà existante
              </div>
              <p className="mt-2 text-sm text-emerald-800">
                {selectedFbo.nomComplet} a déjà une attestation valide (
                {selectedFbo.activeDocument.documentNumber}), émise le{" "}
                {formatDate(selectedFbo.activeDocument.issuedAt)}. Inutile d'en régénérer une, sauf besoin réel.
              </p>
              <button
                type="button"
                onClick={() => setCurrentDocument(selectedFbo.activeDocument)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
              >
                Afficher cette attestation
              </button>
            </div>
          ) : null}

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
                <select
                  className={inputClass()}
                  value={signatoryIndex}
                  onChange={(event) => setSignatoryIndex(Number(event.target.value))}
                >
                  {signatories.map((signatory, index) => (
                    <option key={`${signatory.name}-${signatory.title}`} value={index}>
                      {signatory.name} — {signatory.title}
                    </option>
                  ))}
                </select>
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
