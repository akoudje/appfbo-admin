import { createContext } from "react";

// Contexte partagé par DialogProvider.jsx (composant) et hooks/useDialogs.js
// (hooks useConfirm/usePrompt) — séparé dans son propre fichier non-JSX pour
// que le Fast Refresh de Vite reste heureux (une paire fichier composant /
// fichier hooks ne doit exporter qu'un seul type de chose chacun).
export const DialogContext = createContext(null);
