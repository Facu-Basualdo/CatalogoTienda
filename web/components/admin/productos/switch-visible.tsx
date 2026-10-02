"use client";

import { Switch, toast } from "@heroui/react";
import { useOptimistic, useTransition } from "react";
import { cambiarVisibilidad } from "@/app/admin/(panel)/productos/acciones";

// "Visible en la tienda" = productos.publicado. Optimista: cambia al tocar y vuelve
// atrás si la acción falla.
export function SwitchVisible({ id, publicado, nombre }: { id: string; publicado: boolean; nombre: string }) {
  const [valor, setValor] = useOptimistic(publicado);
  const [, iniciar] = useTransition();
  return (
    <Switch
      size="sm"
      isSelected={valor}
      aria-label={`Visible en la tienda: ${nombre}`}
      onChange={(nuevo) =>
        iniciar(async () => {
          setValor(nuevo);
          const r = await cambiarVisibilidad(id, nuevo);
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
