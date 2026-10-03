"use client";

import { Description, Input, Label, ListBox, Select, TextField } from "@heroui/react";
import { useState } from "react";

export type CategoriaDestino = { slug: string; nombre: string };

const FIJOS = [
  { id: "/catalogo", nombre: "Todos los productos" },
  { id: "/ofertas", nombre: "Ofertas" },
  { id: "/combos", nombre: "Combos" },
];
const NINGUNO = "ninguno";
const OTRA = "otra";

/**
 * "¿A dónde lleva el botón?" sin escribir rutas: páginas fijas, categorías, o pegar
 * cualquier link (de la propia tienda se guarda sólo la ruta, ver guardarBanner).
 * Devuelve el `enlace` del banner ("" = sin botón).
 */
export function DestinoBanner({
  enlace,
  onChange,
  categorias,
}: {
  enlace: string;
  onChange: (enlace: string) => void;
  categorias: CategoriaDestino[];
}) {
  const opciones = [...FIJOS, ...categorias.map((c) => ({ id: `/catalogo?cat=${c.slug}`, nombre: `Categoría: ${c.nombre}` }))];
  const inicial = !enlace ? NINGUNO : opciones.some((o) => o.id === enlace) ? enlace : OTRA;
  const [eleccion, setEleccion] = useState(inicial);

  return (
    <div className="flex flex-col gap-3">
      <Select
        value={eleccion}
        onChange={(v) => {
          if (typeof v !== "string") return;
          setEleccion(v);
          onChange(v === NINGUNO ? "" : v === OTRA ? (inicial === OTRA ? enlace : "") : v);
        }}
      >
        <Label>Al tocar el botón, lleva a</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            <ListBox.Item id={NINGUNO} textValue="Ningún lado (sin botón)">
              Ningún lado (sin botón)
              <ListBox.ItemIndicator />
            </ListBox.Item>
            {opciones.map((o) => (
              <ListBox.Item key={o.id} id={o.id} textValue={o.nombre}>
                {o.nombre}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
            <ListBox.Item id={OTRA} textValue="Otra página (pegar el link)">
              Otra página (pegar el link)
              <ListBox.ItemIndicator />
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
      {eleccion === OTRA && (
        <TextField value={enlace} onChange={onChange} maxLength={300}>
          <Label>Link</Label>
          <Input placeholder="Pegá el link de la página" />
          <Description>Abrí en la tienda la página que querés (un producto, una búsqueda con filtros…) y copiá el link de arriba.</Description>
        </TextField>
      )}
    </div>
  );
}
