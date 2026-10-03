"use client";

import { Shuffle } from "@gravity-ui/icons";
import { Button, Description, Form, Input, Label, ListBox, NumberField, Select, Switch, TextField, toast } from "@heroui/react";
import { parseDate, type CalendarDate } from "@internationalized/date";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarCupon } from "@/app/admin/(panel)/cupones/acciones";
import type { CuponAdmin } from "@/lib/admin/cupones";
import { SITIO } from "@/lib/sitio";
import { Seccion } from "../seccion";
import { SelectorFecha } from "../selector-fecha";

const formatoPrecio = { style: "currency", currency: SITIO.moneda, maximumFractionDigits: 0 } as const;
// Sin 0/O ni 1/I: se dictan por WhatsApp. 10 caracteres hacen inviable adivinarlos.
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generarCodigo() {
  const azar = crypto.getRandomValues(new Uint32Array(10));
  return Array.from(azar, (n) => ALFABETO[n % ALFABETO.length]).join("");
}

/** Alta y edición. `cupon` null = nuevo. Ver claude/web/cupones.md */
export function FormularioCupon({ cupon }: { cupon: CuponAdmin | null }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [codigo, setCodigo] = useState(cupon?.codigo ?? "");
  const [tipo, setTipo] = useState<"porcentaje" | "monto_fijo">(cupon?.tipo ?? "porcentaje");
  const [valor, setValor] = useState<number | null>(cupon?.valor ?? null);
  const [minimo, setMinimo] = useState(cupon?.minimoCompra ?? 0);
  const [usosMaximos, setUsosMaximos] = useState<number | null>(cupon?.usosMaximos ?? null);
  const [activo, setActivo] = useState(cupon?.activo ?? true);
  const [desde, setDesde] = useState<CalendarDate | null>(cupon?.desde ? parseDate(cupon.desde) : null);
  const [hasta, setHasta] = useState<CalendarDate | null>(cupon?.hasta ? parseDate(cupon.hasta) : null);

  function guardar() {
    iniciar(async () => {
      const r = await guardarCupon(cupon?.id ?? null, {
        codigo,
        tipo,
        valor: valor ?? 0,
        minimoCompra: minimo,
        usosMaximos,
        activo,
        desde: desde?.toString() ?? null,
        hasta: hasta?.toString() ?? null,
      });
      if (!r.ok) return void toast.danger(r.error);
      toast.success(cupon ? "Cupón guardado" : "Cupón creado");
      if (cupon) router.refresh();
      else router.replace(`/admin/cupones/${r.datos.id}`);
    });
  }

  return (
    <Form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        guardar();
      }}
    >
      <Seccion titulo="Cupón" descripcion="Uno por pedido, sobre el total después de promociones y combos.">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex items-end gap-2">
            <TextField isRequired value={codigo} onChange={(v) => setCodigo(v.toUpperCase())} maxLength={30} className="flex-1">
              <Label>Código</Label>
              <Input placeholder="BIENVENIDA10" className="font-mono uppercase" />
              <Description>Sin distinguir mayúsculas. Si es para pocos, mejor uno largo y al azar.</Description>
            </TextField>
            <Button variant="outline" onPress={() => setCodigo(generarCodigo())} className="mb-6">
              <Shuffle />
              Generar
            </Button>
          </div>

          <Select value={tipo} onChange={(v) => (v === "porcentaje" || v === "monto_fijo") && setTipo(v)}>
            <Label>Tipo</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="porcentaje" textValue="Porcentaje">
                  Porcentaje
                  <ListBox.ItemIndicator />
                </ListBox.Item>
                <ListBox.Item id="monto_fijo" textValue="Monto fijo">
                  Monto fijo
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <NumberField
            key={tipo}
            isRequired
            value={valor ?? Number.NaN}
            onChange={(v) => setValor(v === undefined || Number.isNaN(v) ? null : v)}
            minValue={1}
            maxValue={tipo === "porcentaje" ? 100 : undefined}
            formatOptions={tipo === "monto_fijo" ? formatoPrecio : undefined}
          >
            <Label>{tipo === "porcentaje" ? "% de descuento" : "Descuento"}</Label>
            <NumberField.Group>
              <NumberField.Input />
            </NumberField.Group>
          </NumberField>

          <NumberField value={minimo} onChange={(v) => setMinimo(v || 0)} minValue={0} formatOptions={formatoPrecio}>
            <Label>Compra mínima</Label>
            <NumberField.Group>
              <NumberField.Input />
            </NumberField.Group>
            <Description>Sobre el total con promociones. 0 = sin mínimo.</Description>
          </NumberField>

          <NumberField
            value={usosMaximos ?? Number.NaN}
            onChange={(v) => setUsosMaximos(v === undefined || Number.isNaN(v) || v < 1 ? null : Math.floor(v))}
            minValue={1}
          >
            <Label>Usos máximos</Label>
            <NumberField.Group>
              <NumberField.Input placeholder="Ilimitado" />
            </NumberField.Group>
            <Description>
              Vacío = ilimitado. {cupon ? `Usado ${cupon.usos} ${cupon.usos === 1 ? "vez" : "veces"}.` : ""} Cancelar un pedido devuelve el uso.
            </Description>
          </NumberField>

          <div className="flex flex-col justify-center gap-1">
            <Switch isSelected={activo} onChange={setActivo}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Label>Activo</Label>
              </Switch.Content>
            </Switch>
            <p className="text-xs text-muted">Apagado no se acepta aunque esté dentro de las fechas.</p>
          </div>

          <SelectorFecha etiqueta="Desde" valor={desde} onChange={setDesde} ayuda="Vacío: vale desde ya." />
          <SelectorFecha etiqueta="Hasta (inclusive)" valor={hasta} onChange={setHasta} ayuda="Vacío: no vence." />
        </div>
      </Seccion>

      <div className="flex justify-end">
        <Button type="submit" isPending={pendiente}>
          {cupon ? "Guardar cambios" : "Crear cupón"}
        </Button>
      </div>
    </Form>
  );
}
