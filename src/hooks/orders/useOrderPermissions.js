import { AdminRole, Permission } from "../../auth/permissions";
import { usePermission } from "../usePermission";

export function orderPolicy(order, role, access = {}, saving = false) {
  access = {
    billing: Boolean(access.billing),
    payment: Boolean(access.payment),
    preparation: Boolean(access.preparation),
    cancel: Boolean(access.cancel),
  };
  const status = order?.status,
    paymentStatus = order?.paymentStatus;
  const mode = String(order?.preorderPaymentMode || order?.paymentMode || "")
    .trim()
    .toUpperCase();
  const provider = String(order?.paymentProvider || "")
    .trim()
    .toUpperCase();
  const bank = ["BANK_TRANSFER", "ECOBANK_PAY", "PI_SPI"].includes(mode);
  const isCash =
    !bank &&
    (mode.includes("ESPE") ||
      mode.includes("CASH") ||
      (!mode && provider === "MANUAL"));
  const isWave =
    !bank &&
    (provider === "WAVE" ||
      (provider !== "MANUAL" &&
        (mode.includes("MOBILE") ||
          mode.includes("WAVE") ||
          mode.includes("MOMO"))));
  const isGlobalAdmin = [AdminRole.SUPER_ADMIN, AdminRole.TECH_ADMIN].includes(
    role,
  );
  const unpaid = paymentStatus !== "PAID";
  const blocked =
    order?.billingEscalationType === "AS400_CERTIFICATION_MISSING" &&
    ["OPEN", "REPORTED"].includes(order?.as400CertificationStatus);
  return {
    status,
    paymentStatus,
    isCash,
    isWave,
    isAutoPayment: isWave,
    isGlobalAdmin,
    canAccessBilling: access.billing,
    canAccessPayment: access.payment,
    canAccessPreparation: access.preparation,
    canAccessCancel: access.cancel,
    canInvoice: access.billing && status === "SUBMITTED",
    canEnqueueAs400Request: access.billing && status === "SUBMITTED",
    canCorrectAs400Invoice:
      access.billing &&
      Boolean(order?.factureReference || order?.invoicedAt) &&
      unpaid &&
      !["PAID", "READY", "FULFILLED", "CANCELLED"].includes(status),
    canReplaceBillingItems:
      access.billing &&
      [
        "SUBMITTED",
        "INVOICED",
        "PAYMENT_PENDING",
        "PAYMENT_PROOF_RECEIVED",
      ].includes(status),
    canSwitchPaymentToCash:
      isGlobalAdmin &&
      (isWave || bank) &&
      unpaid &&
      [
        "SUBMITTED",
        "INVOICED",
        "PAYMENT_PENDING",
        "PAYMENT_PROOF_RECEIVED",
      ].includes(status),
    canSwitchPaymentToWave:
      isGlobalAdmin &&
      isCash &&
      unpaid &&
      ["INVOICED", "PAYMENT_PENDING"].includes(status),
    canSwitchPaymentToBankTransfer:
      isGlobalAdmin &&
      mode !== "BANK_TRANSFER" &&
      unpaid &&
      ["INVOICED", "PAYMENT_PENDING"].includes(status),
    canFulfillNoNotification:
      [
        AdminRole.SUPER_ADMIN,
        AdminRole.TECH_ADMIN,
        AdminRole.OPERATIONS_DIRECTOR,
      ].includes(role) &&
      paymentStatus === "PAID" &&
      ["PAID", "READY"].includes(status),
    canProof:
      ["INVOICED", "PAYMENT_PENDING"].includes(status) &&
      unpaid &&
      !isCash &&
      !isWave,
    canVerify:
      access.payment &&
      ["INVOICED", "PAYMENT_PENDING", "PAYMENT_PROOF_RECEIVED"].includes(
        status,
      ) &&
      unpaid,
    canPrepare:
      access.preparation &&
      status === "PAID" &&
      Boolean(order?.preparationLaunchedAt) &&
      !blocked,
    canFulfill: access.preparation && status === "READY",
    canCancel:
      access.cancel &&
      Boolean(status) &&
      !["FULFILLED", "CANCELLED"].includes(status),
    canCashPay:
      access.payment &&
      isCash &&
      ["SUBMITTED", "INVOICED", "PAYMENT_PENDING"].includes(status) &&
      !saving,
  };
}
export default function useOrderPermissions(order, role, saving) {
  const billing = usePermission(Permission.INVOICE_CREATE),
    payment = usePermission(Permission.PAYMENT_VALIDATE),
    preparation = usePermission(Permission.PREPARATION_UPDATE),
    cancel = usePermission(Permission.PREORDER_UPDATE_STATUS);
  return orderPolicy(
    order,
    role,
    { billing, payment, preparation, cancel },
    saving,
  );
}
