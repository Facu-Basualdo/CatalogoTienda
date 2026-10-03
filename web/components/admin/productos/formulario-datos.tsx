"use client";

import { Button, Description, Form, Input, Label, ListBox, NumberField, Select, Switch, TextField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarDatos } from "@/app/admin/(panel)/productos/acciones";
import type { ProductoAdmin } from "@/lib/admin/productos";
import { SITIO } from "@/lib/sitio";
import { Seccion } from "../seccion";
import { useCategoriaProducto } from "./categoria-producto";

const SIN_CATEGORIA = "sin-categoria";
const formatoPrecio = { style: "currency", currency: SITIO.moneda, maximumFractionDigits: 0 } as const;

export function FormularioDatos({
  producto,
  categorias,
}: {
  producto: ProductoAdmin;
  categorias: { id: string; nombre: string }[];
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState(producto.nombre === "Producto nuevo" ? "" : producto.nombre);
  const [precio, setPrecio] = useState(producto.precio);
  const [precioAnterior, setPrecioAnterior] = useState<number | null>(producto.precioAnterior);
  const [categoriaId, setCategoriaId] = useState<string | null>(producto.categoriaId);
  const { setCategoriaId: avisarCategoria } = useCategoriaProducto();
  const [destacado, setDestacado] = useState(producto.destacado);
  const [publicado, setPublicado] = useState(producto.publicado);

  function guardar() {
    iniciar(async () => {
      const r = await guardarDatos(producto.id, {
        nombre,
        precio: Math.round(precio || 0),
        precioAnterior: precioAnterior === null || Number.isNaN(precioAnterior) ? null : Math.round(precioAnterior),
        categoriaId,
        destacado,
        publicado,
      });
      if (!r.ok) {
        toast.danger(r.error);
        return;
      }
      toast("Datos guardados");
      router.refresh();
    });
  }

  return (
    <Seccion id="datos" titulo="Datos">
      <Form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <TextField
          isRequired
          value={nombre}
          onChange={setNombre}
          maxLength={120}
          className="md:col-span-2"
        >
          <Label>Nombre</Label>
          <Input placeholder="Remera básica" />
          {/* El slug lo arma el servidor con el nombre: ver claude/web/dashboard.md#slugs */}
          <Description>
            {producto.slug.startsWith("borrador-")
              ? "La dirección en la tienda se arma sola con el nombre."
              : `Dirección en la tienda: ${SITIO.url.replace(/^https?:\/\//, "")}/p/${producto.slug}${producto.publicado ? "" : " (sigue al nombre hasta que lo publiques)"}`}
          </Description>
        </TextField>

        <NumberField isRequired value={precio} onChange={(v) => setPrecio(v ?? 0)} minValue={0} formatOptions={formatoPrecio}>
          <Label>Precio</Label>
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
          <Description>Precio base. Una variante puede tener otro.</Description>
        </NumberField>

        <NumberField
          value={precioAnterior ?? Number.NaN}
          onChange={(v) => setPrecioAnterior(v === undefined || Number.isNaN(v) ? null : v)}
          minValue={0}
          formatOptions={formatoPrecio}
        >
          <Label>Precio anterior (opcional)</Label>
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
          <Description>Si es mayor que el precio, se muestra tachado con el ahorro.</Description>
        </NumberField>

        <Select
          value={categoriaId ?? SIN_CATEGORIA}
          onChange={(v) => {
            const id = v === SIN_CATEGORIA || typeof v !== "string" ? null : v;
            setCategoriaId(id);
            avisarCategoria(id);
          }}
        >
          <Label>Categoría</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id={SIN_CATEGORIA} textValue="Sin categoría">
                Sin categoría
                <ListBox.ItemIndicator />
              </ListBox.Item>
              {categorias.map((c) => (
                <ListBox.Item key={c.id} id={c.id} textValue={c.nombre}>
                  {c.nombre}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <div className="flex flex-col justify-end gap-3">
          <Switch isSelected={publicado} onChange={setPublicado}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Label>Visible en la tienda</Label>
            </Switch.Content>
          </Switch>
          <Switch isSelected={destacado} onChange={setDestacado}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              <Label>Destacado en la home</Label>
            </Switch.Content>
          </Switch>
        </div>

        <div className="flex justify-end md:col-span-2">
          <Button type="submit" isPending={pendiente}>
            Guardar datos
          </Button>
        </div>
      </Form>
    </Seccion>
  );
}
