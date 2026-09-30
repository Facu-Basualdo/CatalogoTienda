import { formatearPrecio } from "@/lib/formato";

/** "-$ 18.880": el único elemento con color de la interfaz (verde de ahorro). */
export function ChipAhorro({ monto, className }: { monto: number; className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-ahorro px-1.5 py-0.5 text-xs font-semibold tabular-nums text-ahorro-foreground ${className ?? ""}`}
    >
      <span className="sr-only">Ahorrás </span>-{formatearPrecio(monto)}
    </span>
  );
}

// Precio anterior tachado en gris + ahorro en verde. Ver claude/web/tema-y-marca.md
export function Precio({
  valor,
  anterior,
  desde = false,
  tamano = "md",
  className,
}: {
  valor: number;
  anterior?: number | null;
  desde?: boolean;
  tamano?: "md" | "lg";
  className?: string;
}) {
  const oferta = anterior != null && anterior > valor;
  return (
    <div className={`flex flex-col gap-1 ${className ?? ""}`}>
      {oferta && (
        <p className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted line-through tabular-nums">
            <span className="sr-only">Antes </span>
            {formatearPrecio(anterior)}
          </span>
          <ChipAhorro monto={anterior - valor} />
        </p>
      )}
      <p className="flex flex-wrap items-baseline gap-x-2">
        {desde && <span className="text-sm text-muted">Desde</span>}
        <span className={`font-semibold tabular-nums tracking-tight ${tamano === "lg" ? "text-3xl" : "text-xl"}`}>
          {formatearPrecio(valor)}
        </span>
      </p>
    </div>
  );
}
