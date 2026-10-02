"use client";

import { ComboBox, Input, Label, ListBox, Tag, TagGroup, toast } from "@heroui/react";
import { useMemo, useState, useTransition } from "react";
import { crearEtiqueta } from "@/app/admin/(panel)/productos/acciones";
import type { EtiquetaAdmin, GrupoAdmin } from "@/lib/admin/productos";
import { slugify } from "@/lib/slug";

const CREAR = "__crear__";

/**
 * Chips de las etiquetas elegidas + ComboBox para agregar. Si el texto no coincide con
 * ninguna (comparando por slug: "144hz" = "144 Hz"), ofrece "Crear «…»".
 * Ver claude/web/etiquetas.md#en-el-dashboard
 */
export function SelectorEtiquetas({
  grupo,
  seleccionadas,
  onChange,
  onEtiquetaCreada,
  unica = false,
}: {
  grupo: GrupoAdmin;
  seleccionadas: string[];
  onChange: (ids: string[]) => void;
  onEtiquetaCreada: (grupoId: string, etiqueta: EtiquetaAdmin) => void;
  /** Una sola (marca): elegir otra reemplaza la actual. */
  unica?: boolean;
}) {
  const [texto, setTexto] = useState("");
  const [creando, iniciar] = useTransition();
  const porId = useMemo(() => new Map(grupo.etiquetas.map((e) => [e.id, e])), [grupo.etiquetas]);

  const slugTexto = slugify(texto);
  const opciones = grupo.etiquetas.filter(
    (e) => !seleccionadas.includes(e.id) && (!texto || e.valor.toLowerCase().includes(texto.toLowerCase()) || e.slug.includes(slugTexto)),
  );
  const existeExacta = grupo.etiquetas.some((e) => e.slug === slugTexto);
  const puedeCrear = texto.trim().length > 0 && slugTexto.length > 0 && !existeExacta;

  const agregar = (id: string) => onChange(unica ? [id] : [...seleccionadas, id]);

  function elegir(clave: string | number | null) {
    if (clave === null) return;
    if (clave === CREAR) {
      const valor = texto.trim();
      iniciar(async () => {
        const r = await crearEtiqueta(grupo.id, valor);
        if (!r.ok) {
          toast.danger(r.error);
          return;
        }
        const nueva = { id: r.datos.id, valor: r.datos.valor, slug: r.datos.slug, orden: 999, colorHex: null };
        if (r.datos.creada) onEtiquetaCreada(grupo.id, nueva);
        if (!seleccionadas.includes(nueva.id)) agregar(nueva.id);
        setTexto("");
      });
      return;
    }
    agregar(String(clave));
    setTexto("");
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium">{grupo.nombre}</Label>
      {seleccionadas.length > 0 && (
        <TagGroup
          aria-label={`${grupo.nombre} elegidas`}
          onRemove={(claves) => onChange(seleccionadas.filter((id) => !claves.has(id)))}
        >
          <TagGroup.List>
            {seleccionadas.map((id) => (
              <Tag key={id} id={id} textValue={porId.get(id)?.valor ?? id}>
                {porId.get(id)?.colorHex && (
                  <span aria-hidden className="size-3 rounded-full ring-1 ring-muted/60" style={{ backgroundColor: porId.get(id)?.colorHex ?? undefined }} />
                )}
                {porId.get(id)?.valor ?? "…"}
                <Tag.RemoveButton />
              </Tag>
            ))}
          </TagGroup.List>
        </TagGroup>
      )}
      <ComboBox
        aria-label={`Agregar ${grupo.nombre.toLowerCase()}`}
        inputValue={texto}
        onInputChange={setTexto}
        selectedKey={null}
        onSelectionChange={elegir}
        // El filtrado lo hacemos nosotros (por texto y por slug) y el ítem "Crear" tiene
        // que quedar siempre visible.
        defaultFilter={() => true}
        isDisabled={creando}
        allowsEmptyCollection
      >
        <ComboBox.InputGroup>
          <Input placeholder={unica && seleccionadas.length ? "Cambiar…" : "Buscar o crear…"} />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox renderEmptyState={() => <p className="p-3 text-sm text-muted">Escribí para crear un valor nuevo.</p>}>
            {[
              ...opciones.map((e) => (
                <ListBox.Item key={e.id} id={e.id} textValue={e.valor}>
                  {e.valor}
                </ListBox.Item>
              )),
              ...(puedeCrear
                ? [
                    <ListBox.Item key={CREAR} id={CREAR} textValue={`Crear ${texto}`}>
                      Crear «{texto.trim()}»
                    </ListBox.Item>,
                  ]
                : []),
            ]}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
    </div>
  );
}
