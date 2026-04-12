import React from "react";

export function InfoDialog({
  open,
  title = "Information",
  message = "",
  closeLabel = "Fermer",
  onClose,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <p className="mt-2 text-sm text-gray-700">{message}</p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
            >
              {closeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TextPromptDialog({
  open,
  title = "Saisie",
  description = "",
  label = "Valeur",
  initialValue = "",
  placeholder = "",
  cancelLabel = "Annuler",
  confirmLabel = "Valider",
  onCancel,
  onConfirm,
}) {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    if (!open) return;
    setValue(initialValue || "");
  }, [initialValue, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {description ? <p className="mt-1 text-xs text-gray-500">{description}</p> : null}

          <div className="mt-4">
            <label className="mb-1 block text-xs font-medium text-gray-700">{label}</label>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder={placeholder}
              autoFocus
            />
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => onConfirm?.(value)}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
