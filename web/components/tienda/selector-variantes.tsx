"use client";

import { Comment } from "@gravity-ui/icons";
import { Chip, Label, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { GrupoVariante, VarianteFicha } from "@/lib/catalogo/lecturas";
import { SITIO } from "@/lib/sitio";
import { Precio } from "./precio";

// Reglas del selector: claude/web/variantes-y-stock.md#selector-en-la-ficha
// - opciones agotadas o inexistentes se deshabilitan, no se ocultan
// - la disponibilidad se calcula contra lo ya elegido en los otros grupos
// - la variante elegida vive en la URL (?variante=<id>)

type Props = {
  nombre: string;
  url: string;
  precioAnterior: number | null;
  grupos: GrupoVariante[];
  variantes: VarianteFicha[];
};

function varianteInicial(variantes: VarianteFicha[], id: string | null) {
  return variantes.find((v) => v.id === id) ?? variantes.find((v) => v.stock > 0) ?? variantes[0];
}

export function SelectorVariantes({ nombre, url, precioAnterior, grupos, variantes }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const actual = varianteInicial(variantes, useSearchParams().get("variante"));

  function elegir(grupo: string, slug: string) {
    const deseadas = { ...actual.opciones, [grupo]: slug };
    // Primero la combinación exacta; si no existe, la primera con stock que tenga esa opción.
    const exacta = variantes.find((v) => grupos.every((g) => v.opciones[g.slug] === deseadas[g.slug]));
    const alternativa =
      variantes.find((v) => v.opciones[grupo] === slug && v.stock > 0) ?? variantes.find((v) => v.opciones[grupo] === slug);
    const destino = exacta ?? alternativa;
    if (destino) router.replace(`${pathname}?variante=${destino.id}`, { scroll: false });
  }

  function estadoOpcion(grupo: string, slug: string): "ok" | "agotada" | "inexistente" {
    const deseadas = { ...actual.opciones, [grupo]: slug };
    const v = variantes.find((x) => grupos.every((g) => x.opciones[g.slug] === deseadas[g.slug]));
    if (!v) return "inexistente";
    return v.stock > 0 ? "ok" : "agotada";
  }

  const disponible = actual.stock > 0;
  const mensaje = encodeURIComponent(
    `Hola, me interesa: ${nombre}${actual.etiquetas ? ` — ${actual.etiquetas}` : ""}\n${url}`,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Precio valor={actual.precio} anterior={precioAnterior} className="text-2xl" />
      </div>

      {grupos.map((g) => (
        <div key={g.slug} className="flex flex-col gap-2">
          <Label className="text-sm">
            {g.nombre}: <span className="font-semibold">{g.opciones.find((o) => o.slug === actual.opciones[g.slug])?.valor}</span>
          </Label>
          <ToggleButtonGroup
            aria-label={g.nombre}
            selectionMode="single"
            disallowEmptySelection
            isDetached
            selectedKeys={[actual.opciones[g.slug]]}
            onSelectionChange={(claves) => {
              const [clave] = [...claves];
              if (typeof clave === "string") elegir(g.slug, clave);
            }}
            className="flex flex-wrap gap-2"
          >
            {g.opciones.map((o) => {
              const estado = estadoOpcion(g.slug, o.slug);
              return (
                <ToggleButton
                  key={o.slug}
                  id={o.slug}
                  isDisabled={estado === "inexistente"}
                  aria-label={estado === "agotada" ? `${o.valor} (sin stock)` : o.valor}
                  className={`min-w-12 ${estado === "agotada" ? "text-muted line-through" : ""}`}
                >
                  {o.colorHex && (
                    <span aria-hidden className="size-4 rounded-full ring-1 ring-muted/60" style={{ backgroundColor: o.colorHex }} />
                  )}
                  {o.valor}
                </ToggleButton>
              );
            })}
          </ToggleButtonGroup>
        </div>
      ))}

      <div className="flex flex-col gap-3" aria-live="polite">
        {!disponible ? (
          <Chip variant="secondary" className="self-start">
            Sin stock{grupos.length ? " en esta combinación" : ""}
          </Chip>
        ) : actual.stock <= 3 ? (
          <p className="text-sm text-muted">
            {actual.stock === 1 ? "Última unidad" : `Últimas ${actual.stock} unidades`}
          </p>
        ) : null}

        {SITIO.whatsapp ? (
          <a
            href={`https://wa.me/${SITIO.whatsapp}?text=${mensaje}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!disponible}
            className={`${buttonVariants({ size: "lg", fullWidth: true, variant: disponible ? "primary" : "outline" })}`}
          >
            <Comment />
            {disponible ? "Consultar por WhatsApp" : "Consultar disponibilidad"}
          </a>
        ) : null}
        {actual.sku && <p className="font-mono text-xs text-muted">SKU {actual.sku}</p>}
      </div>
    </div>
  );
}
