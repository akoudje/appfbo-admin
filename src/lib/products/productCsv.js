const aliases = {
  name: "nom",
  prix: "prixBaseFcfa",
  prixbasefcfa: "prixBaseFcfa",
  poids: "poidsKg",
  poidskg: "poidsKg",
  categorie: "category",
  stock: "stockQty",
  stockqty: "stockQty",
  maxqtyperorder: "maxQtyPerOrder",
  imageurl: "imageUrl",
  description: "details",
  clientprivilegie: "CLIENT_PRIVILEGIE",
  animateuradjoint: "ANIMATEUR_ADJOINT",
  animateur: "ANIMATEUR",
  manageradjoint: "MANAGER_ADJOINT",
  manager: "MANAGER",
};
export function parseProductCsv(text) {
  const source = String(text || "").replace(/^\uFEFF/, "");
  if (!source.trim()) return [];
  const first = source.split(/\r?\n/)[0],
    sep = first.includes(";") ? ";" : ",";
  const records = [];
  let record = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    if (ch === '"') {
      if (quoted && source[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      record.push(cell.trim());
      cell = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && source[i + 1] === "\n") i++;
      record.push(cell.trim());
      if (record.some(Boolean)) records.push(record);
      record = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("Une cellule entre guillemets n’est pas fermée.");
  record.push(cell.trim());
  if (record.some(Boolean)) records.push(record);
  const rawHeaders = records.shift() || [];
  const headers = rawHeaders.map((raw) => {
    const key = raw.toLowerCase().replace(/[\s_]/g, "");
    return aliases[key] || key;
  });
  if (new Set(headers).size !== headers.length)
    throw new Error("Une colonne apparaît plusieurs fois.");
  if (!headers.includes("sku")) throw new Error("La colonne SKU est requise.");
  return records.map((cells, index) => {
    if (cells.length !== headers.length)
      throw new Error(
        `Ligne ${index + 2} : ${headers.length} colonnes attendues, ${cells.length} reçues.`,
      );
    const row = Object.fromEntries(headers.map((key, i) => [key, cells[i]]));
    for (const key of [
      "cc",
      "poidsKg",
      "prixBaseFcfa",
      "stockQty",
      "maxQtyPerOrder",
      "CLIENT_PRIVILEGIE",
      "ANIMATEUR_ADJOINT",
      "ANIMATEUR",
      "MANAGER_ADJOINT",
      "MANAGER",
    ])
      if (row[key]) row[key] = row[key].replace(/\s/g, "").replace(",", ".");
    if (row.actif !== undefined && row.actif !== "") {
      const value = row.actif.toLowerCase();
      if (["oui", "yes", "true", "1"].includes(value)) row.actif = true;
      else if (["non", "no", "false", "0"].includes(value)) row.actif = false;
      else
        throw new Error(`Ligne ${index + 2} : actif doit être vrai ou faux.`);
    }
    return row;
  });
}
export const CSV_TEMPLATE =
  "sku;nom;prixBaseFcfa;cc;poidsKg;category;actif;stockQty\nEXEMPLE-001;Produit exemple;15000;0.482;0.300;BUVABLE;true;0";
export function downloadText(text, filename, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob(["\uFEFF" + text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
