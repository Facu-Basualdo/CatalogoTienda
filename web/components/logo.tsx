import { SITIO } from "@/lib/sitio";

// Monograma + nombre. Todo en currentColor para que se invierta en modo oscuro.
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6 shrink-0">
        <rect x="1" y="1" width="22" height="22" rx="3" fill="currentColor" />
        <path d="M7 8h10M12 8v9" stroke="var(--background)" strokeWidth="2.5" strokeLinecap="square" />
      </svg>
      <span className="text-lg font-semibold tracking-tight">{SITIO.nombre}</span>
    </span>
  );
}
