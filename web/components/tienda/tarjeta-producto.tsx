import { Chip } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import Image from "next/image";
import NextLink from "next/link";
import { BotonAgregar } from "@/components/carrito/boton-agregar";
import type { TarjetaProducto as Datos } from "@/lib/catalogo/lecturas";
import { urlPublica } from "@/lib/supabase/storage";
import { Precio } from "./precio";
import { ContenedorVista } from "./vista-listado";

// Una sola variante de `sizes` para las grillas: cada combinación distinta consume
// cupo de optimización de Vercel. Ver claude/web/imagenes.md
export const SIZES_TARJETA = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw";

/**
 * Tarjeta del catálogo. `horizontal` fija el formato imagen-izquierda (destacados de la
 * home); si no, la tarjeta es vertical y pasa a horizontal cuando el contenedor está en
 * vista lista (group-data-[vista=lista]/vista).
 */
export function TarjetaProducto({
  producto,
  prioridad = false,
  horizontal = false,
}: {
  producto: Datos;
  prioridad?: boolean;
  horizontal?: boolean;
}) {
  const oferta = producto.precioAnterior != null && producto.precioAnterior > producto.precioDesde;
  const fila = horizontal ? "flex-row" : "flex-col sm:group-data-[vista=lista]/vista:flex-row";
  const anchoImagen = horizontal
    ? "w-28 sm:w-36"
    : "w-full sm:group-data-[vista=lista]/vista:w-48 sm:group-data-[vista=lista]/vista:self-stretch";

  return (
    <article
      className={`flex h-full overflow-hidden rounded-tarjeta border border-border bg-surface transition-shadow hover:shadow-[0_6px_24px_-8px_rgb(0_0_0/0.18)] ${fila}`}
    >
      <NextLink
        href={`/p/${producto.slug}`}
        tabIndex={-1}
        aria-hidden
        className={`relative block shrink-0 bg-surface-secondary ${horizontal ? "aspect-[4/5] self-center" : "aspect-[4/5]"} ${anchoImagen}`}
      >
        {producto.imagen ? (
          <Image
            src={urlPublica(producto.imagen.path)}
            alt=""
            fill
            sizes={SIZES_TARJETA}
            priority={prioridad}
            className={`object-cover ${producto.disponible ? "" : "opacity-60"}`}
          />
        ) : null}
        {!horizontal && (
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
        )}
      </NextLink>

      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
        {producto.marca && (
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted">{producto.marca}</p>
        )}
        <h3 className="line-clamp-2 text-sm leading-snug">
          <NextLink href={`/p/${producto.slug}`} className="outline-none hover:underline hover:underline-offset-4 focus-visible:underline">
            {producto.nombre}
          </NextLink>
        </h3>
        <div className="mt-auto flex flex-col gap-3 pt-1">
          <Precio valor={producto.precioDesde} anterior={producto.precioAnterior} desde={producto.precioVaria} />
          {!horizontal && <AccionTarjeta producto={producto} />}
        </div>
      </div>
    </article>
  );
}

// Variante única con stock → al carrito directo. Con opciones (talle, color…) → a la
// ficha a elegir. Sin stock → deshabilitado.
function AccionTarjeta({ producto }: { producto: Datos }) {
  if (!producto.disponible) {
    return (
      <span aria-disabled className={`${buttonVariants({ variant: "secondary", size: "sm", fullWidth: true })} pointer-events-none opacity-60`}>
        Sin stock
      </span>
    );
  }
  if (producto.varianteId) {
    return <BotonAgregar varianteId={producto.varianteId} nombre={producto.nombre} size="sm" />;
  }
  return (
    <NextLink href={`/p/${producto.slug}`} className={buttonVariants({ variant: "outline", size: "sm", fullWidth: true })}>
      Elegir opciones
    </NextLink>
  );
}

export function GrillaProductos({ productos, prioridad = 0 }: { productos: Datos[]; prioridad?: number }) {
  return (
    <ContenedorVista>
      {productos.map((p, i) => (
        <li key={p.id}>
          <TarjetaProducto producto={p} prioridad={i < prioridad} />
        </li>
      ))}
    </ContenedorVista>
  );
}
