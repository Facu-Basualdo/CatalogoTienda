"use client";

import { Label, ListBox, Select } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { conCambios, ORDENES, urlDeFiltros, type Filtros, type Orden } from "@/lib/catalogo/filtros";

export function SelectorOrden({ filtros }: { filtros: Filtros }) {
  const router = useRouter();
  const [, iniciar] = useTransition();
  // "Relevancia" sólo tiene sentido con una búsqueda.
  const opciones = (Object.keys(ORDENES) as Orden[]).filter((o) => o !== "relevancia" || filtros.q);

  return (
    <Select
      aria-label="Ordenar por"
      value={filtros.orden}
      onChange={(valor) => {
        if (typeof valor !== "string") return;
        iniciar(() =>
          router.replace(urlDeFiltros(conCambios(filtros, { orden: valor as Orden })), { scroll: false }),
        );
      }}
      className="w-44 sm:w-48"
    >
      <Label className="sr-only">Ordenar por</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {opciones.map((o) => (
            <ListBox.Item key={o} id={o} textValue={ORDENES[o]}>
              {ORDENES[o]}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
