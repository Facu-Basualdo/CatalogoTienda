"use client";

import { Switch, toast } from "@heroui/react";
import { useOptimistic, useTransition } from "react";
import { cambiarVisibilidadCombo } from "@/app/admin/(panel)/combos/acciones";

// "Visible en la tienda" = combos.publicado. Optimista: cambia al tocar y vuelve
// atrás si la acción falla.
export function SwitchVisibleCombo({ id, publicado, nombre }: { id: string; publicado: boolean; nombre: string }) {
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
          const r = await cambiarVisibilidadCombo(id, nuevo);
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
