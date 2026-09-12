import React from "react";
import { ConfirmDialog, TextPromptDialog } from "./Dialogs";
import { DialogContext } from "./dialogContext";

// Remplace window.confirm()/window.prompt() par des boîtes de dialogue
// stylées, tout en gardant un usage aussi direct que les fonctions natives :
//
//   const confirm = useConfirm();
//   if (!(await confirm("Supprimer cet élément ?"))) return;
//
//   const promptText = usePrompt();
//   const value = await promptText("Motif ?", defaultValue);
//   if (value === null) return; // annulé, comme window.prompt()
//
// (hooks dans hooks/useDialogs.js). Un seul <DialogProvider> est monté à la
// racine de l'app (voir App.jsx) ; les hooks pilotent son état via le
// contexte, pas de <ConfirmDialog> à gérer soi-même dans chaque page pour le
// cas simple "confirmer puis agir".
export function DialogProvider({ children }) {
  const [confirmState, setConfirmState] = React.useState(null);
  const [promptState, setPromptState] = React.useState(null);

  const confirm = React.useCallback((optionsOrMessage) => {
    const options =
      typeof optionsOrMessage === "string" ? { message: optionsOrMessage } : optionsOrMessage || {};
    return new Promise((resolve) => {
      setConfirmState({ options, resolve });
    });
  }, []);

  const promptText = React.useCallback((optionsOrMessage, initialValue) => {
    const options =
      typeof optionsOrMessage === "string"
        ? { label: optionsOrMessage, initialValue: initialValue ?? "" }
        : { initialValue: initialValue ?? "", ...optionsOrMessage };
    return new Promise((resolve) => {
      setPromptState({ options, resolve });
    });
  }, []);

  const contextValue = React.useMemo(() => ({ confirm, promptText }), [confirm, promptText]);

  function settleConfirm(result) {
    confirmState?.resolve?.(result);
    setConfirmState(null);
  }

  function settlePrompt(result) {
    promptState?.resolve?.(result);
    setPromptState(null);
  }

  return (
    <DialogContext.Provider value={contextValue}>
      {children}

      <ConfirmDialog
        open={Boolean(confirmState)}
        {...(confirmState?.options || {})}
        onCancel={() => settleConfirm(false)}
        onConfirm={() => settleConfirm(true)}
      />

      <TextPromptDialog
        open={Boolean(promptState)}
        {...(promptState?.options || {})}
        onCancel={() => settlePrompt(null)}
        onConfirm={(value) => settlePrompt(value)}
      />
    </DialogContext.Provider>
  );
}
