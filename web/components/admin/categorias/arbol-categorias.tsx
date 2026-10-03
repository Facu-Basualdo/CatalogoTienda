"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, TrashBin } from "@gravity-ui/icons";
import {
  AlertDialog,
  Button,
  Checkbox,
  CheckboxGroup,
  Description,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  TextField,
  toast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  borrarCategoria,
  guardarCategoria,
  reordenarCategorias,
} from "@/app/admin/(panel)/categorias/acciones";

export type CategoriaAdmin = {
  id: string;
  nombre: string;
  slug: string;
  padreId: string | null;
  orden: number;
  productos: number;
  /** Grupos de etiquetas elegidos sueltos (sin los del padre ni los de plantillas). */
  grupoIds: string[];
  plantillaIds: string[];
};
export type GrupoCategoria = {
  id: string;
  nombre: string;
  esVariante: boolean;
};
export type PlantillaCategoria = {
  id: string;
  nombre: string;
  grupoIds: string[];
};

const RAIZ = "raiz";

/**
 * Dos niveles (Ropa › Remeras). Las flechas mueven entre hermanas. Alta y edición en un
 * Modal. Regla de niveles: claude/supabase/esquema.md#categorias
 */
export function ArbolCategorias({
  categorias,
  grupos,
  plantillas,
}: {
  categorias: CategoriaAdmin[];
  grupos: GrupoCategoria[];
  plantillas: PlantillaCategoria[];
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<CategoriaAdmin | "nueva" | null>(
    null,
  );
  const [, iniciar] = useTransition();
  const hijas = (padreId: string | null) =>
    categorias
      .filter((c) => c.padreId === padreId)
      .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

  function mover(hermanas: CategoriaAdmin[], n: number, d: number) {
    const ids = hermanas.map((c) => c.id);
    [ids[n], ids[n + d]] = [ids[n + d], ids[n]];
    iniciar(async () => {
      const r = await reordenarCategorias(ids);
      if (!r.ok) toast.danger(r.error);
      router.refresh();
    });
  }

  const fila = (
    c: CategoriaAdmin,
    hermanas: CategoriaAdmin[],
    n: number,
    sangria: boolean,
  ) => (
    <li
      key={c.id}
      className={`flex flex-wrap items-center gap-3 py-3 pr-4 ${sangria ? "border-l-2 border-border pl-4 ml-8" : "pl-4"}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium">{c.nombre}</span>
        <span className="text-xs text-muted">
          {c.grupoIds.length || c.plantillaIds.length
            ? [
                ...plantillas
                  .filter((p) => c.plantillaIds.includes(p.id))
                  .map((p) => `Plantilla «${p.nombre}»`),
                ...grupos
                  .filter((g) => c.grupoIds.includes(g.id))
                  .map((g) => g.nombre),
              ].join(" · ")
            : sangria
              ? "Usa las características de su categoría principal"
              : "Sin características elegidas"}
        </span>
      </div>
      <span className="text-sm tabular-nums text-muted">
        {c.productos} {c.productos === 1 ? "producto" : "productos"}
      </span>
      <div className="flex">
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={`Subir ${c.nombre}`}
          isDisabled={n === 0}
          onPress={() => mover(hermanas, n, -1)}
        >
          <ArrowUp />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={`Bajar ${c.nombre}`}
          isDisabled={n === hermanas.length - 1}
          onPress={() => mover(hermanas, n, 1)}
        >
          <ArrowDown />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="ghost"
          aria-label={`Editar ${c.nombre}`}
          onPress={() => setEditando(c)}
        >
          <Pencil />
        </Button>
        <BorrarCategoria categoria={c} />
      </div>
    </li>
  );

  const raices = hijas(null);
  return (
    <>
      <div className="flex justify-end">
        <Button onPress={() => setEditando("nueva")}>
          <Plus />
          Nueva categoría
        </Button>
      </div>
      <ul className="flex flex-col divide-y divide-separator rounded-tarjeta border border-border bg-surface">
        {raices.map((r, n) => {
          const subs = hijas(r.id);
          return [
            fila(r, raices, n, false),
            ...subs.map((s, k) => fila(s, subs, k, true)),
          ];
        })}
      </ul>
      {editando && (
        <EdicionCategoria
          categoria={editando === "nueva" ? null : editando}
          raices={raices}
          grupos={grupos}
          plantillas={plantillas}
          tieneHijas={editando !== "nueva" && hijas(editando.id).length > 0}
          cerrar={() => setEditando(null)}
        />
      )}
    </>
  );
}

function EdicionCategoria({
  categoria,
  raices,
  grupos,
  plantillas,
  tieneHijas,
  cerrar,
}: {
  categoria: CategoriaAdmin | null;
  raices: CategoriaAdmin[];
  grupos: GrupoCategoria[];
  plantillas: PlantillaCategoria[];
  tieneHijas: boolean;
  cerrar: () => void;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [padre, setPadre] = useState(categoria?.padreId ?? RAIZ);
  const [grupoIds, setGrupoIds] = useState(categoria?.grupoIds ?? []);
  const [plantillaIds, setPlantillaIds] = useState(
    categoria?.plantillaIds ?? [],
  );
  // Grupos que ya vienen de otro lado (la categoría principal o una plantilla elegida):
  // se ven tildados con su origen y no se destildan acá. grupo → "de Ropa" / "de Notebook".
  const origen = new Map<string, string>();
  const deEstasPlantillas = (ids: string[]) =>
    plantillas.filter((p) => ids.includes(p.id));
  const madre = padre === RAIZ ? null : raices.find((r) => r.id === padre);
  if (madre) {
    for (const g of madre.grupoIds) origen.set(g, madre.nombre);
    for (const p of deEstasPlantillas(madre.plantillaIds))
      for (const g of p.grupoIds) origen.set(g, madre.nombre);
  }
  for (const p of deEstasPlantillas(plantillaIds))
    for (const g of p.grupoIds) if (!origen.has(g)) origen.set(g, p.nombre);
  const heredados = new Set(origen.keys());

  return (
    <Modal.Backdrop isOpen onOpenChange={(abierto) => !abierto && cerrar()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              iniciar(async () => {
                const r = await guardarCategoria(categoria?.id ?? null, {
                  nombre,
                  padreId: padre === RAIZ ? null : padre,
                  grupoIds: grupoIds.filter((g) => !heredados.has(g)),
                  plantillaIds,
                });
                if (!r.ok) return void toast.danger(r.error);
                toast(categoria ? "Categoría guardada" : "Categoría creada");
                cerrar();
                router.refresh();
              });
            }}
          >
            <Modal.Header>
              <Modal.Heading>
                {categoria ? `Editar «${categoria.nombre}»` : "Nueva categoría"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <TextField
                isRequired
                autoFocus
                value={nombre}
                maxLength={40}
                onChange={setNombre}
              >
                <Label>Nombre</Label>
                <Input placeholder="Remeras" />
              </TextField>
              <Select
                value={padre}
                onChange={(v) => typeof v === "string" && setPadre(v)}
                isDisabled={tieneHijas}
              >
                <Label>Dentro de</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item
                      id={RAIZ}
                      textValue="Ninguna (categoría principal)"
                    >
                      Ninguna (categoría principal)
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {raices
                      .filter((r) => r.id !== categoria?.id)
                      .map((r) => (
                        <ListBox.Item key={r.id} id={r.id} textValue={r.nombre}>
                          {r.nombre}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                  </ListBox>
                </Select.Popover>
                {tieneHijas && (
                  <Description>
                    Tiene subcategorías: sólo puede ser principal (máximo dos
                    niveles).
                  </Description>
                )}
              </Select>
              {plantillas.length > 0 && (
                <CheckboxGroup
                  value={plantillaIds}
                  onChange={setPlantillaIds}
                  className="flex flex-col gap-2"
                >
                  <Label>Plantillas</Label>
                  <Description>
                    Suman todos sus campos de una vez. Se arman en Etiquetas.
                  </Description>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {plantillas.map((p) => (
                      <Checkbox key={p.id} value={p.id}>
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          {p.nombre}
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                  </div>
                </CheckboxGroup>
              )}
              <CheckboxGroup
                value={[...new Set([...grupoIds, ...heredados])]}
                onChange={(v) =>
                  setGrupoIds(v.filter((g) => !heredados.has(g)))
                }
                className="flex flex-col gap-2"
              >
                <Label>Características</Label>
                <Description>
                  Se completan una vez por producto (material, tasa de
                  refresco…). La marca va siempre.
                </Description>
                <div className="grid gap-2 sm:grid-cols-2">
                  {grupos
                    .filter((g) => !g.esVariante)
                    .map((g) => (
                      <Checkbox
                        key={g.id}
                        value={g.id}
                        isDisabled={heredados.has(g.id)}
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <span className="flex flex-col">
                            {g.nombre}
                            {heredados.has(g.id) && <span className="text-xs text-muted">de {origen.get(g.id)}</span>}
                          </span>
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                </div>
              </CheckboxGroup>
              <CheckboxGroup
                value={[...new Set([...grupoIds, ...heredados])]}
                onChange={(v) =>
                  setGrupoIds(v.filter((g) => !heredados.has(g)))
                }
                className="flex flex-col gap-2"
              >
                <Label>Opciones con stock propio</Label>
                <Description>
                  Cada combinación tiene su stock (talle, color, memoria…).
                </Description>
                <div className="grid gap-2 sm:grid-cols-2">
                  {grupos
                    .filter((g) => g.esVariante)
                    .map((g) => (
                      <Checkbox
                        key={g.id}
                        value={g.id}
                        isDisabled={heredados.has(g.id)}
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                          <span className="flex flex-col">
                            {g.nombre}
                            {heredados.has(g.id) && <span className="text-xs text-muted">de {origen.get(g.id)}</span>}
                          </span>
                        </Checkbox.Content>
                      </Checkbox>
                    ))}
                </div>
              </CheckboxGroup>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={cerrar}>
                Cancelar
              </Button>
              <Button type="submit" isPending={pendiente}>
                {categoria ? "Guardar" : "Crear"}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function BorrarCategoria({ categoria: c }: { categoria: CategoriaAdmin }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        aria-label={`Borrar ${c.nombre}`}
        onPress={() => setAbierto(true)}
      >
        <TrashBin />
      </Button>
      <AlertDialog.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>¿Borrar «{c.nombre}»?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {c.productos
                ? `Sus ${c.productos} productos quedan sin categoría (no se borran).`
                : "No tiene productos."}{" "}
              Si tiene subcategorías, no se puede.
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isPending={pendiente}
                onPress={() =>
                  iniciar(async () => {
                    const r = await borrarCategoria(c.id);
                    if (!r.ok) return void toast.danger(r.error);
                    toast("Categoría borrada");
                    setAbierto(false);
                    router.refresh();
                  })
                }
              >
                Borrar
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
