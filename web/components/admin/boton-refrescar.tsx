"use client";

import { ArrowRotateRight } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import { useTransition } from "react";
import { refrescarTienda } from "@/app/admin/acciones";

export function BotonRefrescar() {
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant="outline"
      isPending={pendiente}
      onPress={() =>
        iniciar(async () => {
          const r = await refrescarTienda();
          if (r.ok) toast(`Tienda actualizada (${r.datos.productos} productos)`);
          else toast.danger(r.error);
        })
      }
    >
      <ArrowRotateRight />
      Refrescar tienda
    </Button>
  );
}
