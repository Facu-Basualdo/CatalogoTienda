"use client";

import { Switch, toast } from "@heroui/react";
import { useOptimistic, useTransition } from "react";
import { cambiarActiva } from "@/app/admin/(panel)/promociones/acciones";

// Activa/pausada desde el listado. Optimista: cambia al tocar y vuelve
// atrás si la acción falla.
export function SwitchActiva({ id, activa, nombre }: { id: string; activa: boolean; nombre: string }) {
  const [valor, setValor] = useOptimistic(activa);
  const [, iniciar] = useTransition();
  return (
    <Switch
      size="sm"
      isSelected={valor}
      aria-label={`Activa: ${nombre}`}
      onChange={(nuevo) =>
        iniciar(async () => {
          setValor(nuevo);
          const r = await cambiarActiva(id, nuevo);
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
