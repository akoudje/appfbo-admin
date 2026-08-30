import React from "react";
import { AlertTriangle, HelpCircle, Info, Loader2 } from "lucide-react";

// Icône + couleurs par ton — même langage visuel que
// preparation/FulfillNoNotificationDialog.jsx (référence "pro" du projet) :
// pastille circulaire colorée, titre centré, bouton de confirmation assorti.
const TONES = {
  danger: {
    Icon: AlertTriangle,
    iconWrap: "bg-red-100 text-red-600",
    confirmButton: "bg-red-600 hover:bg-red-700 focus-visible:outline-red-600",
  },
  warning: {
    Icon: AlertTriangle,
    iconWrap: "bg-amber-100 text-amber-600",
    confirmButton: "bg-amber-600 hover:bg-amber-700 focus-visible:outline-amber-600",
  },
  info: {
    Icon: Info,
    iconWrap: "bg-blue-100 text-blue-600",
    confirmButton: "bg-gray-900 hover:bg-gray-800 focus-visible:outline-gray-900",
  },
  question: {
    Icon: HelpCircle,
    iconWrap: "bg-gray-100 text-gray-600",
    confirmButton: "bg-gray-900 hover:bg-gray-800 focus-visible:outline-gray-900",
  },
};

function useEscToClose(open, disabled, onEsc) {
  React.useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !disabled) onEsc?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, disabled, onEsc]);
}

export function InfoDialog({
  open,
  title = "Information",
  message = "",
  closeLabel = "Fermer",
  onClose,
}) {
  useEscToClose(open, false, onClose);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-700">{message}</p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Remplacement stylé de window.confirm(). Utiliser via le hook useConfirm()
 * (components/ui/DialogProvider.jsx) plutôt qu'en direct dans la plupart des
 * cas — ce composant reste exporté pour les rares écrans qui gèrent déjà
 * leur propre état d'ouverture (ex : confirmation avec état "busy" pendant
 * un appel réseau, cf preparation/FulfillNoNotificationDialog.jsx).
 */
export function ConfirmDialog({
  open,
  tone = "question",
  title,
  message = "",
  detail = null,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  busy = false,
  error = "",
  onCancel,
  onConfirm,
}) {
  useEscToClose(open, busy, onCancel);
  if (!open) return null;

  const { Icon, iconWrap, confirmButton } = TONES[tone] || TONES.question;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel?.()}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${iconWrap}`}>
            <Icon className="h-7 w-7" />
          </div>

          {title ? (
            <h2 id="confirm-dialog-title" className="text-center text-lg font-semibold text-gray-900">
              {title}
            </h2>
          ) : null}
          <p
            id="confirm-dialog-message"
            className={`text-center text-sm text-gray-600 ${title ? "mt-2" : ""}`}
          >
            {message}
          </p>
          {detail ? <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-4">{detail}</div> : null}

          {error ? (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={busy}
              autoFocus
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${confirmButton}`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Remplacement stylé de window.prompt(). Utiliser via le hook usePrompt()
 * (components/ui/DialogProvider.jsx) dans la plupart des cas.
 */
export function TextPromptDialog({
  open,
  title = "Saisie",
  description = "",
  label = "Valeur",
  initialValue = "",
  placeholder = "",
  multiline = false,
  required = false,
  cancelLabel = "Annuler",
  confirmLabel = "Valider",
  busy = false,
  error = "",
  onCancel,
  onConfirm,
}) {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    if (!open) return;
    setValue(initialValue || "");
  }, [initialValue, open]);

  useEscToClose(open, busy, onCancel);
  if (!open) return null;

  const InputTag = multiline ? "textarea" : "input";
  const canConfirm = !busy && (!required || value.trim());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && !busy && onCancel?.()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="prompt-dialog-title"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canConfirm) onConfirm?.(value);
        }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 id="prompt-dialog-title" className="text-base font-semibold text-gray-900">
          {title}
        </h3>
        {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
          <InputTag
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-200"
            placeholder={placeholder}
            rows={multiline ? 3 : undefined}
            disabled={busy}
            autoFocus
          />
        </div>

        {error ? (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={!canConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
