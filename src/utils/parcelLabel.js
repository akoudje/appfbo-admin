import QRCode from "qrcode";

export function escapeLabelText(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
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
  </style><style id="page-format"></style></head><body>
  <div class="toolbar"><label>Format papier<select id="format"><option value="label">Étiquette 100 × 150 mm</option><option value="a4">Feuille A4</option></select></label>
  <label>Nombre de colis<input id="count" type="number" min="1" max="50" step="1" value="1"></label>
  <label class="destination">${delivery ? "Adresse de livraison" : "Point de retrait"}<input id="destination" maxlength="180" value="${text(destination)}" placeholder="${delivery ? "Renseignez l’adresse de livraison" : "Renseignez le point de retrait"}"></label>
  <button id="print" type="button">Imprimer</button><p class="hint">Vérifiez la destination. Imprimez à 100 %, sans en-têtes ni pieds de page. Une étiquette par page ; sur A4, découpez au format 100 × 150 mm.</p><p id="error" role="alert"></p></div>
  <template id="template"><article class="label"><div class="brand">FOREVER</div><div class="mode">${delivery ? "LIVRAISON" : order.deliveryMode === "RETRAIT_SITE_FLP" ? "RETRAIT" : "MODE À CONFIRMER"}</div>
  <div><div class="small">Colis</div><div class="reference">${text(reference)}</div></div>
  <div><div class="small">Bénéficiaire</div><div class="name">${text(order.fboNomComplet || "Non renseigné")}</div><div class="fbo">FBO ${text(order.fboNumero || "—")}</div></div>
  <div><div class="small">${delivery ? "Destination" : "Point de retrait"}</div><div class="destination-text"></div></div>
  <div class="command">Commande : ${text(order.preorderNumber || order.id)}</div>
  <div class="bottom"><div class="qr">${qrSvg}</div><div><div class="number"></div><div class="caption">Scanner pour consulter la commande.<br>Accès réservé à l’équipe.</div></div></div></article></template><main id="labels"></main>
  <script>
  const count=document.getElementById('count'),destination=document.getElementById('destination'),error=document.getElementById('error');
  function update(){const total=Number(count.value);error.textContent='';if(!Number.isInteger(total)||total<1||total>50){error.textContent='Choisissez un nombre entier de colis entre 1 et 50.';return false;}const labels=document.getElementById('labels');labels.replaceChildren();for(let i=1;i<=total;i++){const label=document.getElementById('template').content.cloneNode(true);label.querySelector('.number').textContent='Colis '+i+'/'+total;label.querySelector('.destination-text').textContent=destination.value.trim()||'Destination à renseigner';labels.append(label);}return true;}
  count.addEventListener('input',update);destination.addEventListener('input',update);
  document.getElementById('format').addEventListener('change',function(){document.getElementById('page-format').textContent=this.value==='a4'?'@page{size:A4;margin:10mm}':'@page{size:100mm 150mm;margin:0}';});
  document.getElementById('print').addEventListener('click',function(){if(!update())return;if(!destination.value.trim()){error.textContent='Renseignez la destination avant impression.';destination.focus();return;}window.print();});update();
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
