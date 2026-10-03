"use client";

import { Pencil, Plus, TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, Checkbox, CheckboxGroup, Description, Form, Input, Label, Modal, TextField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarPlantilla, guardarPlantilla } from "@/app/admin/(panel)/etiquetas/acciones";
import { Seccion } from "../seccion";

export type PlantillaAdmin = { id: string; nombre: string; grupoIds: string[]; categoriaIds: string[] };
type Opcion = { id: string; nombre: string };

/**
 * Plantillas: un conjunto de grupos ("Notebook" = memoria, almacenamiento…) que se
 * asigna a varias categorías de una vez. Vinculadas, no copiadas: cambiar la plantilla
 * cambia lo que piden todas sus categorías. Ver claude/web/dashboard.md#características-por-categoría
 */
export function Plantillas({
  plantillas,
  grupos,
  categorias,
}: {
  plantillas: PlantillaAdmin[];
  grupos: (Opcion & { esVariante: boolean })[];
  categorias: Opcion[];
}) {
  const [editando, setEditando] = useState<PlantillaAdmin | "nueva" | null>(null);
  const nombreGrupo = new Map(grupos.map((g) => [g.id, g.nombre]));
  const nombreCategoria = new Map(categorias.map((c) => [c.id, c.nombre]));

  return (
    <Seccion
      titulo="Plantillas"
      descripcion="Un conjunto de características con nombre (por ejemplo «Notebook»: memoria, almacenamiento, pantalla) que se asigna a varias categorías de una vez. Si después le sumás un grupo, aparece en todas."
      acciones={
        <Button variant="outline" onPress={() => setEditando("nueva")}>
          <Plus />
          Nueva plantilla
        </Button>
      }
    >
      {plantillas.length ? (
        <ul className="flex flex-col divide-y divide-separator rounded-xl border border-border">
          {plantillas.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="font-medium">{p.nombre}</span>
                <span className="text-xs text-muted">{p.grupoIds.map((g) => nombreGrupo.get(g)).filter(Boolean).join(" · ")}</span>
                <span className="text-xs text-muted">
                  {p.categoriaIds.length
                    ? `En: ${p.categoriaIds.map((c) => nombreCategoria.get(c)).filter(Boolean).join(", ")}`
                    : "Todavía no está en ninguna categoría"}
                </span>
              </div>
              <div className="flex">
                <Button isIconOnly size="sm" variant="ghost" aria-label={`Editar ${p.nombre}`} onPress={() => setEditando(p)}>
                  <Pencil />
                </Button>
                <BorrarPlantilla plantilla={p} />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Todavía no hay plantillas.</p>
      )}
      {editando && (
        <EdicionPlantilla
          plantilla={editando === "nueva" ? null : editando}
          grupos={grupos}
          categorias={categorias}
          cerrar={() => setEditando(null)}
        />
      )}
    </Seccion>
  );
}

function Casillas({ etiqueta, ayuda, opciones, valor, onChange }: { etiqueta: string; ayuda?: string; opciones: Opcion[]; valor: string[]; onChange: (v: string[]) => void }) {
  return (
    <CheckboxGroup value={valor} onChange={onChange} className="flex flex-col gap-2">
      <Label>{etiqueta}</Label>
      {ayuda && <Description>{ayuda}</Description>}
      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map((o) => (
          <Checkbox key={o.id} value={o.id}>
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {o.nombre}
            </Checkbox.Content>
          </Checkbox>
        ))}
      </div>
    </CheckboxGroup>
  );
}

function EdicionPlantilla({
  plantilla,
  grupos,
  categorias,
  cerrar,
}: {
  plantilla: PlantillaAdmin | null;
  grupos: (Opcion & { esVariante: boolean })[];
  categorias: Opcion[];
  cerrar: () => void;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState(plantilla?.nombre ?? "");
  const [grupoIds, setGrupoIds] = useState(plantilla?.grupoIds ?? []);
  const [categoriaIds, setCategoriaIds] = useState(plantilla?.categoriaIds ?? []);

  return (
    <Modal.Backdrop isOpen onOpenChange={(abierto) => !abierto && cerrar()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              iniciar(async () => {
                const r = await guardarPlantilla(plantilla?.id ?? null, { nombre, grupoIds, categoriaIds });
                if (!r.ok) return void toast.danger(r.error);
                toast(plantilla ? "Plantilla guardada" : "Plantilla creada");
                cerrar();
                router.refresh();
              });
            }}
          >
            <Modal.Header>
              <Modal.Heading>{plantilla ? `Editar «${plantilla.nombre}»` : "Nueva plantilla"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-5">
              <TextField isRequired autoFocus value={nombre} onChange={setNombre} maxLength={60}>
                <Label>Nombre</Label>
                <Input placeholder="Notebook" />
              </TextField>
              <Casillas
                etiqueta="Características"
                ayuda="Se completan una vez por producto. La marca va siempre."
                opciones={grupos.filter((g) => !g.esVariante)}
                valor={grupoIds}
                onChange={setGrupoIds}
              />
              <Casillas
                etiqueta="Opciones con stock propio"
                ayuda="Cada combinación tiene su stock (talle, color, memoria…)."
                opciones={grupos.filter((g) => g.esVariante)}
                valor={grupoIds}
                onChange={setGrupoIds}
              />
              <Casillas
                etiqueta="Aplicar a estas categorías"
                ayuda="Las subcategorías heredan lo de su categoría principal."
                opciones={categorias}
                valor={categoriaIds}
                onChange={setCategoriaIds}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="ghost" onPress={cerrar}>
                Cancelar
              </Button>
              <Button type="submit" isPending={pendiente}>
                {plantilla ? "Guardar" : "Crear"}
              </Button>
            </Modal.Footer>
          </Form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function BorrarPlantilla({ plantilla: p }: { plantilla: PlantillaAdmin }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Button isIconOnly size="sm" variant="ghost" aria-label={`Borrar ${p.nombre}`} onPress={() => setAbierto(true)}>
        <TrashBin />
      </Button>
      <AlertDialog.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>¿Borrar la plantilla «{p.nombre}»?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              Sus categorías dejan de pedir esos campos al cargar productos (salvo que los tengan elegidos sueltos). Los
              productos y sus datos no se tocan.
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
                    const r = await borrarPlantilla(p.id);
                    if (!r.ok) return void toast.danger(r.error);
                    toast("Plantilla borrada");
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
