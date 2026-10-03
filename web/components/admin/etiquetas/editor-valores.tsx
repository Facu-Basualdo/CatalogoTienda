"use client";

import { ArrowDown, ArrowUp, ArrowsRotateRight, TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, Form, Input, Label, ListBox, Select, TextField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  borrarEtiqueta,
  crearEtiquetaEnGrupo,
  fusionarEtiquetas,
  guardarEtiqueta,
  reordenarEtiquetas,
} from "@/app/admin/(panel)/etiquetas/acciones";
import type { EtiquetaConUso } from "@/lib/admin/etiquetas";
import { slugify } from "@/lib/slug";
import { Seccion } from "../seccion";

const HEX = /^#[0-9a-f]{6}$/;

/**
 * Valores de un grupo. Renombrar cambia el slug (y lo que ya filtró por el viejo deja de
 * coincidir); si dos valores son lo mismo, se fusionan. Ver claude/web/etiquetas.md#en-el-dashboard
 */
export function EditorValores({ grupoId, conColor, etiquetas }: { grupoId: string; conColor: boolean; etiquetas: EtiquetaConUso[] }) {
  const router = useRouter();
  const [orden, setOrden] = useState(etiquetas.map((e) => e.id));
  const [previo, setPrevio] = useState(etiquetas);
  const [, iniciar] = useTransition();
  if (previo !== etiquetas) {
    setPrevio(etiquetas);
    setOrden(etiquetas.map((e) => e.id));
  }
  const porId = new Map(etiquetas.map((e) => [e.id, e]));

  function mover(n: number, d: number) {
    const nuevo = [...orden];
    [nuevo[n], nuevo[n + d]] = [nuevo[n + d], nuevo[n]];
    setOrden(nuevo);
    iniciar(async () => {
      const r = await reordenarEtiquetas(grupoId, nuevo);
      if (!r.ok) {
        toast.danger(r.error);
        setOrden(orden);
      } else router.refresh();
    });
  }

  return (
    <Seccion
      titulo="Valores"
      descripcion={`El orden es el de los filtros y del selector de la ficha. "144Hz" y "144 Hz" son el mismo valor: el sistema no deja crear el segundo.`}
    >
      {orden.length > 0 && (
        <ol className="flex flex-col divide-y divide-separator rounded-xl border border-border">
          {orden.map((id, n) => {
            const e = porId.get(id);
            if (!e) return null;
            return (
              <FilaValor
                key={`${e.id}-${e.valor}-${e.colorHex}`}
                etiqueta={e}
                conColor={conColor}
                otras={etiquetas.filter((x) => x.id !== e.id)}
                primero={n === 0}
                ultimo={n === orden.length - 1}
                mover={(d) => mover(n, d)}
              />
            );
          })}
        </ol>
      )}
      <NuevoValor grupoId={grupoId} conColor={conColor} />
    </Seccion>
  );
}

function Muestra({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="size-6 shrink-0 rounded-full ring-1 ring-muted/60"
      style={{ backgroundColor: HEX.test(color) ? color : "transparent" }}
    />
  );
}

function FilaValor({
  etiqueta: e,
  conColor,
  otras,
  primero,
  ultimo,
  mover,
}: {
  etiqueta: EtiquetaConUso;
  conColor: boolean;
  otras: EtiquetaConUso[];
  primero: boolean;
  ultimo: boolean;
  mover: (d: number) => void;
}) {
  const router = useRouter();
  const [valor, setValor] = useState(e.valor);
  const [color, setColor] = useState(e.colorHex ?? "");
  const [pendiente, iniciar] = useTransition();
  const cambio = valor.trim() !== e.valor || (color || null) !== e.colorHex;
  const slugNuevo = slugify(valor);

  return (
    <li className="flex flex-wrap items-end gap-3 p-3">
      <TextField aria-label={`Valor de ${e.valor}`} value={valor} onChange={setValor} maxLength={60} className="min-w-40 flex-1">
        <Input />
      </TextField>
      {conColor && (
        <div className="flex items-center gap-2">
          <Muestra color={color} />
          <TextField aria-label={`Color de ${e.valor}`} value={color} onChange={(v) => setColor(v.toLowerCase())} maxLength={7} className="w-28">
            <Input placeholder="#000000" className="font-mono" />
          </TextField>
        </div>
      )}
      <div className="flex min-w-32 flex-col text-xs text-muted">
        <span className="font-mono">{cambio && slugNuevo !== e.slug ? `${e.slug} → ${slugNuevo}` : e.slug}</span>
        <span>{e.usos ? `En ${e.usos} ${e.usos === 1 ? "producto o variante" : "productos o variantes"}` : "Sin uso"}</span>
      </div>
      {cambio && (
        <Button
          size="sm"
          isPending={pendiente}
          onPress={() =>
            iniciar(async () => {
              const r = await guardarEtiqueta(e.id, valor, color || null);
              if (!r.ok) return void toast.danger(r.error);
              toast("Valor guardado");
              router.refresh();
            })
          }
        >
          Guardar
        </Button>
      )}
      <div className="ml-auto flex">
        <Button isIconOnly size="sm" variant="ghost" aria-label={`Subir ${e.valor}`} isDisabled={primero} onPress={() => mover(-1)}>
          <ArrowUp />
        </Button>
        <Button isIconOnly size="sm" variant="ghost" aria-label={`Bajar ${e.valor}`} isDisabled={ultimo} onPress={() => mover(1)}>
          <ArrowDown />
        </Button>
        {otras.length > 0 && <Fusionar etiqueta={e} otras={otras} />}
        <Borrar etiqueta={e} />
      </div>
    </li>
  );
}

function Fusionar({ etiqueta: e, otras }: { etiqueta: EtiquetaConUso; otras: EtiquetaConUso[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [destino, setDestino] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();
  const nombreDestino = otras.find((o) => o.id === destino)?.valor;
  return (
    <>
      <Button isIconOnly size="sm" variant="ghost" aria-label={`Fusionar ${e.valor} con otro valor`} onPress={() => setAbierto(true)}>
        <ArrowsRotateRight />
      </Button>
      <AlertDialog.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="accent" />
              <AlertDialog.Heading>Fusionar «{e.valor}»</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex flex-col gap-4">
              <p>
                Los productos, variantes y promociones que usan «{e.valor}» pasan a usar el valor que elijas, y «{e.valor}» se
                borra. No se puede deshacer.
              </p>
              <Select value={destino} onChange={(v) => setDestino(typeof v === "string" ? v : null)} placeholder="Elegí un valor">
                <Label>Fusionar en</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {otras.map((o) => (
                      <ListBox.Item key={o.id} id={o.id} textValue={o.valor}>
                        {o.valor}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button
                isDisabled={!destino}
                isPending={pendiente}
                onPress={() =>
                  destino &&
                  iniciar(async () => {
                    const r = await fusionarEtiquetas(e.id, destino);
                    if (!r.ok) return void toast.danger(r.error);
                    toast(`«${e.valor}» se fusionó en «${nombreDestino}»`);
                    setAbierto(false);
                    router.refresh();
                  })
                }
              >
                Fusionar
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}

function Borrar({ etiqueta: e }: { etiqueta: EtiquetaConUso }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Button isIconOnly size="sm" variant="ghost" aria-label={`Borrar ${e.valor}`} onPress={() => setAbierto(true)}>
        <TrashBin />
      </Button>
      <AlertDialog.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>¿Borrar «{e.valor}»?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              {e.usos
                ? `Está en ${e.usos} ${e.usos === 1 ? "producto o variante" : "productos o variantes"}: se saca de los productos. Si es de una variante, no se puede borrar hasta cambiar esa variante.`
                : "No la usa ningún producto."}
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
                    const r = await borrarEtiqueta(e.id);
                    if (!r.ok) return void toast.danger(r.error);
                    toast("Valor borrado");
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

function NuevoValor({ grupoId, conColor }: { grupoId: string; conColor: boolean }) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [color, setColor] = useState("");
  const [pendiente, iniciar] = useTransition();
  return (
    <Form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        iniciar(async () => {
          const r = await crearEtiquetaEnGrupo(grupoId, valor, color || null);
          if (!r.ok) return void toast.danger(r.error);
          setValor("");
          setColor("");
          router.refresh();
        });
      }}
    >
      <TextField isRequired value={valor} onChange={setValor} maxLength={60} className="min-w-48 flex-1">
        <Label>Nuevo valor</Label>
        <Input placeholder="Ej: 165 Hz" />
      </TextField>
      {conColor && (
        <div className="flex items-end gap-2">
          <Muestra color={color} />
          <TextField value={color} onChange={(v) => setColor(v.toLowerCase())} maxLength={7} className="w-28">
            <Label>Color</Label>
            <Input placeholder="#000000" className="font-mono" />
          </TextField>
        </div>
      )}
      <Button type="submit" variant="outline" isPending={pendiente}>
        Agregar
      </Button>
    </Form>
  );
}
