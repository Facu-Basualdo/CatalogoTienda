"use client";

import { ArrowDown, ArrowUp, Pencil, Plus, TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, Description, Form, Input, Label, ListBox, Modal, Select, TextField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarCategoria, guardarCategoria, reordenarCategorias } from "@/app/admin/(panel)/categorias/acciones";
import { slugify } from "@/lib/slug";

export type CategoriaAdmin = { id: string; nombre: string; slug: string; padreId: string | null; orden: number; productos: number };

const RAIZ = "raiz";

/**
 * Dos niveles (Ropa › Remeras). Las flechas mueven entre hermanas. Alta y edición en un
 * Modal. Regla de niveles: claude/supabase/esquema.md#categorias
 */
export function ArbolCategorias({ categorias }: { categorias: CategoriaAdmin[] }) {
  const router = useRouter();
  const [editando, setEditando] = useState<CategoriaAdmin | "nueva" | null>(null);
  const [, iniciar] = useTransition();
  const hijas = (padreId: string | null) =>
    categorias.filter((c) => c.padreId === padreId).sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre));

  function mover(hermanas: CategoriaAdmin[], n: number, d: number) {
    const ids = hermanas.map((c) => c.id);
    [ids[n], ids[n + d]] = [ids[n + d], ids[n]];
    iniciar(async () => {
      const r = await reordenarCategorias(ids);
      if (!r.ok) toast.danger(r.error);
      router.refresh();
    });
  }

  const fila = (c: CategoriaAdmin, hermanas: CategoriaAdmin[], n: number, sangria: boolean) => (
    <li key={c.id} className={`flex flex-wrap items-center gap-3 py-3 pr-4 ${sangria ? "border-l-2 border-border pl-4 ml-8" : "pl-4"}`}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="font-medium">{c.nombre}</span>
        <span className="font-mono text-xs text-muted">?cat={c.slug}</span>
      </div>
      <span className="text-sm tabular-nums text-muted">
        {c.productos} {c.productos === 1 ? "producto" : "productos"}
      </span>
      <div className="flex">
        <Button isIconOnly size="sm" variant="ghost" aria-label={`Subir ${c.nombre}`} isDisabled={n === 0} onPress={() => mover(hermanas, n, -1)}>
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
        <Button isIconOnly size="sm" variant="ghost" aria-label={`Editar ${c.nombre}`} onPress={() => setEditando(c)}>
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
          return [fila(r, raices, n, false), ...subs.map((s, k) => fila(s, subs, k, true))];
        })}
      </ul>
      {editando && (
        <EdicionCategoria
          categoria={editando === "nueva" ? null : editando}
          raices={raices}
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
  tieneHijas,
  cerrar,
}: {
  categoria: CategoriaAdmin | null;
  raices: CategoriaAdmin[];
  tieneHijas: boolean;
  cerrar: () => void;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState(categoria?.nombre ?? "");
  const [slug, setSlug] = useState(categoria?.slug ?? "");
  const [slugManual, setSlugManual] = useState(!!categoria);
  const [padre, setPadre] = useState(categoria?.padreId ?? RAIZ);

  return (
    <Modal.Backdrop isOpen onOpenChange={(abierto) => !abierto && cerrar()}>
      <Modal.Container>
        <Modal.Dialog>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              iniciar(async () => {
                const r = await guardarCategoria(categoria?.id ?? null, { nombre, slug, padreId: padre === RAIZ ? null : padre });
                if (!r.ok) return void toast.danger(r.error);
                toast(categoria ? "Categoría guardada" : "Categoría creada");
                cerrar();
                router.refresh();
              });
            }}
          >
            <Modal.Header>
              <Modal.Heading>{categoria ? `Editar «${categoria.nombre}»` : "Nueva categoría"}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <TextField
                isRequired
                autoFocus
                value={nombre}
                maxLength={40}
                onChange={(v) => {
                  setNombre(v);
                  if (!slugManual) setSlug(slugify(v));
                }}
              >
                <Label>Nombre</Label>
                <Input placeholder="Remeras" />
              </TextField>
              <TextField
                isRequired
                value={slug}
                onChange={(v) => {
                  setSlugManual(true);
                  setSlug(v);
                }}
              >
                <Label>Slug</Label>
                <Input />
                <Description>/catalogo?cat={slug || "…"}{categoria ? ". Cambiarlo rompe los links compartidos." : ""}</Description>
              </TextField>
              <Select value={padre} onChange={(v) => typeof v === "string" && setPadre(v)} isDisabled={tieneHijas}>
                <Label>Dentro de</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id={RAIZ} textValue="Ninguna (categoría principal)">
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
                {tieneHijas && <Description>Tiene subcategorías: sólo puede ser principal (máximo dos niveles).</Description>}
              </Select>
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
      <Button isIconOnly size="sm" variant="ghost" aria-label={`Borrar ${c.nombre}`} onPress={() => setAbierto(true)}>
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
