"use client";

import { Xmark } from "@gravity-ui/icons";
import {
  Button,
  Calendar,
  DateField,
  DatePicker,
  Description,
  Form,
  Input,
  Label,
  ListBox,
  NumberField,
  Radio,
  RadioGroup,
  Select,
  Switch,
  TextField,
  toast,
} from "@heroui/react";
import { parseDate, type CalendarDate } from "@internationalized/date";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarPromocion } from "@/app/admin/(panel)/promociones/acciones";
import type { OpcionAlcance, PromocionAdmin, TipoPromocion } from "@/lib/admin/promociones";
import { SITIO } from "@/lib/sitio";
import { SelectorMultiple } from "../selector-multiple";
import { Seccion } from "../seccion";

const TIPOS: { id: TipoPromocion; nombre: string; ayuda: string }[] = [
  { id: "porcentaje", nombre: "Porcentaje de descuento", ayuda: "Baja el precio en la tienda: se ve tachado el de lista." },
  { id: "monto_fijo", nombre: "Monto fijo por unidad", ayuda: "Resta un monto a cada unidad. Se ve en la tienda." },
  { id: "nxm", nombre: "Lleva N, paga M (3x2, 2x1…)", ayuda: "Se aplica en el carrito: las unidades gratis son las más baratas." },
  { id: "segunda_unidad", nombre: "2da unidad con descuento", ayuda: "Se aplica en el carrito a cada par de unidades." },
];

const formatoPrecio = { style: "currency", currency: SITIO.moneda, maximumFractionDigits: 0 } as const;
const TODO = "todo";
const ELEGIDOS = "elegidos";

type Opciones = { categorias: OpcionAlcance[]; etiquetas: OpcionAlcance[]; productos: OpcionAlcance[] };

/** Alta y edición. `promocion` null = nueva. Ver claude/web/promociones.md#dashboard */
export function FormularioPromocion({ promocion, opciones }: { promocion: PromocionAdmin | null; opciones: Opciones }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState(promocion?.nombre ?? "");
  const [tipo, setTipo] = useState<TipoPromocion>(promocion?.tipo ?? "porcentaje");
  const [valor, setValor] = useState<number | null>(promocion?.valor ?? null);
  const [lleva, setLleva] = useState(promocion?.lleva ?? 3);
  const [paga, setPaga] = useState(promocion?.paga ?? 2);
  const [activa, setActiva] = useState(promocion?.activa ?? true);
  const [desde, setDesde] = useState<CalendarDate | null>(promocion?.desde ? parseDate(promocion.desde) : null);
  const [hasta, setHasta] = useState<CalendarDate | null>(promocion?.hasta ? parseDate(promocion.hasta) : null);
  const [alcanceTodo, setAlcanceTodo] = useState(promocion?.alcanceTodo ?? false);
  const [productos, setProductos] = useState(promocion?.alcance.productos ?? []);
  const [categorias, setCategorias] = useState(promocion?.alcance.categorias ?? []);
  const [etiquetas, setEtiquetas] = useState(promocion?.alcance.etiquetas ?? []);

  function guardar() {
    iniciar(async () => {
      const r = await guardarPromocion(promocion?.id ?? null, {
        nombre,
        tipo,
        valor: tipo === "nxm" ? null : valor,
        lleva: tipo === "nxm" ? lleva : null,
        paga: tipo === "nxm" ? paga : null,
        activa,
        desde: desde?.toString() ?? null,
        hasta: hasta?.toString() ?? null,
        alcanceTodo,
        alcance: { productos, categorias, etiquetas },
      });
      if (!r.ok) return void toast.danger(r.error);
      toast.success(promocion ? "Promoción guardada" : "Promoción creada");
      if (promocion) router.refresh();
      else router.replace(`/admin/promociones/${r.datos.id}`);
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
      <Seccion titulo="Promoción" descripcion="No se acumulan: si a un producto le tocan varias, se aplica la que más descuenta.">
        <div className="grid gap-5 md:grid-cols-2">
          <TextField isRequired value={nombre} onChange={setNombre} maxLength={80} className="md:col-span-2">
            <Label>Nombre</Label>
            <Input placeholder="3x2 en remeras" />
            <Description>Se muestra en el carrito y en el mensaje de WhatsApp.</Description>
          </TextField>

          <Select value={tipo} onChange={(v) => typeof v === "string" && setTipo(v as TipoPromocion)}>
            <Label>Tipo</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {TIPOS.map((t) => (
                  <ListBox.Item key={t.id} id={t.id} textValue={t.nombre}>
                    {t.nombre}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
            <Description>{TIPOS.find((t) => t.id === tipo)?.ayuda}</Description>
          </Select>

          {tipo === "nxm" ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField isRequired value={lleva} onChange={(v) => setLleva(v || 2)} minValue={2} maxValue={10}>
                <Label>Lleva</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
              <NumberField isRequired value={paga} onChange={(v) => setPaga(v || 1)} minValue={1} maxValue={lleva - 1}>
                <Label>Paga</Label>
                <NumberField.Group>
                  <NumberField.DecrementButton />
                  <NumberField.Input />
                  <NumberField.IncrementButton />
                </NumberField.Group>
              </NumberField>
            </div>
          ) : (
            <NumberField
              key={tipo}
              isRequired
              value={valor ?? Number.NaN}
              onChange={(v) => setValor(v === undefined || Number.isNaN(v) ? null : v)}
              minValue={1}
              maxValue={tipo === "porcentaje" ? 90 : tipo === "segunda_unidad" ? 100 : undefined}
              formatOptions={tipo === "monto_fijo" ? formatoPrecio : undefined}
            >
              <Label>{tipo === "monto_fijo" ? "Descuento por unidad" : tipo === "segunda_unidad" ? "% de descuento en la 2da" : "% de descuento"}</Label>
              <NumberField.Group>
                <NumberField.Input />
              </NumberField.Group>
              {tipo === "segunda_unidad" && <Description>100% = la segunda es gratis.</Description>}
            </NumberField>
          )}

          <SelectorFecha etiqueta="Desde" valor={desde} onChange={setDesde} ayuda="Vacío: empieza ya." />
          <SelectorFecha etiqueta="Hasta (inclusive)" valor={hasta} onChange={setHasta} ayuda="Vacío: no vence." />

          <div className="flex flex-col gap-1 md:col-span-2">
            <Switch isSelected={activa} onChange={setActiva}>
              <Switch.Content>
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Label>Activa</Label>
              </Switch.Content>
            </Switch>
            <p className="text-xs text-muted">Apagada no aplica aunque esté dentro de las fechas.</p>
          </div>
        </div>
      </Seccion>

      <Seccion titulo="A qué productos aplica" descripcion="Por categoría incluye sus subcategorías. Por etiqueta incluye las de variantes (ej. un color).">
        <RadioGroup value={alcanceTodo ? TODO : ELEGIDOS} onChange={(v) => setAlcanceTodo(v === TODO)} aria-label="Alcance">
          <Radio value={ELEGIDOS}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              Productos, categorías o etiquetas elegidas
            </Radio.Content>
          </Radio>
          <Radio value={TODO}>
            <Radio.Content>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              Todo el catálogo
            </Radio.Content>
          </Radio>
        </RadioGroup>

        {!alcanceTodo && (
          <div className="grid gap-5 lg:grid-cols-3">
            <SelectorMultiple etiqueta="Categorías" opciones={opciones.categorias} seleccionadas={categorias} onChange={setCategorias} />
            <SelectorMultiple etiqueta="Etiquetas" opciones={opciones.etiquetas} seleccionadas={etiquetas} onChange={setEtiquetas} placeholder="Marca, material, color…" />
            <SelectorMultiple etiqueta="Productos" opciones={opciones.productos} seleccionadas={productos} onChange={setProductos} placeholder="Buscar por nombre…" />
          </div>
        )}
      </Seccion>

      <div className="flex justify-end gap-3">
        <Button type="submit" isPending={pendiente}>
          {promocion ? "Guardar cambios" : "Crear promoción"}
        </Button>
      </div>
    </Form>
  );
}

function SelectorFecha({
  etiqueta,
  valor,
  onChange,
  ayuda,
}: {
  etiqueta: string;
  valor: CalendarDate | null;
  onChange: (v: CalendarDate | null) => void;
  ayuda: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <DatePicker value={valor} onChange={onChange} className="flex-1">
        <Label>{etiqueta}</Label>
        <DateField.Group fullWidth>
          <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
          <DateField.Suffix>
            <DatePicker.Trigger>
              <DatePicker.TriggerIndicator />
            </DatePicker.Trigger>
          </DateField.Suffix>
        </DateField.Group>
        <Description>{ayuda}</Description>
        <DatePicker.Popover>
          <Calendar aria-label={etiqueta}>
            <Calendar.Header>
              <Calendar.Heading />
              <Calendar.NavButton slot="previous" />
              <Calendar.NavButton slot="next" />
            </Calendar.Header>
            <Calendar.Grid>
              <Calendar.GridHeader>{(dia) => <Calendar.HeaderCell>{dia}</Calendar.HeaderCell>}</Calendar.GridHeader>
              <Calendar.GridBody>{(fecha) => <Calendar.Cell date={fecha} />}</Calendar.GridBody>
            </Calendar.Grid>
          </Calendar>
        </DatePicker.Popover>
      </DatePicker>
      {valor && (
        <Button isIconOnly size="sm" variant="ghost" aria-label={`Quitar fecha: ${etiqueta}`} onPress={() => onChange(null)} className="mt-7">
          <Xmark />
        </Button>
      )}
    </div>
  );
}
