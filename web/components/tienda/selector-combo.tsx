"use client";

import { CircleCheck, CircleXmark } from "@gravity-ui/icons";
import { Label, NumberField, ToggleButton, ToggleButtonGroup } from "@heroui/react";
import Image from "next/image";
import NextLink from "next/link";
import { useState } from "react";
import { BotonAgregar } from "@/components/carrito/boton-agregar";
import type { ItemCombo } from "@/lib/catalogo/combos";
import { estadoOpcion, varianteAlElegir, varianteInicial } from "@/lib/catalogo/variantes";
import { formatearPrecio } from "@/lib/formato";
import { urlPublica } from "@/lib/supabase/storage";

// Un selector por producto del combo, con las reglas de la ficha (lib/catalogo/variantes.ts)
// pero contra la cantidad del ítem. Las variantes van al carrito EN EL ORDEN de `items`:
// cotizar las empareja por posición. Ver claude/web/combos.md
export function SelectorCombo({
  id,
  nombre,
  precio,
  precioItems,
  items,
}: {
  id: string;
  nombre: string;
  precio: number;
  precioItems: number;
  items: ItemCombo[];
}) {
  const [elegidas, setElegidas] = useState(() => items.map((i) => varianteInicial(i.variantes, null, i.cantidad)?.id ?? ""));
  const [cantidad, setCantidad] = useState(1);

  const actuales = items.map((i, n) => i.variantes.find((v) => v.id === elegidas[n]) ?? i.variantes[0]);
  // Cuántos combos alcanzan con las variantes elegidas.
  const maximo = Math.min(20, ...items.map((i, n) => Math.floor((actuales[n]?.stock ?? 0) / i.cantidad)));
  const disponible = maximo > 0;
  const ahorro = precioItems - precio;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-border p-4 sm:p-5">
        <p className="mb-1 text-xs text-muted">Precio del combo</p>
        <div className="flex flex-wrap items-center gap-2">
          {ahorro > 0 && <span className="text-sm text-muted line-through tabular-nums">{formatearPrecio(precioItems)}</span>}
          {ahorro > 0 && (
            <span className="rounded bg-ahorro px-1.5 py-0.5 text-xs font-semibold text-ahorro-foreground tabular-nums">
              Ahorrás {formatearPrecio(ahorro)}
            </span>
          )}
        </div>
        <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatearPrecio(precio)}</p>
        {ahorro > 0 && <p className="mt-1 text-xs text-muted">Tachado: los productos por separado, a precio de lista.</p>}
      </div>

      <ol className="flex flex-col divide-y divide-separator rounded-xl border border-border">
        {items.map((item, n) => {
          const actual = actuales[n];
          const sinStock = !actual || actual.stock < item.cantidad;
          return (
            <li key={item.productoId} className="flex gap-3 p-3 sm:p-4">
              <div className="relative aspect-[4/5] w-16 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                {item.imagen && <Image src={urlPublica(item.imagen.path)} alt="" fill sizes="64px" className="object-cover" />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="text-sm">
                  {item.cantidad > 1 && <span className="font-semibold">{item.cantidad} × </span>}
                  <NextLink href={`/p/${item.slug}`} className="hover:underline hover:underline-offset-4">
                    {item.nombre}
                  </NextLink>
                </p>
                {actual &&
                  item.grupos.map((g) => (
                    <ToggleButtonGroup
                      key={g.slug}
                      aria-label={`${g.nombre} de ${item.nombre}`}
                      selectionMode="single"
                      disallowEmptySelection
                      isDetached
                      size="sm"
                      selectedKeys={[actual.opciones[g.slug]]}
                      onSelectionChange={(claves) => {
                        const [clave] = [...claves];
                        if (typeof clave !== "string") return;
                        const destino = varianteAlElegir(item.variantes, item.grupos, actual, g.slug, clave, item.cantidad);
                        if (destino) setElegidas((e) => e.map((x, k) => (k === n ? destino.id : x)));
                      }}
                      className="flex flex-wrap gap-1.5"
                    >
                      {g.opciones.map((o) => {
                        const estado = estadoOpcion(item.variantes, item.grupos, actual, g.slug, o.slug, item.cantidad);
                        return (
                          <ToggleButton
                            key={o.slug}
                            id={o.slug}
                            isDisabled={estado === "inexistente"}
                            aria-label={estado === "agotada" ? `${o.valor} (sin stock)` : o.valor}
                            className={`min-w-10 ${estado === "agotada" ? "text-muted line-through" : ""}`}
                          >
                            {o.colorHex && (
                              <span aria-hidden className="size-3.5 rounded-full ring-1 ring-muted/60" style={{ backgroundColor: o.colorHex }} />
                            )}
                            {o.valor}
                          </ToggleButton>
                        );
                      })}
                    </ToggleButtonGroup>
                  ))}
                {sinStock && <p className="text-xs text-muted">Sin stock en esta combinación</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="flex items-center gap-2 text-sm" aria-live="polite">
        {disponible ? (
          <>
            <CircleCheck aria-hidden className="size-4" />
            {maximo <= 3 ? (maximo === 1 ? "Último combo disponible" : `Últimos ${maximo} combos`) : "Stock disponible"}
          </>
        ) : (
          <>
            <CircleXmark aria-hidden className="size-4 text-muted" />
            <span className="text-muted">Sin stock con lo elegido</span>
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
            combo={{ id, variantes: actuales.map((v) => v?.id ?? "") }}
            nombre={nombre}
            cantidad={Math.min(cantidad, Math.max(maximo, 1))}
            isDisabled={!disponible}
            size="lg"
          />
        </div>
      </div>
    </div>
  );
}
