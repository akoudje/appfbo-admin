import { ordersService } from "../../services/ordersService";
import { useRef } from "react";
function normalizeStr(value) {
  return value == null ? "" : String(value).trim();
}
export default function useOrderActions({
  Blob,
  URLSearchParams,
  cancelReason,
  cashAmountReceivedFcfa,
  cashDeskLabel,
  cashNote,
  cashReceiptNumber,
  confirm,
  deliveryCarrier,
  deliveryTracking,
  document,
  fulfillNote,
  fulfillmentMode,
  id,
  invoiceAmountFcfa,
  invoiceEmail,
  invoiceGrade,
  invoiceNote,
  invoiceRef,
  invoiceWaTo,
  isBankStyleRelaunch,
  isCurrentOrder,
  load,
  navigate,
  navigator,
  order,
  packingNote,
  pickupCode,
  pickupConfirmationNote,
  pickupPointLabel,
  pickupRecipientName,
  pickupRecipientPhone,
  pickupRecipientType,
  proofNote,
  proofRef,
  proofUrl,
  relaunchPaymentAsCash,
  relaunchPaymentMinutes,
  relaunchPaymentNote,
  searchParams,
  setError,
  setInfo,
  setInvoiceEmail,
  setInvoiceWaTo,
  setOrder,
  setReplacingItemId,
  setSaving,
  setWaveLoading,
  status,
  verifyNote,
  window,
}) {
  const operationLock = useRef(false);
  const handleActionResult = async (result, fallbackInfo) => {
    if (result?.alreadyDone) {
      setInfo(result?.message || fallbackInfo || "Action déjà effectuée.");
    } else {
      setInfo("");
    }
    await load({ resetDrafts: true });
  };

  const navigateToNextPreparationQueueOrder = (nextTab) => {
    if (!isCurrentOrder()) return false;
    if (searchParams.get("prepQueue") !== "1") return false;

    const queueIds = String(searchParams.get("queueIds") || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const currentIndex = queueIds.indexOf(id);
    const nextId = currentIndex >= 0 ? queueIds[currentIndex + 1] : "";

    if (!nextId) {
      const queueTab = searchParams.get("queueTab");
      navigate(
        queueTab
          ? `/preparation?tab=${encodeURIComponent(queueTab)}`
          : "/preparation",
        { replace: true },
      );
      return true;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("tab", nextTab);
    navigate(`/orders/${nextId}?${nextParams.toString()}`, { replace: true });
    return true;
  };

  const handleResendInvoiceNotification = async (channel = "") => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const normalizedChannel = String(channel || "")
        .trim()
        .toUpperCase();
      const result = await ordersService.resendInvoiceSms(id, {
        ...(normalizedChannel ? { channel: normalizedChannel } : {}),
        phone: normalizeStr(invoiceWaTo) || undefined,
        email: normalizeStr(invoiceEmail) || undefined,
      });
      const sentChannels = (
        Array.isArray(result?.attempts) ? result.attempts : []
      )
        .filter((attempt) => attempt?.sent || attempt?.queued)
        .map((attempt) => String(attempt.channel || "").toUpperCase())
        .filter(Boolean);
      const uniqueChannels = [...new Set(sentChannels)];
      const channelsLabel =
        uniqueChannels.length > 0
          ? uniqueChannels.join(" + ")
          : normalizedChannel || "SMS / EMAIL";
      const destinations = [
        result?.toPhone ? `SMS: ${result.toPhone}` : null,
        result?.toEmail ? `Email: ${result.toEmail}` : null,
      ].filter(Boolean);
      const hasPaymentLink = Boolean(
        order?.paymentLink ||
        order?.paymentLinkTarget ||
        order?.trackedPaymentLink ||
        order?.activePayment?.providerLaunchUrl,
      );
      if (result?.sent) {
        setInfo(
          `${hasPaymentLink ? "Notification de paiement avec lien" : "Notification de rappel de paiement"} renvoyée via ${channelsLabel}${
            destinations.length ? ` vers ${destinations.join(" | ")}` : "."
          }`,
        );
      } else if (result?.queued) {
        setInfo(
          `${hasPaymentLink ? "Notification de paiement avec lien" : "Notification de rappel de paiement"} mise en file via ${channelsLabel}${
            destinations.length ? ` vers ${destinations.join(" | ")}` : "."
          }`,
        );
      } else {
        setInfo(
          result?.errorMessage ||
            "Le renvoi de notification a été lancé, mais aucun canal n'a confirmé l'envoi.",
        );
      }

      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de renvoyer le lien de paiement par SMS / email",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotificationContacts = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.updateNotificationContacts(id, {
        phone: normalizeStr(invoiceWaTo) || "",
        email: normalizeStr(invoiceEmail) || "",
      });

      setInvoiceWaTo(result?.factureWhatsappTo || "");
      setInvoiceEmail(result?.fboEmail || "");
      setInfo("Coordonnées de notification mises à jour pour cette commande.");
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de mettre à jour les coordonnées de notification",
      );
    } finally {
      setSaving(false);
    }
  };

  const doInvoice = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const body = {
        factureReference: normalizeStr(invoiceRef) || undefined,
        whatsappTo: normalizeStr(invoiceWaTo) || undefined,
        notificationEmail: normalizeStr(invoiceEmail) || undefined,
        fboGrade: normalizeStr(invoiceGrade) || undefined,
        invoiceAmountFcfa: normalizeStr(invoiceAmountFcfa) || undefined,
        note: normalizeStr(invoiceNote) || undefined,
      };

      await ordersService.invoice(id, body);
      navigate("/billing?tab=queue&autoClaim=1");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de facturer");
    } finally {
      setSaving(false);
    }
  };

  const doEnqueueAs400Request = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.enqueueAs400Request(id, {
        mode: "OBSERVATION",
        action: "CREATE_AND_VALIDATE_INVOICE",
        note: "Demande AS400 créée depuis l'onglet facturation en mode observation.",
      });

      setInfo(
        result?.created
          ? "Demande AS400 créée en mode observation. Aucun automate n'a été exécuté."
          : "Une demande AS400 active existe déjà pour cette commande.",
      );
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de créer la demande AS400 en mode observation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doCorrectAs400Invoice = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.correctAs400Invoice(id, {
        factureReference: normalizeStr(invoiceRef) || undefined,
        invoiceAmountFcfa: normalizeStr(invoiceAmountFcfa) || undefined,
        note: normalizeStr(invoiceNote) || undefined,
      });

      setOrder(result?.order || result);
      setInfo(
        result?.message ||
          "Facture AS400 corrigée. Le prochain paiement utilisera le nouveau montant.",
      );
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de corriger la facture AS400",
      );
    } finally {
      setSaving(false);
    }
  };

  const doRelaunchPayment = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const value = Number.parseInt(String(relaunchPaymentMinutes || ""), 10);
      const durationPayload = isBankStyleRelaunch
        ? { durationHours: Number.isFinite(value) ? value : 72 }
        : { durationMinutes: Number.isFinite(value) ? value : 10 };
      const result = await ordersService.relaunchPayment(id, {
        ...durationPayload,
        note: normalizeStr(relaunchPaymentNote) || undefined,
        switchToCash: Boolean(relaunchPaymentAsCash),
      });
      setOrder(result);
      setInfo(
        relaunchPaymentAsCash
          ? "Commande relancée en mode caisse."
          : "Commande relancée : un nouveau délai de paiement a été envoyé au client.",
      );
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de relancer le paiement de cette commande",
      );
    } finally {
      setSaving(false);
    }
  };

  const doProof = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const body = {
        manualPaymentProofUrl: normalizeStr(proofUrl) || undefined,
        manualPaymentReference: normalizeStr(proofRef) || undefined,
        note: normalizeStr(proofNote) || undefined,
      };

      const result = await ordersService.proof(id, body);
      await handleActionResult(result, "Preuve déjà enregistrée.");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible d'enregistrer la preuve",
      );
    } finally {
      setSaving(false);
    }
  };

  const doUploadBankProof = async (file) => {
    if (!file) {
      setError("Sélectionne le fichier de preuve à uploader.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.uploadBankProof(id, {
        file,
        reference: normalizeStr(proofRef) || undefined,
        declaredAmountFcfa:
          normalizeStr(order?.as400InvoiceTotalFcfa || order?.totalFcfa) ||
          undefined,
        note: normalizeStr(proofNote) || undefined,
      });

      await handleActionResult(result, "Preuve bancaire déjà enregistrée.");
      setInfo("Preuve bancaire uploadée et passée en attente de validation.");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible d'uploader la preuve bancaire",
      );
    } finally {
      setSaving(false);
    }
  };

  const doVerifyPayment = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.verifyPayment(id, {
        note: normalizeStr(verifyNote) || undefined,
      });

      await handleActionResult(result, "Paiement déjà validé.");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de valider le paiement",
      );
    } finally {
      setSaving(false);
    }
  };

  const doCashPay = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.pay(id, {
        note: normalizeStr(cashNote) || undefined,
        receiptNumber: normalizeStr(cashReceiptNumber) || undefined,
        cashDeskLabel: normalizeStr(cashDeskLabel) || undefined,
        amountReceivedFcfa: normalizeStr(cashAmountReceivedFcfa) || undefined,
      });

      await handleActionResult(result, "Paiement espèces déjà enregistré.");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible d'encaisser le paiement espèces",
      );
    } finally {
      setSaving(false);
    }
  };

  const doInitiateWave = async () => {
    try {
      setWaveLoading(true);
      setError("");
      setInfo("");

      const result = await ordersService.initiateWavePayment(id);

      if (result?.checkoutUrl) {
        setInfo("Session Wave créée avec succès.");
      } else {
        setInfo("Paiement Wave initié.");
      }

      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible d'initier le paiement Wave",
      );
    } finally {
      setWaveLoading(false);
    }
  };

  const doSyncWave = async () => {
    try {
      setWaveLoading(true);
      setError("");
      setInfo("");

      const result = await ordersService.syncWavePaymentStatus(id);

      if (result?.mapped?.markOrderPaid) {
        setInfo("Paiement Wave confirmé.");
      } else {
        setInfo("Statut Wave synchronisé.");
      }

      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de synchroniser le paiement Wave",
      );
    } finally {
      setWaveLoading(false);
    }
  };

  const doSimulateWave = async (scenario) => {
    try {
      setWaveLoading(true);
      setError("");
      setInfo("");

      const result = await ordersService.simulateWavePayment(id, scenario);

      if (result?.scenario === "succeeded") {
        setInfo("Simulation Wave succeeded exécutée.");
      } else if (result?.scenario === "expired") {
        setInfo("Simulation Wave expired exécutée.");
      } else if (result?.scenario === "cancelled") {
        setInfo("Simulation Wave cancelled exécutée.");
      } else {
        setInfo("Simulation Wave processing exécutée.");
      }

      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de simuler le paiement Wave",
      );
    } finally {
      setWaveLoading(false);
    }
  };

  const doSwitchPaymentToManual = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      await ordersService.switchPaymentToManual(id);
      setInfo("Mode de paiement basculé en paiement à la caisse.");
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de basculer le mode de paiement en caisse",
      );
    } finally {
      setSaving(false);
    }
  };

  const doSwitchPaymentToWave = async () => {
    try {
      setWaveLoading(true);
      setError("");
      setInfo("");

      const result = await ordersService.switchPaymentToWave(id, {
        phone: normalizeStr(invoiceWaTo) || undefined,
      });

      setInfo(
        result?.paymentLink
          ? "Mode de paiement basculé vers Wave. Le lien est prêt: vous pouvez le renvoyer au client."
          : "Mode de paiement basculé vers Wave. Paiement initié.",
      );
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de basculer le mode de paiement vers Wave",
      );
    } finally {
      setWaveLoading(false);
    }
  };

  const doSwitchPaymentToBankTransfer = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      await ordersService.switchPaymentToBankTransfer(id);
      setInfo(
        "Mode de paiement basculé vers virement bancaire. Instructions renvoyées au client.",
      );
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de basculer le mode de paiement vers le virement bancaire",
      );
    } finally {
      setSaving(false);
    }
  };

  const doPrepare = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.prepare(id, {
        packingNote: normalizeStr(packingNote) || undefined,
      });

      await handleActionResult(result, "Commande déjà préparée.");
      navigateToNextPreparationQueueOrder("preparation");
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de marquer le colis prêt",
      );
    } finally {
      setSaving(false);
    }
  };

  const doResendConfirmationSms = async (channel = "") => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const normalizedChannel = String(channel || "")
        .trim()
        .toUpperCase();
      const result = await ordersService.resendConfirmationSms(id, {
        ...(normalizedChannel ? { channel: normalizedChannel } : {}),
        phone: normalizeStr(invoiceWaTo) || undefined,
        email: normalizeStr(invoiceEmail) || undefined,
      });
      if (result?.sent) {
        const channelsSent = (
          Array.isArray(result?.attempts) ? result.attempts : []
        )
          .filter((attempt) => attempt?.sent || attempt?.queued)
          .map((attempt) => String(attempt.channel || "").toUpperCase())
          .filter(Boolean);
        const channelLabel =
          [...new Set(channelsSent)].join(" + ") ||
          String(result?.channel || normalizedChannel || "SMS").toUpperCase();
        const destinations = [
          result?.toPhone ? `SMS: ${result.toPhone}` : null,
          result?.toEmail ? `Email: ${result.toEmail}` : null,
        ].filter(Boolean);
        setInfo(
          `Notification de confirmation renvoyée via ${channelLabel}${
            destinations.length ? ` vers ${destinations.join(" | ")}` : "."
          }`,
        );
      } else {
        setInfo(
          result?.errorMessage ||
            "Le renvoi de notification a été lancé, mais aucun canal n'a confirmé l'envoi.",
        );
      }

      if (result?.toPhone) setInvoiceWaTo(result.toPhone);
      if (result?.toEmail) setInvoiceEmail(result.toEmail);
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de renvoyer le SMS de confirmation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doFulfill = async () => {
    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.fulfill(id, {
        deliveryTracking: normalizeStr(deliveryTracking) || undefined,
        pickupCode: normalizeStr(pickupCode) || undefined,
        pickupPointLabel: normalizeStr(pickupPointLabel) || undefined,
        deliveryCarrier: normalizeStr(deliveryCarrier) || undefined,
        fulfillmentMode: normalizeStr(fulfillmentMode) || undefined,
        pickupRecipientType: normalizeStr(pickupRecipientType) || undefined,
        pickupRecipientName: normalizeStr(pickupRecipientName) || undefined,
        pickupRecipientPhone: normalizeStr(pickupRecipientPhone) || undefined,
        pickupConfirmationNote:
          normalizeStr(pickupConfirmationNote) || undefined,
        note: normalizeStr(fulfillNote) || undefined,
      });

      await handleActionResult(result, "Commande déjà clôturée.");
      navigateToNextPreparationQueueOrder("fulfillment");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible de clôturer");
    } finally {
      setSaving(false);
    }
  };

  const doCancel = async () => {
    try {
      if (!normalizeStr(cancelReason)) {
        setError("Motif d'annulation requis.");
        return;
      }

      const approved = await confirm({
        tone: "warning",
        title: "Annuler cette commande",
        message:
          "La commande " +
          (order.preorderNumber || order.id) +
          " sera annulée. Le stock réservé sera réintégré. Le règlement conserve son état actuel ; un éventuel remboursement doit être traité séparément.",
        confirmLabel: "Annuler la commande",
      });
      if (!approved) return;
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.cancel(id, {
        reason: normalizeStr(cancelReason),
      });

      await handleActionResult(result, "Commande déjà annulée.");
    } catch (e) {
      setError(e?.response?.data?.message || "Impossible d'annuler");
    } finally {
      setSaving(false);
    }
  };

  const copyWhatsApp = async () => {
    const text = order?.whatsappMessage || "";
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      setInfo("Message SMS copie.");
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setInfo("Message SMS copie.");
    }
  };

  const doFulfillNoNotification = async () => {
    const confirmed = await confirm({
      tone: "warning",
      title: "Clôturer sans notification",
      message:
        "Cette action va clôturer la commande sans envoyer de SMS ni email au client. Elle débitera le stock si nécessaire et sera tracée dans l'historique. Continuer ?",
      confirmLabel: "Clôturer",
    });
    if (!confirmed) return;

    try {
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.fulfillNoNotification(id, {
        deliveryTracking: normalizeStr(deliveryTracking) || undefined,
        pickupPointLabel: normalizeStr(pickupPointLabel) || undefined,
        deliveryCarrier: normalizeStr(deliveryCarrier) || undefined,
        fulfillmentMode: normalizeStr(fulfillmentMode) || undefined,
        pickupRecipientType: normalizeStr(pickupRecipientType) || undefined,
        pickupRecipientName: normalizeStr(pickupRecipientName) || undefined,
        pickupRecipientPhone: normalizeStr(pickupRecipientPhone) || undefined,
        pickupConfirmationNote:
          normalizeStr(pickupConfirmationNote) || undefined,
        note:
          normalizeStr(fulfillNote) ||
          "Commande déjà livrée physiquement. Clôture admin sans notification.",
      });

      if (result?.alreadyDone) {
        setInfo("Commande déjà clôturée.");
      } else {
        setInfo("Commande clôturée sans notification SMS/email.");
      }
      await load({ resetDrafts: true });
      navigateToNextPreparationQueueOrder("fulfillment");
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de clôturer sans notification",
      );
    } finally {
      setSaving(false);
    }
  };

  const doDownloadDeliveryNote = async () => {
    try {
      setSaving(true);
      setError("");
      const response = await ordersService.downloadDeliveryNotePdf(id);
      const blob =
        response?.data instanceof Blob
          ? response.data
          : new Blob([response?.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const parcelRef = order?.parcelNumber || order?.preorderNumber || id;
      link.href = url;
      link.download = `bon-livraison-${parcelRef}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de générer le bon de livraison",
      );
    } finally {
      setSaving(false);
    }
  };

  const doUpdatePreparationChecklistItem = async (itemId, checked) => {
    try {
      setSaving(true);
      setError("");
      const saved = await ordersService.updatePreparationChecklistItem(id, {
        itemId,
        checked,
      });
      setOrder((prev) => {
        if (!prev) return prev;
        const nextItems = Array.isArray(prev.preparationItems)
          ? prev.preparationItems.map((item) =>
              item.preorderItemId === itemId ? { ...item, ...saved } : item,
            )
          : [saved];
        return {
          ...prev,
          preparationItems: nextItems,
        };
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de mettre à jour la checklist de préparation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doBulkUpdatePreparationChecklist = async (checked) => {
    try {
      setSaving(true);
      setError("");
      await ordersService.bulkUpdatePreparationChecklist(id, { checked });
      setOrder((prev) => {
        if (!prev) return prev;
        const now = new Date().toISOString();
        return {
          ...prev,
          preparationItems: Array.isArray(prev.preparationItems)
            ? prev.preparationItems.map((item) => ({
                ...item,
                checked: Boolean(checked),
                checkedAt: checked ? now : null,
              }))
            : prev.preparationItems,
        };
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de mettre à jour la checklist de préparation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doCreatePreparationAnomaly = async (body) => {
    try {
      setSaving(true);
      setError("");
      const created = await ordersService.createPreparationAnomaly(id, body);
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          preparationAnomalies: [
            created,
            ...(Array.isArray(prev.preparationAnomalies)
              ? prev.preparationAnomalies
              : []),
          ],
        };
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible d'enregistrer l'anomalie de préparation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doResolvePreparationAnomaly = async (anomalyId, resolutionNote) => {
    try {
      setSaving(true);
      setError("");
      const saved = await ordersService.resolvePreparationAnomaly(
        id,
        anomalyId,
        {
          resolutionNote: normalizeStr(resolutionNote) || undefined,
        },
      );
      setOrder((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          preparationAnomalies: Array.isArray(prev.preparationAnomalies)
            ? prev.preparationAnomalies.map((item) =>
                item.id === anomalyId ? { ...item, ...saved } : item,
              )
            : prev.preparationAnomalies,
        };
      });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          "Impossible de résoudre l'anomalie de préparation",
      );
    } finally {
      setSaving(false);
    }
  };

  const doReplaceBillingItem = async (itemId, nextProductId) => {
    try {
      setReplacingItemId(itemId);
      setSaving(true);
      setError("");
      setInfo("");

      const result = await ordersService.replaceBillingItem(id, itemId, {
        replacementProductId: normalizeStr(nextProductId),
      });

      const nextStatus = result?.order?.status;
      if (nextStatus === "SUBMITTED" && status !== "SUBMITTED") {
        setInfo(
          "Produit remplacé. La commande est repassée en SOUMISE: veuillez régénérer la facture puis renvoyer le SMS.",
        );
      } else {
        setInfo(
          "Produit remplacé. Les totaux de la commande ont été recalculés.",
        );
      }
      await load({ resetDrafts: true });
    } catch (e) {
      setError(
        e?.response?.data?.message || "Impossible de remplacer le produit",
      );
    } finally {
      setSaving(false);
      setReplacingItemId("");
    }
  };

  const actions = {
    handleResendInvoiceNotification,
    handleSaveNotificationContacts,
    doInvoice,
    doEnqueueAs400Request,
    doCorrectAs400Invoice,
    doRelaunchPayment,
    doProof,
    doUploadBankProof,
    doVerifyPayment,
    doCashPay,
    doInitiateWave,
    doSyncWave,
    doSimulateWave,
    doSwitchPaymentToManual,
    doSwitchPaymentToWave,
    doSwitchPaymentToBankTransfer,
    doPrepare,
    doResendConfirmationSms,
    doFulfill,
    doCancel,
    copyWhatsApp,
    doFulfillNoNotification,
    doDownloadDeliveryNote,
    doUpdatePreparationChecklistItem,
    doBulkUpdatePreparationChecklist,
    doCreatePreparationAnomaly,
    doResolvePreparationAnomaly,
    doReplaceBillingItem,
  };
  return Object.fromEntries(
    Object.entries(actions).map(([name, action]) => [
      name,
      async (...args) => {
        if (operationLock.current || !isCurrentOrder()) return;
        operationLock.current = true;
        try {
          return await action(...args);
        } finally {
          operationLock.current = false;
        }
      },
    ]),
  );
}
