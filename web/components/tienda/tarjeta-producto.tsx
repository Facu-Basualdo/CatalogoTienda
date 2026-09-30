import { Chip } from "@heroui/react";
import Image from "next/image";
import NextLink from "next/link";
import type { TarjetaProducto as Datos } from "@/lib/catalogo/lecturas";
import { urlPublica } from "@/lib/supabase/storage";
import { Precio } from "./precio";

// Una sola variante de `sizes` para todas las grillas: cada combinación distinta
// consume cupo de optimización de Vercel. Ver claude/web/imagenes.md
export const SIZES_TARJETA = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

export function TarjetaProducto({ producto, prioridad = false }: { producto: Datos; prioridad?: boolean }) {
  const oferta = producto.precioAnterior != null && producto.precioAnterior > producto.precioDesde;

  return (
    <NextLink href={`/p/${producto.slug}`} className="group flex flex-col gap-3 outline-none">
      <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius)] bg-surface-secondary ring-offset-2 ring-offset-background group-focus-visible:ring-2 group-focus-visible:ring-focus">
        {producto.imagen ? (
          <Image
            src={urlPublica(producto.imagen.path)}
            alt={producto.imagen.alt}
            fill
            sizes={SIZES_TARJETA}
            priority={prioridad}
            className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${producto.disponible ? "" : "opacity-60"}`}
          />
        ) : null}
        <div className="absolute left-2 top-2 flex gap-1">
          {!producto.disponible && (
            <Chip size="sm" variant="secondary">
              Sin stock
            </Chip>
          )}
          {producto.disponible && oferta && (
            <Chip size="sm" variant="primary">
              Oferta
            </Chip>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-sm leading-snug group-hover:underline group-hover:underline-offset-4">
          {producto.nombre}
        </h3>
        <Precio valor={producto.precioDesde} anterior={producto.precioAnterior} desde={producto.precioVaria} />
      </div>
    </NextLink>
  );
}

export function GrillaProductos({ productos, prioridad = 0 }: { productos: Datos[]; prioridad?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4">
      {productos.map((p, i) => (
        <li key={p.id}>
          <TarjetaProducto producto={p} prioridad={i < prioridad} />
        </li>
      ))}
    </ul>
  );
}
