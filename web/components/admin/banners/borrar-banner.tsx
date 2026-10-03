"use client";

import { TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarBanner } from "@/app/admin/(panel)/banners/acciones";
import { Seccion } from "../seccion";

export function BorrarBanner({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  return (
    <Seccion
      id="borrar"
      titulo="Borrar banner"
      descripcion="Para sacarlo de la home sin perderlo, apagá «Activo»."
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
            <AlertDialog.Body>Se borran el banner y sus imágenes. No se puede deshacer.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isPending={pendiente}
                onPress={() =>
                  iniciar(async () => {
                    const r = await borrarBanner(id);
                    if (!r.ok) return void toast.danger(r.error);
                    toast("Banner borrado");
                    router.replace("/admin/banners");
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
