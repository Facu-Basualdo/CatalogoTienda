import { ChevronLeft, ChevronRight, Pencil } from "@gravity-ui/icons";
import { Chip, Skeleton, Table } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import type { Metadata } from "next";
import Image from "next/image";
import NextLink from "next/link";
import { Suspense } from "react";
import {
  ESTADOS,
  FiltrosListado,
  type Estado,
} from "@/components/admin/productos/filtros-listado";
import { BotonNuevoProducto } from "@/components/admin/productos/nuevo-producto";
import { SwitchVisible } from "@/components/admin/productos/switch-visible";
import { requerirAdmin } from "@/lib/auth";
import { formatearPrecio } from "@/lib/formato";
import { urlPublica } from "@/lib/supabase/storage";

export const metadata: Metadata = { title: "Productos" };

const POR_PAGINA = 25;

// Server component: a los componentes de HeroUI (client) sólo props serializables;
// nada de renderEmptyState ni otras funciones desde acá.
// Shell estático + datos en su propio Suspense. Ver claude/web/dashboard.md#páginas-del-panel
export default function PaginaProductos(props: PageProps<"/admin/productos">) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-muted">
            El switch &quot;Visible&quot; muestra u oculta el producto en la
            tienda.
          </p>
        </div>
        <BotonNuevoProducto />
      </div>
      <Suspense fallback={<Skeleton className="h-12 rounded-xl" />}>
        <FiltrosListado />
      </Suspense>
      <Suspense fallback={<Skeleton className="h-96 rounded-tarjeta" />}>
        <Listado searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Listado({
  searchParams,
}: {
  searchParams: PageProps<"/admin/productos">["searchParams"];
}) {
  const sp = await searchParams;
  const { supabase } = await requerirAdmin();
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 80) : "";
  const estado = (
    typeof sp.estado === "string" && sp.estado in ESTADOS ? sp.estado : "todos"
  ) as Estado;
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  let consulta = supabase
    .from("productos")
    .select(
      `id, slug, nombre, precio, publicado, destacado, actualizado_en,
       categoria:categorias(nombre),
       imagenes:producto_imagenes(path, orden),
       variantes:producto_variantes(stock, activa, sku)`,
    )
    .order("actualizado_en", { ascending: false })
    .limit(1000);
  if (estado === "visibles") consulta = consulta.eq("publicado", true);
  if (estado === "ocultos") consulta = consulta.eq("publicado", false);
  const { data, error } = await consulta;
  if (error)
    return <p className="text-danger">No se pudieron leer los productos.</p>;

  // Búsqueda por nombre o SKU y "sin stock" se resuelven acá: el stock vive en las
  // variantes y PostgREST no filtra por un agregado. Alcanza para catálogos de cientos
  // de productos (tope 1000); con más, pasar a un RPC.
  const qn = q.toLowerCase();
  const filas = data
    .map((p) => ({
      ...p,
      stock: p.variantes
        .filter((v) => v.activa)
        .reduce((n, v) => n + v.stock, 0),
      imagen:
        [...p.imagenes].sort((a, b) => a.orden - b.orden)[0]?.path ?? null,
    }))
    .filter(
      (p) =>
        !qn ||
        p.nombre.toLowerCase().includes(qn) ||
        p.variantes.some((v) => v.sku?.toLowerCase().includes(qn)),
    )
    .filter((p) => estado !== "sin-stock" || p.stock === 0);

  const paginas = Math.max(1, Math.ceil(filas.length / POR_PAGINA));
  const visibles = filas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const url = (n: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (estado !== "todos") p.set("estado", estado);
    if (n > 1) p.set("pagina", String(n));
    return `/admin/productos${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {filas.length} {filas.length === 1 ? "producto" : "productos"}
      </p>
      {visibles.length === 0 ? (
        <p className="rounded-tarjeta border border-border bg-surface p-8 text-center text-muted">
          No hay productos con estos filtros.
        </p>
      ) : (
        <Table className="rounded-tarjeta border border-border bg-surface">
          <Table.ScrollContainer>
            <Table.Content aria-label="Productos">
              <Table.Header>
                <Table.Column isRowHeader>Producto</Table.Column>
                <Table.Column>Categoría</Table.Column>
                <Table.Column>Precio</Table.Column>
                <Table.Column>Stock</Table.Column>
                <Table.Column>Visible</Table.Column>
                <Table.Column>
                  <span className="sr-only">Acciones</span>
                </Table.Column>
              </Table.Header>
              <Table.Body>
                {visibles.map((p) => (
                  <Table.Row key={p.id} id={p.id}>
                    <Table.Cell>
                      <div className="flex items-center gap-3">
                        <div className="relative aspect-[4/5] w-10 shrink-0 overflow-hidden rounded-lg bg-surface-secondary">
                          {p.imagen && (
                            <Image
                              src={urlPublica(p.imagen)}
                              alt=""
                              fill
                              sizes="40px"
                              className="object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <NextLink
                            href={`/admin/productos/${p.id}`}
                            className="block truncate font-medium hover:underline"
                          >
                            {p.nombre}
                          </NextLink>
                          <span className="text-xs text-muted">/{p.slug}</span>
                        </div>
                        {p.destacado && (
                          <Chip size="sm" variant="secondary">
                            Destacado
                          </Chip>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {p.categoria?.nombre ?? (
                        <span className="text-muted">—</span>
                      )}
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">
                      {formatearPrecio(p.precio)}
                    </Table.Cell>
                    <Table.Cell
                      className={`tabular-nums ${p.stock === 0 ? "text-danger" : ""}`}
                    >
                      {p.stock}
                    </Table.Cell>
                    <Table.Cell>
                      <SwitchVisible
                        id={p.id}
                        publicado={p.publicado}
                        nombre={p.nombre}
                      />
                    </Table.Cell>
                    <Table.Cell>
                      <NextLink
                        href={`/admin/productos/${p.id}`}
                        aria-label={`Editar ${p.nombre}`}
                        className={buttonVariants({
                          variant: "ghost",
                          size: "sm",
                          isIconOnly: true,
                        })}
                      >
                        <Pencil />
                      </NextLink>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}

      {paginas > 1 && (
        <nav
          aria-label="Paginación"
          className="flex items-center justify-end gap-2 text-sm"
        >
          {pagina > 1 && (
            <NextLink
              href={url(pagina - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <ChevronLeft /> Anterior
            </NextLink>
          )}
          <span className="text-muted">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas && (
            <NextLink
              href={url(pagina + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              Siguiente <ChevronRight />
            </NextLink>
          )}
        </nav>
      )}
    </div>
  );
}
