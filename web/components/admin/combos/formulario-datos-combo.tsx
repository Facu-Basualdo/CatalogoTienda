"use client";

import { Button, Description, Form, Input, Label, NumberField, Switch, TextField, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { guardarDatosCombo } from "@/app/admin/(panel)/combos/acciones";
import type { ComboAdmin } from "@/lib/admin/combos";
import { SITIO } from "@/lib/sitio";
import { Seccion } from "../seccion";

const formatoPrecio = { style: "currency", currency: SITIO.moneda, maximumFractionDigits: 0 } as const;

export function FormularioDatosCombo({ combo }: { combo: ComboAdmin }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState(combo.nombre === "Combo nuevo" ? "" : combo.nombre);
  const [precio, setPrecio] = useState(combo.precio);
  const [publicado, setPublicado] = useState(combo.publicado);
  const [destacado, setDestacado] = useState(combo.destacado);

  function guardar() {
    iniciar(async () => {
      const r = await guardarDatosCombo(combo.id, { nombre, precio, publicado, destacado });
      if (!r.ok) return void toast.danger(r.error);
      toast("Datos guardados");
      router.refresh();
    });
  }

  return (
    <Seccion titulo="Datos" descripcion="El precio es el del combo completo; dentro del combo no se aplican promociones.">
      <Form
        className="grid gap-5 md:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          guardar();
        }}
      >
        <TextField
          isRequired
          value={nombre}
          maxLength={120}
          onChange={setNombre}
          className="md:col-span-2"
        >
          <Label>Nombre</Label>
          <Input placeholder="Combo gamer: monitor + teclado + mouse" />
          {/* El slug lo arma el servidor con el nombre: ver claude/web/dashboard.md#slugs */}
          <Description>
            {combo.slug.startsWith("combo-borrador-")
              ? "La dirección en la tienda se arma sola con el nombre."
              : `Dirección en la tienda: /combo/${combo.slug}${combo.publicado ? "" : " (sigue al nombre hasta que lo publiques)"}`}
          </Description>
        </TextField>
        <NumberField isRequired value={precio} onChange={(v) => setPrecio(v ?? 0)} minValue={1} formatOptions={formatoPrecio}>
          <Label>Precio del combo</Label>
          <NumberField.Group>
            <NumberField.Input />
          </NumberField.Group>
        </NumberField>
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
