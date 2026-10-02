"use client";

import { Alert, Button, Description, Form, Input, Label, ListBox, NumberField, Select, Switch, TextField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarDatos } from "@/app/admin/(panel)/productos/acciones";
import type { ProductoAdmin } from "@/lib/admin/productos";
import { SITIO } from "@/lib/sitio";
import { slugify } from "@/lib/slug";
import { Seccion } from "../seccion";

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
  const [slug, setSlug] = useState(producto.slug);
  // Mientras sea un borrador con slug automático, el slug sigue al nombre.
  const [slugManual, setSlugManual] = useState(!producto.slug.startsWith("borrador-"));
  const [precio, setPrecio] = useState(producto.precio);
  const [precioAnterior, setPrecioAnterior] = useState<number | null>(producto.precioAnterior);
  const [categoriaId, setCategoriaId] = useState<string | null>(producto.categoriaId);
  const [destacado, setDestacado] = useState(producto.destacado);
  const [publicado, setPublicado] = useState(producto.publicado);

  const cambiaSlugPublicado = producto.publicado && slug !== producto.slug;

  function guardar() {
    iniciar(async () => {
      const r = await guardarDatos(producto.id, {
        nombre,
        slug,
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
          onChange={(v) => {
            setNombre(v);
            if (!slugManual) setSlug(slugify(v) || producto.slug);
          }}
          maxLength={120}
          className="md:col-span-2"
        >
          <Label>Nombre</Label>
          <Input placeholder="Remera básica" />
        </TextField>

        <TextField
          isRequired
          value={slug}
          onChange={(v) => {
            setSlugManual(true);
            setSlug(slugify(v));
          }}
          className="md:col-span-2"
        >
          <Label>Slug (URL)</Label>
          <Input />
          <Description>
            {SITIO.url.replace(/^https?:\/\//, "")}/p/{slug || "…"}
          </Description>
        </TextField>
        {cambiaSlugPublicado && (
          <Alert status="warning" className="md:col-span-2">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description>
                El producto ya está visible: cambiar el slug rompe los links que ya se compartieron.
              </Alert.Description>
            </Alert.Content>
          </Alert>
        )}

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
          onChange={(v) => setCategoriaId(v === SIN_CATEGORIA || typeof v !== "string" ? null : v)}
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
