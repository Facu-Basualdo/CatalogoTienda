"use client";

import { Plus } from "@gravity-ui/icons";
import { Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { crearBorrador } from "@/app/admin/(panel)/productos/acciones";

// Crea el borrador y abre su edición: las imágenes necesitan el id para su path.
export function BotonNuevoProducto() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      isPending={pendiente}
      onPress={() =>
        iniciar(async () => {
          const r = await crearBorrador();
          if (r.ok) router.push(`/admin/productos/${r.datos.id}`);
          else toast.danger(r.error);
        })
      }
    >
      <Plus />
      Nuevo producto
    </Button>
  );
}
