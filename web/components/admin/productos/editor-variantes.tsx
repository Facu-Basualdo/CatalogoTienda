"use client";

import { Plus, Xmark } from "@gravity-ui/icons";
import {
  Alert,
  AlertDialog,
  Button,
  Input,
  Label,
  ListBox,
  NumberField,
  Select,
  Switch,
  TextField,
  toast,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { guardarVariantes, type FilaVariante } from "@/app/admin/(panel)/productos/acciones";
import type { EtiquetaAdmin, GrupoAdmin, VarianteAdmin } from "@/lib/admin/productos";
import { SITIO } from "@/lib/sitio";
import { Seccion } from "../seccion";
import { SelectorEtiquetas } from "./selector-etiquetas";

// Reglas: claude/web/variantes-y-stock.md#dashboard
// - máximo 3 grupos y 100 combinaciones
// - sin grupos = variante única (el monitor sin opciones)
// - guardar manda TODAS las filas a guardar_variantes (un solo RPC)
// - si se pierden combinaciones con stock, se confirma antes

const MAX_GRUPOS = 3;
const MAX_COMBINACIONES = 100;
const formatoPrecio = { style: "currency", currency: SITIO.moneda, maximumFractionDigits: 0 } as const;

type Valores = { sku: string; precio: number | null; stock: number; activa: boolean };
const VACIO: Valores = { sku: "", precio: null, stock: 0, activa: true };
const claveDe = (ids: string[]) => [...ids].sort().join("|");

export function EditorVariantes({
  productoId,
  precioBase,
  grupos: todos,
  variantes,
}: {
  productoId: string;
  precioBase: number;
  grupos: GrupoAdmin[];
  variantes: VarianteAdmin[];
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [grupos, setGrupos] = useState(todos.filter((g) => g.esVariante));

  // Valores elegidos por grupo, reconstruidos desde las variantes existentes.
  const [elegidos, setElegidos] = useState<Record<string, string[]>>(() => {
    const r: Record<string, string[]> = {};
    for (const g of todos.filter((x) => x.esVariante)) {
      const usados = g.etiquetas.filter((e) => variantes.some((v) => v.etiquetas.includes(e.id))).map((e) => e.id);
      if (usados.length) r[g.id] = usados;
    }
    return r;
  });
  const [valores, setValores] = useState<Record<string, Valores>>(() =>
    Object.fromEntries(
      variantes.map((v) => [claveDe(v.etiquetas), { sku: v.sku ?? "", precio: v.precio, stock: v.stock, activa: v.activa }]),
    ),
  );
  const [stockMasivo, setStockMasivo] = useState(0);
  const [confirmar, setConfirmar] = useState<{ perdidas: string[] } | null>(null);

  const activos = grupos.filter((g) => g.id in elegidos).sort((a, b) => a.orden - b.orden);
  const etiquetaPorId = useMemo(() => new Map(grupos.flatMap((g) => g.etiquetas.map((e) => [e.id, e] as const))), [grupos]);

  // Producto cartesiano de los valores elegidos (en el orden del grupo).
  const combinaciones = useMemo(() => {
    const ejes = activos.map((g) => (elegidos[g.id] ?? []).filter(Boolean)).filter((v) => v.length);
    if (!ejes.length) return [[]] as string[][];
    return ejes.reduce<string[][]>((acc, eje) => acc.flatMap((c) => eje.map((v) => [...c, v])), [[]]);
  }, [activos, elegidos]);

  const demasiadas = combinaciones.length > MAX_COMBINACIONES;
  const nombreDe = (ids: string[]) => (ids.length ? ids.map((id) => etiquetaPorId.get(id)?.valor ?? "?").join(" / ") : "Variante única");
  const valoresDe = (ids: string[]) => valores[claveDe(ids)] ?? VACIO;
  const fijar = (ids: string[], cambio: Partial<Valores>) =>
    setValores((v) => ({ ...v, [claveDe(ids)]: { ...(v[claveDe(ids)] ?? VACIO), ...cambio } }));

  function guardar(forzar = false) {
    const actuales = new Set(combinaciones.map(claveDe));
    const perdidas = variantes.filter((v) => !actuales.has(claveDe(v.etiquetas)) && v.stock > 0);
    if (perdidas.length && !forzar) {
      setConfirmar({ perdidas: perdidas.map((v) => `${nombreDe(v.etiquetas)} (${v.stock} u.)`) });
      return;
    }
    const filas: FilaVariante[] = combinaciones.map((ids) => {
      const v = valoresDe(ids);
      return { etiquetas: ids, sku: v.sku.trim() || null, precio: v.precio, stock: v.stock, activa: v.activa };
    });
    iniciar(async () => {
      const r = await guardarVariantes(productoId, filas);
      if (!r.ok) return void toast.danger(r.error);
      setConfirmar(null);
      toast("Variantes y stock guardados");
      router.refresh();
    });
  }

  const disponibles = grupos.filter((g) => !(g.id in elegidos));
  const agregarEtiqueta = (grupoId: string, e: EtiquetaAdmin) =>
    setGrupos((gs) => gs.map((g) => (g.id === grupoId ? { ...g, etiquetas: [...g.etiquetas, e] } : g)));

  return (
    <Seccion
      id="variantes"
      titulo="Variantes y stock"
      descripcion="Sin grupos, el producto tiene una variante única. Con talle, color, etc. se genera una fila por combinación."
      acciones={
        <Button isPending={pendiente} isDisabled={demasiadas} onPress={() => guardar()}>
          Guardar variantes
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {activos.map((g) => (
          <div key={g.id} className="flex items-start gap-2">
            <div className="flex-1">
              <SelectorEtiquetas
                grupo={g}
                seleccionadas={elegidos[g.id] ?? []}
                onChange={(ids) => setElegidos((e) => ({ ...e, [g.id]: ids }))}
                onEtiquetaCreada={agregarEtiqueta}
              />
            </div>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={`Quitar ${g.nombre}`}
              onPress={() => setElegidos((e) => Object.fromEntries(Object.entries(e).filter(([id]) => id !== g.id)))}
            >
              <Xmark />
            </Button>
          </div>
        ))}

        {activos.length < MAX_GRUPOS && disponibles.length > 0 && (
          <Select
            aria-label="Agregar grupo de variante"
            placeholder="Agregar talle, color, memoria…"
            value={null}
            onChange={(v) => typeof v === "string" && setElegidos((e) => ({ ...e, [v]: [] }))}
            className="sm:w-72"
          >
            <Label className="sr-only">Agregar grupo de variante</Label>
            <Select.Trigger>
              <Plus className="size-4" />
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {disponibles.map((g) => (
                  <ListBox.Item key={g.id} id={g.id} textValue={g.nombre}>
                    {g.nombre}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
      </div>

      {demasiadas ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>
              Son {combinaciones.length} combinaciones: el máximo es {MAX_COMBINACIONES}. Quitá valores o grupos.
            </Alert.Description>
          </Alert.Content>
        </Alert>
      ) : (
        <>
          {combinaciones.length > 1 && (
            <div className="flex flex-wrap items-end gap-2">
              <NumberField value={stockMasivo} onChange={(v) => setStockMasivo(v ?? 0)} minValue={0} className="w-32">
                <Label className="text-xs">Stock para todas</Label>
                <NumberField.Group>
                  <NumberField.Input />
                </NumberField.Group>
              </NumberField>
              <Button
                variant="outline"
                size="sm"
                onPress={() => combinaciones.forEach((ids) => fijar(ids, { stock: stockMasivo }))}
              >
                Aplicar a todas
              </Button>
            </div>
          )}

          {/* Grilla y no Table: la Table de HeroUI es un grid de React Aria que captura
              flechas y espacio, y pelea con los campos editables de adentro. */}
          <div className="overflow-x-auto scrollbar-thin">
            <div role="list" className="flex min-w-[640px] flex-col divide-y divide-separator rounded-xl border border-border">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr_auto] gap-3 bg-surface-secondary px-3 py-2 text-xs font-medium text-muted">
                <span>Combinación</span>
                <span>SKU</span>
                <span>Precio (vacío = base)</span>
                <span>Stock</span>
                <span>Activa</span>
              </div>
              {combinaciones.map((ids) => {
                const v = valoresDe(ids);
                const nombre = nombreDe(ids);
                return (
                  <div role="listitem" key={claveDe(ids) || "unica"} className="grid grid-cols-[1.4fr_1fr_1fr_0.7fr_auto] items-center gap-3 px-3 py-2">
                    <span className="text-sm font-medium">{nombre}</span>
                    <TextField aria-label={`SKU de ${nombre}`} value={v.sku} onChange={(sku) => fijar(ids, { sku })}>
                      <Input className="font-mono text-xs" />
                    </TextField>
                    <NumberField
                      aria-label={`Precio de ${nombre}`}
                      value={v.precio ?? Number.NaN}
                      onChange={(p) => fijar(ids, { precio: p === undefined || Number.isNaN(p) ? null : Math.round(p) })}
                      minValue={0}
                      formatOptions={formatoPrecio}
                    >
                      <NumberField.Group>
                        <NumberField.Input placeholder={new Intl.NumberFormat(SITIO.locale, formatoPrecio).format(precioBase)} />
                      </NumberField.Group>
                    </NumberField>
                    <NumberField
                      aria-label={`Stock de ${nombre}`}
                      value={v.stock}
                      onChange={(s) => fijar(ids, { stock: Math.max(0, Math.round(s ?? 0)) })}
                      minValue={0}
                    >
                      <NumberField.Group>
                        <NumberField.Input />
                      </NumberField.Group>
                    </NumberField>
                    <Switch aria-label={`${nombre} activa`} size="sm" isSelected={v.activa} onChange={(activa) => fijar(ids, { activa })}>
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <AlertDialog.Backdrop isOpen={!!confirmar} onOpenChange={(abierto) => !abierto && setConfirmar(null)}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>Se borran combinaciones con stock</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body className="flex flex-col gap-2">
              <p>Al guardar se eliminan estas variantes y su stock:</p>
              <ul className="list-inside list-disc text-sm">
                {confirmar?.perdidas.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={() => setConfirmar(null)}>
                Cancelar
              </Button>
              <Button variant="danger" isPending={pendiente} onPress={() => guardar(true)}>
                Guardar igual
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Seccion>
  );
}
