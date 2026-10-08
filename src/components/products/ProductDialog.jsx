import { useEffect, useRef } from "react";
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
        className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl outline-none"
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
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 id="product-dialog-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fermer"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border px-3 py-1"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
