"use client";

import { TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarCupon } from "@/app/admin/(panel)/cupones/acciones";
import { Seccion } from "../seccion";

export function BorrarCupon({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  return (
    <Seccion
      id="borrar"
      titulo="Borrar cupón"
      descripcion="Para pausarlo sin perderlo, apagá «Activo». Los pedidos que lo usaron conservan el código y el descuento."
      acciones={
        <Button variant="danger-soft" onPress={() => setAbierto(true)}>
          <TrashBin />
          Borrar
        </Button>
      }
    >
      <AlertDialog.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>¿Borrar «{nombre}»?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>Deja de aceptarse en el carrito. No se puede deshacer.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isPending={pendiente}
                onPress={() =>
                  iniciar(async () => {
                    const r = await borrarCupon(id);
                    if (!r.ok) return void toast.danger(r.error);
                    toast("Cupón borrado");
                    router.replace("/admin/cupones");
                  })
                }
              >
                Borrar definitivamente
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </Seccion>
  );
}
