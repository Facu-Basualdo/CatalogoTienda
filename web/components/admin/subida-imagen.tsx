"use client";

import { CloudArrowUpIn } from "@gravity-ui/icons";
import { Button, Modal, Slider, Spinner, toast } from "@heroui/react";
import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";
import { useDropzone } from "react-dropzone";
import {
  cargarImagen,
  esChica,
  exportarWebp,
  FORMATOS,
  necesitaRecorte,
  type Formato,
  type Recorte,
} from "@/lib/admin/imagenes";
import { BUCKET } from "@/lib/supabase/storage";
import { supabaseNavegador } from "@/lib/supabase/navegador";

export type ImagenSubida = { path: string; ancho: number; alto: number };

type Props = {
  formato: Formato;
  /** Carpeta en el bucket: `productos/{id}`, `banners/{id}`… */
  carpeta: string;
  onSubida: (imagen: ImagenSubida) => void | Promise<void>;
  multiple?: boolean;
  etiqueta?: string;
};

// Subida con relación de aspecto FIJA. Si la imagen no coincide, se abre el recorte y
// no se puede subir sin recortar. Sube directo del navegador a Storage (los Server
// Actions cortan en 1 MB). Ver claude/web/imagenes.md#recorte-obligatorio
export function SubidaImagen({ formato, carpeta, onSubida, multiple = false, etiqueta }: Props) {
  const { ancho, alto, etiqueta: relacion } = FORMATOS[formato];
  const [cola, setCola] = useState<{ img: HTMLImageElement; nombre: string }[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const actual = cola[0];

  const subir = useCallback(
    async (img: HTMLImageElement, recorte?: Recorte) => {
      setSubiendo(true);
      try {
        const blob = await exportarWebp(img, formato, recorte);
        // Nombre nuevo siempre: sobrescribir un path deja la versión vieja en el CDN.
        const path = `${carpeta}/${crypto.randomUUID()}.webp`;
        const { error } = await supabaseNavegador()
          .storage.from(BUCKET)
          .upload(path, blob, { contentType: "image/webp", upsert: false });
        if (error) throw new Error(error.message);
        await onSubida({ path, ancho, alto });
      } catch (e) {
        toast.danger(`No se pudo subir la imagen: ${e instanceof Error ? e.message : "error desconocido"}`);
      } finally {
        URL.revokeObjectURL(img.src);
        setSubiendo(false);
      }
    },
    [carpeta, formato, ancho, alto, onSubida],
  );

  const onDrop = useCallback(
    async (archivos: File[]) => {
      const pendientes: { img: HTMLImageElement; nombre: string }[] = [];
      for (const archivo of archivos) {
        try {
          const img = await cargarImagen(archivo);
          if (esChica(img, formato)) {
            toast(`"${archivo.name}" es chica (${img.naturalWidth}×${img.naturalHeight}): se va a ver pixelada.`);
          }
          if (necesitaRecorte(img, formato)) pendientes.push({ img, nombre: archivo.name });
          else await subir(img);
        } catch {
          toast.danger(`"${archivo.name}" no es una imagen válida.`);
        }
      }
      if (pendientes.length) setCola((c) => [...c, ...pendientes]);
    },
    [formato, subir],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept: { "image/jpeg": [], "image/png": [], "image/webp": [], "image/avif": [] },
    disabled: subiendo,
  });

  return (
    <>
      <div
        {...getRootProps()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-tarjeta border-2 border-dashed p-6 text-center transition-colors ${
          isDragActive ? "border-foreground bg-surface-secondary" : "border-border hover:border-muted"
        }`}
      >
        {/* El input lo crea react-dropzone y queda oculto: es el mecanismo del file picker, no UI. */}
        <input {...getInputProps()} aria-label={etiqueta ?? "Subir imagen"} />
        {subiendo ? <Spinner size="sm" color="current" /> : <CloudArrowUpIn className="size-6 text-muted" aria-hidden />}
        <p className="text-sm font-medium">{etiqueta ?? (multiple ? "Arrastrá imágenes o tocá para elegir" : "Arrastrá una imagen o tocá para elegir")}</p>
        <p className="text-xs text-muted">
          Relación {relacion} · se guarda en {ancho}×{alto} WebP
        </p>
      </div>

      {actual && (
        <DialogoRecorte
          key={actual.img.src}
          img={actual.img}
          nombre={actual.nombre}
          aspecto={ancho / alto}
          relacion={relacion}
          subiendo={subiendo}
          onConfirmar={async (recorte) => {
            await subir(actual.img, recorte);
            setCola((c) => c.slice(1));
          }}
          onCancelar={() => {
            URL.revokeObjectURL(actual.img.src);
            setCola((c) => c.slice(1));
          }}
        />
      )}
    </>
  );
}

function DialogoRecorte({
  img,
  nombre,
  aspecto,
  relacion,
  subiendo,
  onConfirmar,
  onCancelar,
}: {
  img: HTMLImageElement;
  nombre: string;
  aspecto: number;
  relacion: string;
  subiendo: boolean;
  onConfirmar: (recorte: Recorte) => void;
  onCancelar: () => void;
}) {
  const [posicion, setPosicion] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [recorte, setRecorte] = useState<Recorte | null>(null);

  return (
    <Modal.Backdrop isOpen isDismissable={false} onOpenChange={(abierto) => !abierto && onCancelar()}>
      <Modal.Container size="lg">
        <Modal.Dialog>
          <Modal.Header>
            <Modal.Heading>Recortá la imagen ({relacion})</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="flex flex-col gap-4">
            <p className="truncate text-sm text-muted">
              {nombre} · {img.naturalWidth}×{img.naturalHeight}. No tiene la relación {relacion}: elegí qué parte queda.
            </p>
            <div className="relative h-[55vh] min-h-72 overflow-hidden rounded-xl bg-black">
              <Cropper
                image={img.src}
                crop={posicion}
                zoom={zoom}
                aspect={aspecto}
                onCropChange={setPosicion}
                onZoomChange={setZoom}
                onCropComplete={(_, pixeles) => setRecorte(pixeles)}
                objectFit="contain"
                showGrid
              />
            </div>
            <Slider aria-label="Zoom" minValue={1} maxValue={4} step={0.05} value={zoom} onChange={(v) => setZoom(v as number)}>
              <Slider.Track>
                <Slider.Fill />
                <Slider.Thumb />
              </Slider.Track>
            </Slider>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="ghost" onPress={onCancelar} isDisabled={subiendo}>
              Descartar
            </Button>
            <Button isPending={subiendo} isDisabled={!recorte} onPress={() => recorte && onConfirmar(recorte)}>
              Recortar y subir
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
