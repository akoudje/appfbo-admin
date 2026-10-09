import { Package } from "lucide-react";

export default function ProductPageHeader({ title, description, children }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-gray-950 p-5 text-white">
      <div className="min-w-0 flex-1 basis-full sm:basis-0">
        <div className="flex items-start gap-2">
          <Package size={24} aria-hidden="true" className="mt-1 shrink-0" />
          <h1 className="break-words text-2xl font-semibold">{title}</h1>
        </div>
        <p className="mt-2 text-sm text-gray-300">{description}</p>
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      )}
    </header>
  );
}
