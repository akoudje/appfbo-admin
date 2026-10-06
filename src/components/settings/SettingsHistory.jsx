/* eslint-disable react-hooks/set-state-in-effect -- Loading and errors are scoped to the current country request. */
import { useEffect, useState } from "react";
import { settingsService } from "../../services/settingsService";
const LABELS = {
  minCartFcfa: "Panier minimum",
  maxQtyPerProduct: "Quantité maximale par produit",
  packagingFeeFcfa: "Frais d’emballage",
  preorderSubmissionEnabled: "Soumission de précommandes",
  preorderSubmissionDisabledMessage: "Message de suspension",
  publicAnnouncementEnabled: "Annonce publique",
  publicAnnouncementMessage: "Texte de l’annonce",
  closedOnSaturday: "Fermeture le samedi",
  supportPhone: "Téléphone d’assistance",
  pickupAddress: "Adresse de retrait",
  defaultPointDeVente: "Point de vente",
  enableWave: "Wave",
  enableOrangeMoney: "Orange Money",
  enableCash: "Espèces",
  enableBankTransfer: "Virement bancaire",
  enableEcobankPay: "Ecobank Pay",
  enablePiSpi: "PI SPI",
  enableDelivery: "Livraison",
  enablePickup: "Retrait",
  bankAccountLabel: "Libellé bancaire",
  bankName: "Banque",
  bankAccountNumber: "Numéro de compte",
  bankIban: "IBAN",
  bankSwift: "SWIFT",
  bankAccountHolder: "Titulaire du compte",
  bankPaymentDueHours: "Délai bancaire (heures)",
  bankProofMaxFileSizeMb: "Taille de la preuve (Mo)",
  currencyLabel: "Devise",
  pricingDisclaimer: "Information sur les prix",
  themePrimaryColor: "Couleur principale",
  themeSecondaryColor: "Couleur secondaire",
  themeDarkColor: "Couleur sombre",
  themeLogoPath: "Logo",
  themeSliderEnabled: "Slider du catalogue",
  themeSidePanelsEnabled: "Panneaux du catalogue",
  notificationTemplates: "Modèles de messages",
  fboHelpTopics: "Rubriques d’aide FBO",
  maxActiveBillingPerInvoicer: "Charge des facturiers",
  billingClaimTimeoutMin: "Délai de prise en charge",
  preinvoicedAutoCancelAfterMinutes: "Annulation automatique (minutes)",
  preinvoicedAutoReminderAfterMinutes: "Rappel automatique (minutes)",
  preinvoicedAutoCancelAfterHours: "Annulation automatique (heures)",
  preinvoicedAutoReminderAfterHours: "Rappel automatique (heures)",
  ecobankPayMerchantName: "Nom du marchand Ecobank",
  ecobankPayMerchantId: "Identifiant marchand Ecobank",
  ecobankPayTerminalName: "Terminal Ecobank",
  ecobankPayTerminalId: "Identifiant terminal Ecobank",
  ecobankPayQrImageUrl: "QR Ecobank",
  ecobankPayInstructions: "Instructions Ecobank",
  piSpiAlias: "Alias PI SPI",
  piSpiMerchantName: "Marchand PI SPI",
  piSpiQrImageUrl: "QR PI SPI",
  piSpiInstructions: "Instructions PI SPI",
};
function valueLabel(value) {
  if (value === null || value === undefined || value === "")
    return "Non renseigné";
  if (typeof value === "boolean") return value ? "Activé" : "Désactivé";
  if (typeof value === "object")
    return Array.isArray(value)
      ? value.length + " rubrique(s)"
      : "Contenu personnalisé";
  return String(value);
}
export default function SettingsHistory({ countryCode, updatedAt }) {
  const [rows, setRows] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setRows([]);
    setLoading(true);
    setError("");
    settingsService
      .getHistory(countryCode)
      .then((result) => {
        if (active) setRows(result.data || []);
      })
      .catch(() => {
        if (active) setError("Impossible de charger l’historique.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [countryCode, updatedAt, retry]);
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Les 30 dernières modifications enregistrées pour {countryCode}.
        L’historique commence à l’installation de cette fonctionnalité.
      </p>
      {loading ? (
        <p role="status" className="p-8 text-center text-sm text-gray-500">
          Chargement de l’historique…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}{" "}
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
            className="underline"
          >
            Réessayer
          </button>
        </div>
      ) : !rows.length ? (
        <p className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          Aucune modification enregistrée pour ce pays.
        </p>
      ) : (
        rows.map((row) => (
          <details
            key={row.id}
            className="rounded-xl border border-gray-200 bg-white p-4"
          >
            <summary className="cursor-pointer text-sm font-medium text-gray-900">
              {row.actorLabel} ·{" "}
              {new Date(row.createdAt).toLocaleString("fr-FR")} ·{" "}
              {Object.keys(row.changes || {}).length} champ(s)
            </summary>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs text-gray-500">
                    <th scope="col" className="py-2 pr-3">
                      Paramètre
                    </th>
                    <th scope="col" className="py-2 pr-3">
                      Avant
                    </th>
                    <th scope="col" className="py-2">
                      Après
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(row.changes || {}).map(([key, change]) => (
                    <tr
                      key={key}
                      className="border-b border-gray-100 align-top"
                    >
                      <th scope="row" className="py-3 pr-3 font-medium">
                        {LABELS[key] || "Paramètre du pays"}
                      </th>
                      <td className="max-w-56 break-words py-3 pr-3 text-gray-500">
                        {valueLabel(change.before)}
                      </td>
                      <td className="max-w-56 break-words py-3 text-gray-900">
                        {valueLabel(change.after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))
      )}
    </div>
  );
}
