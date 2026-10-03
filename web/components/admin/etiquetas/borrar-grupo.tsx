"use client";

import { TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, toast } from "@heroui/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { borrarGrupo } from "@/app/admin/(panel)/etiquetas/acciones";
import { Seccion } from "../seccion";

export function BorrarGrupo({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();

  return (
    <Seccion
      id="borrar"
      titulo="Borrar grupo"
      descripcion="Borra el grupo y todos sus valores, y los saca de los productos. Si alguno está en una variante, no se puede."
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
            <AlertDialog.Body>Los filtros del catálogo pierden este grupo. No se puede deshacer.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isPending={pendiente}
                onPress={() =>
                  iniciar(async () => {
                    const r = await borrarGrupo(id);
                    if (!r.ok) return void toast.danger(r.error);
                    toast("Grupo borrado");
                    router.replace("/admin/etiquetas");
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
