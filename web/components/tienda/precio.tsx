import { formatearPrecio } from "@/lib/formato";

// Precio anterior tachado en gris, nunca en rojo: ver claude/web/tema-y-marca.md
export function Precio({
  valor,
  anterior,
  desde = false,
  className,
}: {
  valor: number;
  anterior?: number | null;
  desde?: boolean;
  className?: string;
}) {
  const oferta = anterior != null && anterior > valor;
  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 ${className ?? ""}`}>
      {desde && <span className="text-sm text-muted">Desde</span>}
      <span className="font-semibold tabular-nums">{formatearPrecio(valor)}</span>
      {oferta && (
        <span className="text-sm text-muted line-through tabular-nums">
          <span className="sr-only">Antes </span>
          {formatearPrecio(anterior)}
        </span>
      )}
    </p>
  );
}
