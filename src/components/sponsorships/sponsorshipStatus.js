// Libellés et styles des statuts de parrainage (admin).
export const SPONSORSHIP_STATUS = {
  SUBMITTED: { label: "À vérifier", style: "bg-blue-50 text-blue-700 border-blue-200" },
  CHANGES_REQUESTED: { label: "Complément demandé", style: "bg-amber-50 text-amber-800 border-amber-200" },
  APPROVED_PENDING_PURCHASE: { label: "En attente d'achat", style: "bg-violet-50 text-violet-700 border-violet-200" },
  VALIDATED: { label: "Validé", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Refusé", style: "bg-red-50 text-red-700 border-red-200" },
  EXPIRED: { label: "Expiré", style: "bg-gray-100 text-gray-600 border-gray-200" },
};
