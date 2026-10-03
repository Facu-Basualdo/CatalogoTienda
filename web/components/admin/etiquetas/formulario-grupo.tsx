"use client";

import {
  Button,
  Checkbox,
  CheckboxGroup,
  Description,
  Form,
  Input,
  Label,
  TextField,
  toast,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { crearGrupo, guardarGrupo } from "@/app/admin/(panel)/etiquetas/acciones";
import type { GrupoListado } from "@/lib/admin/etiquetas";
import { ICONOS_GRUPO, IconoGrupo } from "@/lib/iconos";
import { Seccion } from "../seccion";

type Grupo = Omit<GrupoListado, "etiquetas"> & { categoriaIds: string[] };
const SIN_ICONO = "sin-icono";

function Casilla({
  valor,
  onChange,
  titulo,
  ayuda,
  isDisabled,
}: {
  valor: boolean;
  onChange: (v: boolean) => void;
  titulo: string;
  ayuda: string;
  isDisabled?: boolean;
}) {
  return (
    <Checkbox isSelected={valor} onChange={onChange} isDisabled={isDisabled}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        <span className="flex flex-col">
          <span className="text-sm font-medium">{titulo}</span>
          <span className="text-xs text-muted">{ayuda}</span>
        </span>
      </Checkbox.Content>
    </Checkbox>
  );
}

/** Alta (`grupo` null) y edición de un grupo. Ver claude/web/etiquetas.md#en-el-dashboard */
export function FormularioGrupo({
  grupo,
  enUso = false,
  categorias,
}: {
  grupo: Grupo | null;
  enUso?: boolean;
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState(grupo?.nombre ?? "");
  const [icono, setIcono] = useState<string | null>(grupo?.icono ?? null);
  const [visibleEnFiltros, setVisibleEnFiltros] = useState(grupo?.visibleEnFiltros ?? true);
  const [visibleEnFicha, setVisibleEnFicha] = useState(grupo?.visibleEnFicha ?? true);
  const [esVariante, setEsVariante] = useState(grupo?.esVariante ?? false);
  const [esMarca, setEsMarca] = useState(grupo?.esMarca ?? false);
  const [conColor, setConColor] = useState(grupo?.conColor ?? false);
  const [categoriaIds, setCategoriaIds] = useState(grupo?.categoriaIds ?? []);

  function guardar() {
    iniciar(async () => {
      const datos = { nombre, icono, visibleEnFiltros, visibleEnFicha, esVariante, esMarca, conColor, categoriaIds };
      if (grupo) {
        const r = await guardarGrupo(grupo.id, datos);
        if (!r.ok) return void toast.danger(r.error);
        toast("Grupo guardado");
        router.refresh();
      } else {
        const r = await crearGrupo(datos);
        if (!r.ok) return void toast.danger(r.error);
        toast("Grupo creado: ahora cargá sus valores");
        router.replace(`/admin/etiquetas/${r.datos.id}`);
      }
    });
  }

  return (
    <Seccion titulo={grupo ? "Grupo" : "Nuevo grupo"} descripcion="Un grupo es un atributo filtrable: Talle, Material, Tasa de refresco…">
      <Form
        className="grid gap-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <TextField
          isRequired
          value={nombre}
          maxLength={40}
          onChange={setNombre}
          className="md:col-span-2"
        >
          <Label>Nombre</Label>
          <Input placeholder="Tasa de refresco" />
        </TextField>
        <div className="flex flex-col gap-2 md:col-span-2">
          <Label className="text-sm font-medium">Ícono en la ficha</Label>
          <ToggleButtonGroup
            aria-label="Ícono"
            selectionMode="single"
            disallowEmptySelection
            isDetached
            selectedKeys={[icono ?? SIN_ICONO]}
            onSelectionChange={(claves) => {
              const [k] = [...claves];
              setIcono(k === SIN_ICONO || typeof k !== "string" ? null : k);
            }}
            className="flex flex-wrap gap-2"
          >
            <ToggleButton id={SIN_ICONO} aria-label="Sin ícono">
              Ninguno
            </ToggleButton>
            {Object.keys(ICONOS_GRUPO).map((nombreIcono) => (
              <ToggleButton key={nombreIcono} id={nombreIcono} isIconOnly aria-label={nombreIcono}>
                <IconoGrupo nombre={nombreIcono} className="size-4" />
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>

        <div className="flex flex-col gap-3 md:col-span-2 md:grid md:grid-cols-2">
          <Casilla valor={visibleEnFiltros} onChange={setVisibleEnFiltros} titulo="Visible en los filtros" ayuda="Aparece en el panel de filtros del catálogo." />
          <Casilla valor={visibleEnFicha} onChange={setVisibleEnFicha} titulo="Visible en la ficha" ayuda="Aparece en características y especificaciones." />
          <Casilla
            valor={esVariante}
            onChange={setEsVariante}
            isDisabled={enUso || esMarca}
            titulo="Es de variante"
            ayuda={enUso ? "No se puede cambiar: el grupo ya está en uso." : "Talle, color: cada combinación tiene su stock."}
          />
          <Casilla
            valor={esMarca}
            onChange={setEsMarca}
            isDisabled={esVariante}
            titulo="Es la marca"
            ayuda="Se muestra en la tarjeta y va primero en los filtros. Uno solo."
          />
          <Casilla
            valor={conColor}
            onChange={setConColor}
            titulo="Sus valores son colores"
            ayuda={grupo?.conColor && !conColor ? "Al guardar se borran los colores ya cargados." : "Cada valor lleva un círculo de color en la ficha y en los filtros."}
          />
        </div>

        {!esMarca && (
          <CheckboxGroup value={categoriaIds} onChange={setCategoriaIds} className="flex flex-col gap-2 md:col-span-2">
            <Label>En qué categorías se usa</Label>
            <Description>
              Al cargar un producto de estas categorías aparece este campo. Las subcategorías heredan lo de su categoría principal. También se puede sumar con una plantilla (más abajo, en Etiquetas).
            </Description>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {categorias.map((c) => (
                <Checkbox key={c.id} value={c.id}>
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    {c.nombre}
                  </Checkbox.Content>
                </Checkbox>
              ))}
            </div>
          </CheckboxGroup>
        )}

        <div className="flex justify-end md:col-span-2">
          <Button type="submit" isPending={pendiente}>
            {grupo ? "Guardar grupo" : "Crear grupo"}
          </Button>
        </div>
      </Form>
    </Seccion>
  );
}
