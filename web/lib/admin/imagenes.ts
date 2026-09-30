// Relaciones y tamaños fijos por uso. La tienda los asume (aspect-[4/5], aspect-[3/1]).
// Ver claude/supabase/imagenes.md#relación-de-aspecto-fija
export const FORMATOS = {
  producto: { ancho: 1200, alto: 1500, etiqueta: "4:5" },
  bannerDesktop: { ancho: 1920, alto: 640, etiqueta: "3:1" },
  bannerMobile: { ancho: 800, alto: 1000, etiqueta: "4:5" },
} as const;
export type Formato = keyof typeof FORMATOS;

/** Diferencia de relación tolerada sin pedir recorte (1%). */
const TOLERANCIA = 0.01;

export type Recorte = { x: number; y: number; width: number; height: number };

export function cargarImagen(archivo: File): Promise<HTMLImageElement> {
  return new Promise((resolver, rechazar) => {
    const url = URL.createObjectURL(archivo);
    const img = new Image();
    img.onload = () => resolver(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      rechazar(new Error("No se pudo leer la imagen"));
    };
    img.src = url;
  });
}

export function necesitaRecorte(img: HTMLImageElement, formato: Formato): boolean {
  const { ancho, alto } = FORMATOS[formato];
  return Math.abs(img.naturalWidth / img.naturalHeight - ancho / alto) / (ancho / alto) > TOLERANCIA;
}

export function esChica(img: HTMLImageElement, formato: Formato): boolean {
  const { ancho, alto } = FORMATOS[formato];
  return img.naturalWidth < ancho * 0.6 || img.naturalHeight < alto * 0.6;
}

/** Recorta (o toma la imagen entera) y la lleva al tamaño exacto del formato en WebP. */
export function exportarWebp(img: HTMLImageElement, formato: Formato, recorte?: Recorte): Promise<Blob> {
  const { ancho, alto } = FORMATOS[formato];
  const zona = recorte ?? { x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight };
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas no disponible"));
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, zona.x, zona.y, zona.width, zona.height, 0, 0, ancho, alto);
  return new Promise((resolver, rechazar) =>
    canvas.toBlob((b) => (b ? resolver(b) : rechazar(new Error("No se pudo exportar"))), "image/webp", 0.85),
  );
}
