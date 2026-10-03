"use client";

import { Switch, toast } from "@heroui/react";
import { useOptimistic, useTransition } from "react";
import { cambiarActivo } from "@/app/admin/(panel)/cupones/acciones";

// Activo/pausado desde el listado. Optimista: cambia al tocar y vuelve
// atrás si la acción falla.
export function SwitchActivoCupon({ id, activo, nombre }: { id: string; activo: boolean; nombre: string }) {
  const [valor, setValor] = useOptimistic(activo);
  const [, iniciar] = useTransition();
  return (
    <Switch
      size="sm"
      isSelected={valor}
      aria-label={`Activo: ${nombre}`}
      onChange={(nuevo) =>
        iniciar(async () => {
          setValor(nuevo);
          const r = await cambiarActivo(id, nuevo);
          if (!r.ok) toast.danger(r.error);
        })
      }
    >
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  );
}
