import { useEffect, useRef } from "react";
import { X } from "lucide-react";
export default function ProductDialog({
  title,
  onClose,
  busy = false,
  children,
}) {
  const ref = useRef(null),
    closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) closeRef.current();
      }}
    >
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-dialog-title"
        className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl outline-none"
        onKeyDown={(e) => {
          if (e.key === "Escape" && !busy) closeRef.current();
          if (e.key === "Tab") {
            const nodes = [
              ...ref.current.querySelectorAll(
                "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]",
              ),
            ];
            const first = nodes[0],
              last = nodes.at(-1);
            if (
              e.shiftKey &&
              (document.activeElement === first ||
                document.activeElement === ref.current)
            ) {
              e.preventDefault();
              last?.focus();
            } else if (
              !e.shiftKey &&
              (document.activeElement === last ||
                document.activeElement === ref.current)
            ) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 bg-gray-950 p-4 text-white">
          <h2
            id="product-dialog-title"
            className="min-w-0 text-xl font-semibold"
          >
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fermer"
            disabled={busy}
            onClick={onClose}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-600 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#FFC600]/40 disabled:opacity-50"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}
