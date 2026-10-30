// Filiales FLP qui règlent des précommandes traitées ici (même codes que
// l'API, settlement.service.js).
const SETTLEMENT_LABELS = {
  FLP_BURKINA: "FLP Burkina",
};

export function settlementLabel(code) {
  if (!code) return "";
  return SETTLEMENT_LABELS[code] || code;
}
