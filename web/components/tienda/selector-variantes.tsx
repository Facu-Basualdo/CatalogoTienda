"use client";

import { CircleCheck, CircleXmark, Comment } from "@gravity-ui/icons";
import { Label, NumberField, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BotonAgregar } from "@/components/carrito/boton-agregar";
import type { GrupoVariante, VarianteFicha } from "@/lib/catalogo/lecturas";
import { SITIO } from "@/lib/sitio";
import { Precio } from "./precio";

// Reglas del selector: claude/web/variantes-y-stock.md#selector-en-la-ficha
// - nunca se ocultan opciones: agotada = tachada y elegible, inexistente = deshabilitada
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
  const [cantidad, setCantidad] = useState(1);

  function elegir(grupo: string, slug: string) {
    const deseadas = { ...actual.opciones, [grupo]: slug };
    // Primero la combinación exacta; si no existe, la primera con stock que tenga esa opción.
    const exacta = variantes.find((v) => grupos.every((g) => v.opciones[g.slug] === deseadas[g.slug]));
    const alternativa =
      variantes.find((v) => v.opciones[grupo] === slug && v.stock > 0) ?? variantes.find((v) => v.opciones[grupo] === slug);
    const destino = exacta ?? alternativa;
    if (destino) {
      setCantidad(1);
      router.replace(`${pathname}?variante=${destino.id}`, { scroll: false });
    }
  }

  function estadoOpcion(grupo: string, slug: string): "ok" | "agotada" | "inexistente" {
    const deseadas = { ...actual.opciones, [grupo]: slug };
    const v = variantes.find((x) => grupos.every((g) => x.opciones[g.slug] === deseadas[g.slug]));
    if (!v) return "inexistente";
    return v.stock > 0 ? "ok" : "agotada";
  }

  const disponible = actual.stock > 0;
  const maximo = Math.min(actual.stock, 20);
  const mensaje = encodeURIComponent(
    `Hola, tengo una consulta sobre: ${nombre}${actual.etiquetas ? ` — ${actual.etiquetas}` : ""}\n${url}`,
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border p-4 sm:p-5">
        <p className="mb-1 text-xs text-muted">Precio</p>
        <Precio valor={actual.precio} anterior={precioAnterior} tamano="lg" />
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

      <p className="flex items-center gap-2 text-sm" aria-live="polite">
        {disponible ? (
          <>
            <CircleCheck aria-hidden className="size-4" />
            {actual.stock <= 3
              ? actual.stock === 1
                ? "Última unidad disponible"
                : `Últimas ${actual.stock} unidades`
              : "Stock disponible"}
          </>
        ) : (
          <>
            <CircleXmark aria-hidden className="size-4 text-muted" />
            <span className="text-muted">Sin stock{grupos.length ? " en esta combinación" : ""}</span>
          </>
        )}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        {disponible && maximo > 1 && (
          <NumberField
            aria-label="Cantidad"
            value={Math.min(cantidad, maximo)}
            onChange={(v) => setCantidad(v && v > 0 ? v : 1)}
            minValue={1}
            maxValue={maximo}
            className="w-full sm:w-36"
          >
            <Label className="text-xs text-muted">Cantidad</Label>
            <NumberField.Group>
              <NumberField.DecrementButton />
              <NumberField.Input />
              <NumberField.IncrementButton />
            </NumberField.Group>
          </NumberField>
        )}
        <div className="flex-1">
          <BotonAgregar
            varianteId={actual.id}
            nombre={nombre}
            cantidad={Math.min(cantidad, maximo)}
            isDisabled={!disponible}
            size="lg"
          />
        </div>
      </div>

      {SITIO.whatsapp && (
        <a
          href={`https://wa.me/${SITIO.whatsapp}?text=${mensaje}`}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", fullWidth: true })}
        >
          <Comment />
          {disponible ? "Consultar por WhatsApp" : "Consultar disponibilidad"}
        </a>
      )}

      {actual.sku && (
        <p className="self-start rounded-full bg-surface-secondary px-3 py-1 font-mono text-xs text-muted">SKU {actual.sku}</p>
      )}
    </div>
  );
}
