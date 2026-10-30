// Eleph-label (P1_/P5_ JX firmware) wire format. Same protocol as the preparer app (appfbo-preparer-app docs/p5-printing.md).
const SERVICE = "000018f0-0000-1000-8000-00805f9b34fb";
const WRITE_CHAR = "00002af1-0000-1000-8000-00805f9b34fb";
const NOTIFY_CHAR = "00002af0-0000-1000-8000-00805f9b34fb";
const DEVICE_INFO_QUERY = Uint8Array.from([0x1b, 0x23, 0x23, 0x4a, 0x58, 0x49, 0x47]); // ESC ##JXIG
const DEVICE_INFO_LENGTH = 116;
const STATUS_QUERY = Uint8Array.from([0x1d, 0x61, 0x00]);
const STATUS_LENGTH = 4;
const ERROR_PREFIX = Uint8Array.from([0x65, 0x72, 0x72, 0x3a]); // "err:"
const DEFAULT_INFO = Object.freeze({ width: 384, dotsPerMm: 8, mode: "tspl", known: false });
const NAME_PATTERN = /^P\d+[A-Z]*_[0-9A-F]{4}$/i;

const ascii = (text) => Uint8Array.from(Array.from(text, (char) => char.charCodeAt(0)));
const concat = (parts) => {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};
const startsWith = (bytes, prefix) =>
  bytes.length >= prefix.length && prefix.every((value, index) => bytes[index] === value);

function parseDeviceInfo(data) {
  if (!data || data.length < DEVICE_INFO_LENGTH) return null;
  const dpiType = data[10],
    commandMode = data[11],
    width = data[8] | (data[9] << 8);
  if (![0, 1, 2].includes(dpiType) || ![1, 2].includes(commandMode) || width <= 0) return null;
  return {
    width,
    dotsPerMm: [8, 12, 24][dpiType],
    mode: commandMode === 1 ? "esc" : "tspl",
    version: data[6] | (data[7] << 8),
    paperType: data[17],
    known: true,
  };
}

function statusErrors(status) {
  if (!status || status.length !== STATUS_LENGTH) return [];
  const errors = [];
  if (status[0] & 0x20) errors.push("couvercle ouvert");
  if ((status[2] & 0x0c) === 0x0c) errors.push("plus d’étiquettes");
  if (status[1] & 0x40) errors.push("surchauffe");
  return errors;
}

// Raster rows are MSB-first with 1 = black dot, the ESC GS v 0 convention.
function packRgba(rgba, width, height) {
  if (!Number.isInteger(width) || width < 8 || width % 8 || !Number.isInteger(height) || height < 1)
    throw new Error("Dimensions d’étiquette invalides.");
  if (rgba.length !== width * height * 4) throw new Error("Image d’étiquette invalide.");
  const bytesPerRow = width / 8,
    data = new Uint8Array(bytesPerRow * height);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4,
        alpha = rgba[index + 3] / 255,
        gray =
          (rgba[index] * 0.299 + rgba[index + 1] * 0.587 + rgba[index + 2] * 0.114) * alpha +
          255 * (1 - alpha);
      if (gray < 160) data[y * bytesPerRow + (x >> 3)] |= 0x80 >> (x & 7);
    }
  return { width, height, bytesPerRow, data };
}

function assertRaster(raster, info = DEFAULT_INFO) {
  if (!raster || raster.width < 8 || raster.width % 8 || raster.width > info.width ||
    raster.height < 1 || raster.height > 0xffff ||
    raster.data?.length !== (raster.width / 8) * raster.height)
    throw new Error("Étiquette P5 invalide : le rendu dépasse la largeur imprimable.");
}

// Mirrors the Eleph-label TSPL job: SIZE, CLS, DIRECTION 0, BITMAP, PRINT.
// TSPL bitmaps print 0 bits, so rows are inverted. No GAP/SPEED/DENSITY:
// the printer keeps its own calibrated label settings.
function tsplJob(raster, dotsPerMm = 8) {
  const mm = (dots) => Math.floor(dots / dotsPerMm);
  const inverted = raster.data.map((value) => value ^ 0xff);
  return concat([
    ascii(`SIZE ${mm(raster.width)} mm,${mm(raster.height)} mm\n`),
    ascii("CLS\n"),
    ascii("DIRECTION 0\n"),
    ascii(`BITMAP 0,0,${raster.bytesPerRow},${raster.height},0,`),
    inverted,
    ascii("\n"),
    ascii("PRINT 1,1\n"),
  ]);
}

// ESC variant: init, centre, one GS v 0 block (mode byte '0'), then GS FF to
// advance to the next label gap.
function escJob(raster) {
  return concat([
    Uint8Array.from([0x1b, 0x40, 0x1b, 0x61, 0x01]),
    Uint8Array.from([
      0x1d, 0x76, 0x30, 0x30,
      raster.bytesPerRow & 0xff, raster.bytesPerRow >> 8,
      raster.height & 0xff, raster.height >> 8,
    ]),
    raster.data,
    Uint8Array.from([0x1d, 0x0c]),
  ]);
}

function printJob(raster, info = DEFAULT_INFO) {
  assertRaster(raster, info);
  return info.mode === "esc" ? escJob(raster) : tsplJob(raster, info.dotsPerMm);
}

// Collects notifications for the fixed-length JX records (no request id), and
// reports asynchronous "err:" status frames emitted while printing.
function createReplyReader() {
  let buffer = new Uint8Array(),
    pending = null;
  function settle() {
    if (!pending) return;
    if (pending.kind === "info" && buffer.length >= DEVICE_INFO_LENGTH) {
      const record = buffer.slice(0, DEVICE_INFO_LENGTH);
      buffer = buffer.slice(DEVICE_INFO_LENGTH);
      const done = pending;
      pending = null;
      done.resolve(record);
    } else if (pending.kind === "status") {
      const framed = startsWith(buffer, ERROR_PREFIX);
      const size = framed ? ERROR_PREFIX.length + STATUS_LENGTH : STATUS_LENGTH;
      if (buffer.length < size) return;
      const record = buffer.slice(size - STATUS_LENGTH, size);
      buffer = buffer.slice(size);
      const done = pending;
      pending = null;
      done.resolve(record);
    }
  }
  return {
    expect(kind) {
      buffer = new Uint8Array();
      return new Promise((resolve) => {
        pending = { kind, resolve };
      });
    },
    cancel() {
      const done = pending;
      pending = null;
      done?.resolve(null);
    },
    push(chunk) {
      if (pending) {
        buffer = concat([buffer, chunk]);
        settle();
        return [];
      }
      const faults = [];
      for (let at = 0; at + ERROR_PREFIX.length + STATUS_LENGTH <= chunk.length; at++)
        if (startsWith(chunk.slice(at), ERROR_PREFIX)) {
          faults.push(chunk.slice(at + ERROR_PREFIX.length, at + ERROR_PREFIX.length + STATUS_LENGTH));
          at += ERROR_PREFIX.length + STATUS_LENGTH - 1;
        }
      return faults;
    },
  };
}

export {
  SERVICE,
  WRITE_CHAR,
  NOTIFY_CHAR,
  NAME_PATTERN,
  DEVICE_INFO_QUERY,
  DEVICE_INFO_LENGTH,
  STATUS_QUERY,
  DEFAULT_INFO,
  parseDeviceInfo,
  statusErrors,
  packRgba,
  assertRaster,
  tsplJob,
  escJob,
  printJob,
  createReplyReader,
};
