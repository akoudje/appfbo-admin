import QRCode from "qrcode";

export function escapeLabelText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

export function parcelFormatLayout(format = "label", orientation = "portrait") {
  const formats = { label: [100, 150], a4: [100, 150], thermal58: [58, 90], thermal80: [80, 100] };
  if (!formats[format] || !["portrait", "landscape"].includes(orientation)) throw new Error("Format ou orientation d’étiquette invalide.");
  const [width, height] = formats[format];
  const landscape = orientation === "landscape";
  const compact = format.startsWith("thermal");
  const pageWidth = format === "a4" ? 210 : width;
  const pageHeight = format === "a4" ? 297 : height;
  const css = `@page{size:${pageWidth}mm ${pageHeight}mm;margin:${format === "a4" ? "10mm" : "0"}}
  .sheet{width:${width}mm;height:${height}mm;margin:15px auto;break-after:page;page-break-after:always;background:white;overflow:hidden}
  .sheet:last-child{break-after:auto;page-break-after:auto}
  .label{margin:0;width:${landscape ? height : width}mm;height:${landscape ? width : height}mm;break-after:auto;page-break-after:auto;transform-origin:top left;transform:${landscape ? "translateX(" + width + "mm) rotate(90deg)" : "none"}}
  ${compact ? ".label{padding:5mm;gap:2mm}.brand{font-size:12px;letter-spacing:2px}.mode{font-size:12px;padding:1.5mm;border-width:1px}.reference{font-size:14px}.small{font-size:8px;letter-spacing:0;margin-bottom:0.5mm}.name{font-size:12px}.fbo{font-size:10px;margin-top:1mm}.destination-text{font-size:10px;line-height:1.2}.command{font-size:8px}.bottom{gap:2mm;padding-top:1.5mm}.qr{width:20mm;height:20mm}.number{font-size:12px}.caption{display:none}" : ""}
  ${landscape ? ".label{display:grid;grid-template-columns:minmax(0,1fr) " + (compact ? 22 : 30) + "mm;grid-template-rows:auto auto auto minmax(0,1fr) auto;gap:" + (compact ? "1.5" : "3") + "mm}.brand{grid-column:1;grid-row:1}.mode{grid-column:2;grid-row:1;font-size:" + (compact ? 9 : 12) + "px;padding:1mm;align-self:start}.label>div:nth-child(3){grid-column:1;grid-row:2}.label>div:nth-child(4){grid-column:1;grid-row:3}.label>div:nth-child(5){grid-column:1;grid-row:4}.command{grid-column:1;grid-row:5}.bottom{grid-column:2;grid-row:2 / 6;display:flex;flex-direction:column;justify-content:center;align-items:center;border-top:0;padding:0;margin:0}.caption{display:none}" : ""}
  @media print{.sheet{margin:0}.label{box-shadow:none}}`;
  return { css, width: Math.round(pageWidth * 72 / 25.4), height: Math.round(pageHeight * 72 / 25.4) };
}

export function parcelLabelHtml(order, qrSvg) {
  const text = escapeLabelText;
  const delivery = order.deliveryMode === "LIVRAISON";
  const destination = delivery ? "" : order.pickupPointLabel || order.pointDeVente || "";
  const reference = order.parcelNumber || order.preorderNumber || order.id;
  // Only explicitly selected customer and parcel fields enter the document.
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Étiquette colis — ${text(reference)}</title>
  <style>
  *{box-sizing:border-box}body{margin:0;background:#eee;color:#000;font-family:Arial,sans-serif}
  .toolbar{padding:20px;max-width:800px;margin:auto;display:flex;gap:12px;flex-wrap:wrap;align-items:end}
  label{display:grid;gap:5px;font-size:14px}input,select,button{font:inherit;padding:9px;border:1px solid #777;border-radius:5px}button{background:#111;color:white;cursor:pointer}input[type=number]{width:90px}.destination{flex:1;min-width:220px}.hint{width:100%;font-size:13px;margin:0}#error{color:#a00;width:100%;margin:0}
  .label{width:100mm;height:150mm;padding:5mm;background:white;margin:15px auto;overflow:hidden;display:flex;flex-direction:column;gap:3mm;box-shadow:0 2px 8px #aaa;break-after:page;page-break-after:always}
  .label:last-child{break-after:auto;page-break-after:auto}.brand{font-size:18px;letter-spacing:3px;font-weight:bold}.mode{border:2px solid black;padding:3mm;font-size:19px;font-weight:bold;text-align:center}.reference{font-size:23px;font-weight:bold;overflow-wrap:anywhere;line-height:1.15}.small{font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:1mm}.name{font-size:18px;font-weight:bold;overflow-wrap:anywhere}.fbo{font-size:15px;margin-top:2mm}.destination-text{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.3}.bottom{margin-top:auto;display:flex;align-items:center;gap:4mm;border-top:1px solid black;padding-top:3mm}.qr{width:26mm;height:26mm;flex-shrink:0}.qr svg{width:100%;height:100%}.number{font-size:21px;font-weight:bold}.caption{font-size:10px;margin-top:2mm}.command{font-size:12px;overflow-wrap:anywhere}
  @page{size:100mm 150mm;margin:0} @media print{body{background:white}.toolbar{display:none}.label{margin:0;box-shadow:none}}
  </style><style id="page-format">${parcelFormatLayout().css}</style></head><body>
  <div class="toolbar"><label>Format papier<select id="format"><option value="label">Étiquette 100 × 150 mm</option><option value="a4">Feuille A4</option><option value="thermal58">Thermique 58 × 90 mm</option><option value="thermal80">Thermique 80 × 100 mm</option></select></label><label>Orientation<select id="orientation"><option value="portrait">Portrait</option><option value="landscape">Paysage</option></select></label>
  <label>Nombre de colis<input id="count" type="number" min="1" max="50" step="1" value="1"></label>
  <label class="destination">${delivery ? "Adresse de livraison" : "Point de retrait"}<input id="destination" maxlength="180" value="${text(destination)}" placeholder="${delivery ? "Renseignez l’adresse de livraison" : "Renseignez le point de retrait"}"></label>
  <button id="print" type="button">Imprimer</button><p class="hint">Vérifiez la destination. Imprimez à 100 %, sans en-têtes ni pieds de page. Une étiquette par page. En paysage, le contenu pivote sur le même rouleau. Sur A4, découpez l’étiquette.</p><p id="error" role="alert"></p></div>
  <template id="template"><section class="sheet"><article class="label"><div class="brand">FOREVER</div><div class="mode">${delivery ? "LIVRAISON" : order.deliveryMode === "RETRAIT_SITE_FLP" ? "RETRAIT" : "MODE À CONFIRMER"}</div>
  <div><div class="small">Colis</div><div class="reference">${text(reference)}</div></div>
  <div><div class="small">Bénéficiaire</div><div class="name">${text(order.fboNomComplet || "Non renseigné")}</div><div class="fbo">FBO ${text(order.fboNumero || "—")}</div></div>
  <div><div class="small">${delivery ? "Destination" : "Point de retrait"}</div><div class="destination-text"></div></div>
  <div class="command">Commande : ${text(order.preorderNumber || order.id)}</div>
  <div class="bottom"><div class="qr">${qrSvg}</div><div><div class="number"></div><div class="caption">Scanner pour consulter la commande.<br>Accès réservé à l’équipe.</div></div></div></article></section></template><main id="labels"></main>
  <script>
  const count=document.getElementById('count'),destination=document.getElementById('destination'),error=document.getElementById('error');
  function update(){const total=Number(count.value);error.textContent='';if(!Number.isInteger(total)||total<1||total>50){error.textContent='Choisissez un nombre entier de colis entre 1 et 50.';return false;}const labels=document.getElementById('labels');labels.replaceChildren();for(let i=1;i<=total;i++){const label=document.getElementById('template').content.cloneNode(true);label.querySelector('.number').textContent='Colis '+i+'/'+total;label.querySelector('.destination-text').textContent=destination.value.trim()||'Destination à renseigner';labels.append(label);}return true;}
  count.addEventListener('input',update);destination.addEventListener('input',update);
  const parcelFormatLayout = ${parcelFormatLayout.toString()};
  function applyFormat(){document.getElementById('page-format').textContent=parcelFormatLayout(document.getElementById('format').value,document.getElementById('orientation').value).css;}
  document.getElementById('format').addEventListener('change',applyFormat);document.getElementById('orientation').addEventListener('change',applyFormat);
  document.getElementById('print').addEventListener('click',function(){if(!update())return;if(!destination.value.trim()){error.textContent='Renseignez la destination avant impression.';destination.focus();return;}const overflow=[...document.querySelectorAll('#labels .label')].some(label=>label.scrollHeight>label.clientHeight+1||label.scrollWidth>label.clientWidth+1);if(overflow){error.textContent='Le texte dépasse cette étiquette. Raccourcissez la destination ou choisissez un format plus grand.';return;}window.print();});update();
  </script></body></html>`;
}

export async function openParcelLabel(order) {
  const popup = window.open("", "parcel-label", "width=850,height=850");
  if (!popup) throw new Error("Autorisez les fenêtres contextuelles pour ouvrir l’étiquette.");
  popup.opener = null;
  popup.document.title = "Préparation de l’étiquette";
  popup.document.body.textContent = "Préparation de l’étiquette…";
  try {
    const origin = window.location.protocol === "file:" ? (import.meta.env.VITE_ADMIN_PUBLIC_URL || "https://admin.forevercivstore.com") : window.location.origin;
    const url = new URL(`/orders/${encodeURIComponent(order.id)}`, origin).href;
    const qr = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 4 });
    if (popup.closed) return;
    popup.document.open();popup.document.write(parcelLabelHtml(order, qr));popup.document.close();
  } catch (error) { popup.close(); throw error; }
}
