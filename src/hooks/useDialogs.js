import { useContext } from "react";
import { DialogContext } from "../components/ui/dialogContext";

function useDialogContext(hookName) {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error(`${hookName} doit être utilisé sous <DialogProvider>.`);
  return ctx;
}

/**
 * Remplace window.confirm() par une boîte de dialogue stylée.
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm("Supprimer cet élément ?"))) return;
 *   // ou, pour un contrôle plus fin :
 *   if (!(await confirm({ title: "Supprimer ?", message: "...", tone: "danger" }))) return;
 *
 * Résout à true (confirmé) ou false (annulé / fermé au clic extérieur / Échap).
 */
export function useConfirm() {
  return useDialogContext("useConfirm").confirm;
}

/**
 * Remplace window.prompt() par une boîte de dialogue stylée.
 *
 *   const promptText = usePrompt();
 *   const value = await promptText("Motif ?", defaultValue);
 *   if (value === null) return; // annulé, comme window.prompt()
 *
 * Résout à la valeur saisie (string, éventuellement vide) ou null si annulé.
 */
export function usePrompt() {
  return useDialogContext("usePrompt").promptText;
}
