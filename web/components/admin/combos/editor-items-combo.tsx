"use client";

import { ArrowDown, ArrowUp, TrashBin } from "@gravity-ui/icons";
import { Button, Chip, ComboBox, Input, ListBox, NumberField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { guardarItemsCombo } from "@/app/admin/(panel)/combos/acciones";
import type { ItemComboAdmin, ProductoParaCombo } from "@/lib/admin/combos";
import { formatearPrecio } from "@/lib/formato";
import { Seccion } from "../seccion";

/**
 * Productos del combo y sus cantidades. El orden importa: es el orden en que la tienda
 * pide las variantes y en que cotizar las empareja. Ver claude/web/combos.md
 */
export function EditorItemsCombo({
  comboId,
  precio,
  inicial,
  productos,
}: {
  comboId: string;
  precio: number;
  inicial: ItemComboAdmin[];
  productos: ProductoParaCombo[];
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [items, setItems] = useState(inicial);
  const [texto, setTexto] = useState("");
  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos]);

  const buscado = texto.trim().toLowerCase();
  const opciones = productos
    .filter((p) => !items.some((i) => i.productoId === p.id) && (!buscado || p.nombre.toLowerCase().includes(buscado)))
    .slice(0, 50);
  // Vista previa para el admin; la tienda muestra lo que calcula buscar_combos.
  const separado = items.reduce((s, i) => s + (porId.get(i.productoId)?.precio ?? 0) * i.cantidad, 0);
  const cambio = JSON.stringify(items) !== JSON.stringify(inicial);

  const fijar = (n: number, cambios: Partial<ItemComboAdmin>) => setItems((xs) => xs.map((x, k) => (k === n ? { ...x, ...cambios } : x)));
  const mover = (n: number, d: number) =>
    setItems((xs) => {
      const nuevo = [...xs];
      [nuevo[n], nuevo[n + d]] = [nuevo[n + d], nuevo[n]];
      return nuevo;
    });

  return (
    <Seccion
      titulo="Productos del combo"
      descripcion="El cliente elige talle, color, etc. de cada uno. Mínimo 2 unidades en total."
      acciones={
        <Button
          isPending={pendiente}
          isDisabled={!cambio || !items.length}
          onPress={() =>
            iniciar(async () => {
              const r = await guardarItemsCombo(comboId, items);
              if (!r.ok) return void toast.danger(r.error);
              toast("Productos guardados");
              router.refresh();
            })
          }
        >
          Guardar productos
        </Button>
      }
    >
      {items.length > 0 && (
        <ol className="flex flex-col divide-y divide-separator rounded-xl border border-border">
          {items.map((item, n) => {
            const p = porId.get(item.productoId);
            return (
              <li key={item.productoId} className="flex flex-wrap items-center gap-3 p-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="truncate text-sm font-medium">{p?.nombre ?? "Producto borrado"}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="tabular-nums">{p ? formatearPrecio(p.precio) : "—"} c/u</span>
                    {p && !p.publicado && (
                      <Chip size="sm" variant="secondary">
                        Oculto: el combo no se puede comprar
                      </Chip>
                    )}
                    {p && p.publicado && p.stock < item.cantidad && (
                      <Chip size="sm" variant="secondary">
                        Sin stock suficiente
                      </Chip>
                    )}
                  </p>
                </div>
                <NumberField
                  aria-label={`Cantidad de ${p?.nombre ?? "producto"}`}
                  value={item.cantidad}
                  minValue={1}
                  maxValue={10}
                  onChange={(v) => fijar(n, { cantidad: v || 1 })}
                  className="w-28"
                >
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                </NumberField>
                <div className="flex">
                  <Button isIconOnly size="sm" variant="ghost" aria-label="Subir" isDisabled={n === 0} onPress={() => mover(n, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button isIconOnly size="sm" variant="ghost" aria-label="Bajar" isDisabled={n === items.length - 1} onPress={() => mover(n, 1)}>
                    <ArrowDown />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={`Quitar ${p?.nombre ?? "producto"}`}
                    onPress={() => setItems((xs) => xs.filter((_, k) => k !== n))}
                  >
                    <TrashBin />
                  </Button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <ComboBox
        aria-label="Agregar producto al combo"
        inputValue={texto}
        onInputChange={setTexto}
        selectedKey={null}
        onSelectionChange={(clave) => {
          if (clave === null) return;
          if (items.length >= 10) return void toast.danger("Hasta 10 productos distintos.");
          setItems((xs) => [...xs, { productoId: String(clave), cantidad: 1 }]);
          setTexto("");
        }}
        defaultFilter={() => true}
        allowsEmptyCollection
      >
        <ComboBox.InputGroup>
          <Input placeholder="Agregar producto…" />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox renderEmptyState={() => <p className="p-3 text-sm text-muted">Sin resultados.</p>}>
            {opciones.map((p) => (
              <ListBox.Item key={p.id} id={p.id} textValue={p.nombre}>
                <span className="flex w-full justify-between gap-3">
                  <span className="truncate">{p.nombre}</span>
                  <span className="text-muted tabular-nums">{formatearPrecio(p.precio)}</span>
                </span>
              </ListBox.Item>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>

      {items.length > 0 && (
        <dl className="grid gap-1 text-sm sm:max-w-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Por separado (precio de lista)</dt>
            <dd className="tabular-nums">{formatearPrecio(separado)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Precio del combo</dt>
            <dd className="tabular-nums">{formatearPrecio(precio)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>{separado > precio ? "Ahorro que ve el cliente" : "Sin ahorro: el combo sale más caro"}</dt>
            <dd className="tabular-nums">{separado > precio ? formatearPrecio(separado - precio) : ""}</dd>
          </div>
        </dl>
      )}
    </Seccion>
  );
}
