"use client";

import { TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarProducto } from "@/app/admin/(panel)/productos/acciones";
import { Seccion } from "../seccion";

export function BorrarProducto({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  return (
    <Seccion
      id="borrar"
      titulo="Borrar producto"
      descripcion="Para sacarlo de la tienda sin perderlo, apagá «Visible en la tienda». Borrar elimina también sus imágenes y variantes."
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
            <AlertDialog.Body>
              Se borran el producto, sus imágenes, variantes y stock. Los pedidos ya hechos lo conservan (guardan una copia). No
              se puede deshacer.
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isPending={pendiente}
                onPress={() =>
                  iniciar(async () => {
                    const r = await borrarProducto(id);
                    if (!r.ok) return void toast.danger(r.error);
                    toast("Producto borrado");
                    router.replace("/admin/productos");
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
