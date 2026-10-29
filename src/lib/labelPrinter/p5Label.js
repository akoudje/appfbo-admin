import QRCode from "qrcode";
import { packRgba } from "./elephProtocol.js";

const SHIPPING_MODES = ["EXPEDITION_POSTE", "EXPEDITION_CODITRANS"];
const QR_MODULE_DOTS = 3;
const QR_MARGIN = 2;
const FONT = "Arial, Helvetica, sans-serif";

export function defaultLabelDestination(order) {
  if (SHIPPING_MODES.includes(order?.deliveryMode))
    return `${order.shippingDestinationCity || ""} · ${order.shippingRecipientPhone || ""}`;
  return "";
}

// Same fields as the preparer app's parcel label: no FBO number, pickup
// secret, amount or internal note ever enters the printed label.
export function labelData(order, { destination = "", count = 1 } = {}, index = 1) {
  if (!Number.isInteger(count) || count < 1 || count > 50)
    throw new Error("Choisissez un nombre entier de colis entre 1 et 50.");
  if (!Number.isInteger(index) || index < 1 || index > count) throw new Error("Numéro de colis invalide.");
  const shipping = SHIPPING_MODES.includes(order.deliveryMode);
  const delivery = shipping || order.deliveryMode === "LIVRAISON";
  if (shipping && !destination) destination = defaultLabelDestination(order);
  if (delivery && (typeof destination !== "string" || !destination.trim() || destination.length > 180))
    throw new Error("Renseignez une adresse de livraison de 180 caractères maximum.");
  return {
    reference: String(order.parcelNumber || order.preorderNumber || order.id),
    preorder: String(order.preorderNumber || order.id),
    beneficiary: String((shipping ? order.shippingRecipientName : order.fboNomComplet) || "Non renseigné"),
    mode: shipping
      ? order.deliveryMode === "EXPEDITION_POSTE" ? "LA POSTE" : "CODITRANS"
      : order.deliveryMode === "LIVRAISON"
        ? "LIVRAISON"
        : order.deliveryMode === "RETRAIT_SITE_FLP"
          ? "RETRAIT"
          : "MODE À CONFIRMER",
    ...(delivery ? { destination: destination.trim() } : {}),
    index,
    count,
  };
}

export function testLabelData() {
  return { reference: "TEST P5", preorder: "TEST P5", beneficiary: "FOREVER PRÉPARATION", mode: "TEST", index: 1, count: 1 };
}

// Word wrap; words wider than the line (parcel codes) break after a hyphen,
// or at any character when a segment is still too wide.
function wrap(ctx, text, width) {
  const lines = [];
  let line = "";
  const fits = (value) => ctx.measureText(value).width <= width;
  const push = (word) => {
    for (const part of word.split(/(?<=-)/)) {
      if (fits(line + part)) {
        line += part;
        continue;
      }
      if (line.trim()) lines.push(line.trimEnd());
      line = "";
      if (fits(part)) {
        line = part;
        continue;
      }
      for (const char of part) {
        if (line && !fits(line + char)) {
          lines.push(line);
          line = "";
        }
        line += char;
      }
    }
  };
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const candidate = line ? line + " " + word : word;
    if (ctx.measureText(candidate).width <= width) line = candidate;
    else if (ctx.measureText(word).width <= width) {
      if (line) lines.push(line);
      line = word;
    } else {
      if (line) line += " ";
      push(word);
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Draws the label at printer resolution (1 canvas px = 1 dot) and returns the
// canvas plus its 1-bit raster. Long names shrink the text down to 80 % of
// the format size; beyond that nothing is printed.
export function renderLabel(data, dimensions, qrText) {
  for (let ratio = 1; ratio >= 0.8 - 1e-9; ratio -= 0.05) {
    const canvas = drawLabel(data, dimensions, qrText, dimensions.scale * ratio);
    if (canvas) {
      const raster = packRgba(
        canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data,
        canvas.width,
        canvas.height,
      );
      return { canvas, raster };
    }
  }
  const error = new Error("Les informations dépassent l’étiquette. Rien n’a été envoyé.");
  error.overflow = true;
  throw error;
}

function drawLabel(data, dimensions, qrText, s) {
  const { width, height } = dimensions;
  const size = (value) => Math.round(value * s);
  const pad = size(8),
    gap = size(4),
    inner = width - pad * 2;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";
  let y = pad;
  const font = (px, weight = 400) => {
    ctx.font = `${weight} ${size(px)}px ${FONT}`;
    return size(px * 1.12);
  };
  const block = (text, px, weight, x, maxWidth, top) => {
    const lineHeight = font(px, weight);
    const lines = wrap(ctx, text, maxWidth);
    lines.forEach((line, i) => ctx.fillText(line, x, top + i * lineHeight));
    return lines.length * lineHeight;
  };

  const counterHeight = font(30, 800);
  const counter = `${data.index}/${data.count}`;
  const counterWidth = ctx.measureText(counter).width;
  ctx.fillText(counter, width - pad - counterWidth, y);
  font(18, 800);
  const headerLabel = `FOREVER · ${data.mode}`;
  ctx.fillText(headerLabel, pad, y + counterHeight - size(18 * 1.12));
  const headerOverflow = ctx.measureText(headerLabel).width + gap + counterWidth > inner;
  y += counterHeight + gap;
  ctx.fillRect(pad, y, inner, Math.max(2, size(2)));
  y += Math.max(2, size(2)) + gap;
  y += block(data.beneficiary, 30, 700, pad, inner, y) + gap;
  if (data.destination) y += block("Livraison : " + data.destination, 15, 400, pad, inner, y) + gap;

  const qr = QRCode.create(qrText, { errorCorrectionLevel: "M" });
  const moduleDots = Math.max(QR_MODULE_DOTS, Math.round(QR_MODULE_DOTS * s));
  const qrSize = (qr.modules.size + QR_MARGIN * 2) * moduleDots;
  const qrX = width - pad - qrSize;
  for (let row = 0; row < qr.modules.size; row++)
    for (let col = 0; col < qr.modules.size; col++)
      if (qr.modules.get(col, row))
        ctx.fillRect(qrX + (col + QR_MARGIN) * moduleDots, y + (row + QR_MARGIN) * moduleDots, moduleDots, moduleDots);
  const column = inner - qrSize - gap;
  let left = y;
  left += block(data.preorder === data.reference ? "COLIS / PRÉCOMMANDE" : "RÉF. COLIS", 12, 400, pad, column, left);
  left += block(data.reference, 22, 700, pad, column, left);
  if (data.preorder !== data.reference) {
    left += gap;
    left += block("PRÉCOMMANDE", 12, 400, pad, column, left);
    left += block(data.preorder, 18, 700, pad, column, left);
  }
  const bottom = Math.max(left, y + qrSize);
  return headerOverflow || bottom > height - pad + 0.1 ? null : canvas;
}
