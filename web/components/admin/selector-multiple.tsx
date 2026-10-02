"use client";

import { ComboBox, Input, Label, ListBox, Tag, TagGroup } from "@heroui/react";
import { useMemo, useState } from "react";

const MAX_OPCIONES = 50;

/**
 * Chips de lo elegido + ComboBox para agregar, sobre una lista fija de opciones.
 * Para etiquetas de producto (con "Crear «…»") está productos/selector-etiquetas.
 */
export function SelectorMultiple({
  etiqueta,
  opciones,
  seleccionadas,
  onChange,
  placeholder = "Buscar…",
}: {
  etiqueta: string;
  opciones: { id: string; nombre: string }[];
  seleccionadas: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState("");
  const porId = useMemo(() => new Map(opciones.map((o) => [o.id, o])), [opciones]);
  const buscado = texto.trim().toLowerCase();
  const visibles = opciones
    .filter((o) => !seleccionadas.includes(o.id) && (!buscado || o.nombre.toLowerCase().includes(buscado)))
    .slice(0, MAX_OPCIONES);

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">{etiqueta}</Label>
      {seleccionadas.length > 0 && (
        <TagGroup aria-label={`${etiqueta} elegidas`} onRemove={(claves) => onChange(seleccionadas.filter((id) => !claves.has(id)))}>
          <TagGroup.List>
            {seleccionadas.map((id) => (
              <Tag key={id} id={id} textValue={porId.get(id)?.nombre ?? id}>
                {porId.get(id)?.nombre ?? "…"}
                <Tag.RemoveButton />
              </Tag>
            ))}
          </TagGroup.List>
        </TagGroup>
      )}
      <ComboBox
        aria-label={`Agregar: ${etiqueta.toLowerCase()}`}
        inputValue={texto}
        onInputChange={setTexto}
        selectedKey={null}
        onSelectionChange={(clave) => {
          if (clave === null) return;
          onChange([...seleccionadas, String(clave)]);
          setTexto("");
        }}
        // Filtramos acá (y cortamos a MAX_OPCIONES): la lista de productos puede ser larga.
        defaultFilter={() => true}
        allowsEmptyCollection
      >
        <ComboBox.InputGroup>
          <Input placeholder={placeholder} />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox renderEmptyState={() => <p className="p-3 text-sm text-muted">Sin resultados.</p>}>
            {visibles.map((o) => (
              <ListBox.Item key={o.id} id={o.id} textValue={o.nombre}>
                {o.nombre}
              </ListBox.Item>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </div>
  );
}
