import { DEFAULT_INFO } from "./elephProtocol.js";

// Die-cut label rolls used with the P5. Width runs across the print head,
// height along the paper feed.
const FORMATS = {
  "58x39": { label: "58 × 39 mm", widthMm: 58, heightMm: 39, scale: 1 },
  "60x50": { label: "60 × 50 mm", widthMm: 60, heightMm: 50, scale: 1.25 },
};
const DEFAULT_FORMAT = "58x39";

// The raster is the label size, clipped to the printable head width reported
// by the printer (JXIG), and kept on whole bytes and whole millimetres.
function labelDimensions(format, info = DEFAULT_INFO) {
  const spec = FORMATS[format];
  if (!spec) throw new Error("Format d’étiquette P5 invalide.");
  const dots = info.dotsPerMm;
  const labelWidth = spec.widthMm * dots;
  const step = dots === 8 ? 8 : 24; // lcm(8, dots/mm) for 8, 12 and 24 dots/mm
  const width = Math.floor(Math.min(labelWidth, info.width) / step) * step;
  return { width, height: spec.heightMm * dots, scale: spec.scale * (dots / 8) };
}

export { FORMATS, DEFAULT_FORMAT, labelDimensions };
