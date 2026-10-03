import { LayoutHeaderCells } from "@gravity-ui/icons";
import { Chip } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import Image from "next/image";
import NextLink from "next/link";
import type { TarjetaCombo as Datos } from "@/lib/catalogo/combos";
import { urlPublica } from "@/lib/supabase/storage";
import { Precio } from "./precio";
import { SIZES_TARJETA } from "./tarjeta-producto";

// Un combo siempre lleva a su ficha: hay que elegir la variante de cada producto.
export function TarjetaCombo({ combo, prioridad = false }: { combo: Datos; prioridad?: boolean }) {
  const href = `/combo/${combo.slug}`;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-tarjeta border border-border bg-surface transition-shadow hover:shadow-[0_6px_24px_-8px_rgb(0_0_0/0.18)]">
      <NextLink href={href} tabIndex={-1} aria-hidden className="relative block aspect-[4/5] bg-surface-secondary">
        {combo.imagen ? (
          <Image
            src={urlPublica(combo.imagen.path)}
            alt=""
            fill
            sizes={SIZES_TARJETA}
            priority={prioridad}
            className={`object-cover ${combo.disponible ? "" : "opacity-60"}`}
          />
        ) : (
          <LayoutHeaderCells className="absolute inset-0 m-auto size-16 text-muted" />
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          <Chip size="sm" variant="primary">
            Combo
          </Chip>
          {!combo.disponible && (
            <Chip size="sm" variant="secondary">
              Sin stock
            </Chip>
          )}
        </div>
      </NextLink>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {combo.productos} {combo.productos === 1 ? "producto" : "productos"}
        </p>
        <h3 className="line-clamp-2 text-sm leading-snug">
          <NextLink href={href} className="outline-none hover:underline hover:underline-offset-4 focus-visible:underline">
            {combo.nombre}
          </NextLink>
        </h3>
        <div className="mt-auto flex flex-col gap-3 pt-1">
          <Precio valor={combo.precio} anterior={combo.precioItems > combo.precio ? combo.precioItems : null} />
          <NextLink href={href} className={buttonVariants({ variant: "outline", size: "sm", fullWidth: true })}>
            {combo.disponible ? "Armar combo" : "Ver combo"}
          </NextLink>
        </div>
      </div>
    </article>
  );
}
