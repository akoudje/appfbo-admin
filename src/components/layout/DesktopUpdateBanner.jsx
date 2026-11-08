// Application de bureau : une nouvelle version est téléchargée en arrière-
// plan (electron-updater) mais ne s'installe qu'au redémarrage. Les postes
// restant ouverts toute la journée, on propose de redémarrer tout de suite.

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { installDesktopUpdate, onDesktopUpdateReady } from "../../lib/desktopBridge";

export default function DesktopUpdateBanner() {
  const [update, setUpdate] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => onDesktopUpdateReady((info) => setUpdate(info || { version: "" })), []);

  if (!update || dismissed) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <div className="font-semibold">Une mise à jour de l’application est prête</div>
          <div className="mt-0.5 text-xs">
            Redémarrez quand vous avez un moment (quelques secondes). Sinon, elle s’installera à la prochaine
            fermeture de l’application.
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-blue-50"
        >
          Plus tard
        </button>
        <button
          type="button"
          disabled={installing}
          onClick={() => {
            setInstalling(true);
            installDesktopUpdate().catch(() => setInstalling(false));
          }}
          className="rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {installing ? "Redémarrage…" : "Redémarrer maintenant"}
        </button>
      </div>
    </div>
  );
}
