"use client";

import { ArrowLeft, ArrowRight, TrashBin } from "@gravity-ui/icons";
import { AlertDialog, Button, Chip, Input, TextField, toast } from "@heroui/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { actualizarAlt, borrarImagen, registrarImagen, reordenarImagenes } from "@/app/admin/(panel)/productos/acciones";
import { urlPublica } from "@/lib/supabase/storage";
import { Seccion } from "../seccion";
import { SubidaImagen } from "../subida-imagen";

type Imagen = { id: string; path: string; alt: string; orden: number };

// La principal es la primera (menor `orden`). Reordenar manda la lista completa a
// reordenar_imagenes. Flechas en vez de drag and drop: accesible con teclado y en touch.
export function GaleriaAdmin({ productoId, imagenes }: { productoId: string; imagenes: Imagen[] }) {
  const router = useRouter();
  const [orden, setOrden] = useState(imagenes.map((i) => i.id));
  const [ordenPrevio, setOrdenPrevio] = useState(imagenes);
  const [, iniciar] = useTransition();

  // Si el servidor trae otra lista (subida o borrado), se resincroniza.
  if (ordenPrevio !== imagenes) {
    setOrdenPrevio(imagenes);
    setOrden(imagenes.map((i) => i.id));
  }
  const porId = new Map(imagenes.map((i) => [i.id, i]));

  function mover(desde: number, hasta: number) {
    const nuevo = [...orden];
    const [id] = nuevo.splice(desde, 1);
    nuevo.splice(hasta, 0, id);
    setOrden(nuevo);
    iniciar(async () => {
      const r = await reordenarImagenes(productoId, nuevo);
      if (!r.ok) {
        toast.danger(r.error);
        setOrden(orden);
      } else router.refresh();
    });
  }

  return (
    <Seccion
      id="imagenes"
      titulo="Imágenes"
      descripcion="Relación 4:5. La primera es la principal: es la que se ve en el catálogo."
    >
      {orden.length > 0 && (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
          {orden.map((id, i) => {
            const img = porId.get(id);
            if (!img) return null;
            return (
              <li key={id} className="flex flex-col gap-2 rounded-xl border border-border p-2">
                <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-secondary">
                  <Image src={urlPublica(img.path)} alt={img.alt} fill sizes="(max-width: 640px) 50vw, 20vw" className="object-cover" />
                  {i === 0 && (
                    <Chip size="sm" variant="primary" className="absolute left-2 top-2">
                      Principal
                    </Chip>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Button isIconOnly size="sm" variant="ghost" aria-label="Mover antes" isDisabled={i === 0} onPress={() => mover(i, i - 1)}>
                    <ArrowLeft />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="Mover después"
                    isDisabled={i === orden.length - 1}
                    onPress={() => mover(i, i + 1)}
                  >
                    <ArrowRight />
                  </Button>
                  {i > 0 && (
                    <Button size="sm" variant="ghost" onPress={() => mover(i, 0)}>
                      Hacer principal
                    </Button>
                  )}
                  <BorrarImagen id={id} />
                </div>
                <TextoAlternativo id={id} inicial={img.alt} />
              </li>
            );
          })}
        </ul>
      )}

      <SubidaImagen
        formato="producto"
        carpeta={`productos/${productoId}`}
        multiple
        onSubida={async (img) => {
          const r = await registrarImagen(productoId, img);
          if (!r.ok) toast.danger(r.error);
          else router.refresh();
        }}
      />
    </Seccion>
  );
}

function TextoAlternativo({ id, inicial }: { id: string; inicial: string }) {
  const [alt, setAlt] = useState(inicial);
  const [, iniciar] = useTransition();
  return (
    <TextField
      aria-label="Texto alternativo"
      value={alt}
      onChange={setAlt}
      onBlur={() => {
        if (alt.trim() === inicial) return;
        iniciar(async () => {
          const r = await actualizarAlt(id, alt);
          if (!r.ok) toast.danger(r.error);
        });
      }}
    >
      <Input placeholder="Texto alternativo" className="text-xs" />
    </TextField>
  );
}

function BorrarImagen({ id }: { id: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Button isIconOnly size="sm" variant="ghost" aria-label="Borrar imagen" className="ml-auto" onPress={() => setAbierto(true)}>
        <TrashBin />
      </Button>
      <AlertDialog.Backdrop isOpen={abierto} onOpenChange={setAbierto}>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>¿Borrar la imagen?</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>Se borra el archivo y deja de verse en la tienda. No se puede deshacer.</AlertDialog.Body>
            <AlertDialog.Footer>
              <Button variant="ghost" onPress={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                isPending={pendiente}
                onPress={() =>
                  iniciar(async () => {
                    const r = await borrarImagen(id);
                    if (!r.ok) return void toast.danger(r.error);
                    setAbierto(false);
                    router.refresh();
                  })
                }
              >
                Borrar
              </Button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </>
  );
}
