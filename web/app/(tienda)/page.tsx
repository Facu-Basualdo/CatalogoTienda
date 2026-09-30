import { Box, Comment, ShoppingCart } from "@gravity-ui/icons";
import Image from "next/image";
import NextLink from "next/link";
import { CarruselBanners } from "@/components/tienda/carrusel-banners";
import { CarruselProductos } from "@/components/tienda/carrusel-productos";
import { PestanasDestacados } from "@/components/tienda/pestanas-destacados";
import { TarjetaProducto } from "@/components/tienda/tarjeta-producto";
import {
  obtenerBanners,
  obtenerCategorias,
  obtenerDestacados,
  obtenerMosaicoCategorias,
  obtenerOfertas,
} from "@/lib/catalogo/lecturas";
import { urlPublica } from "@/lib/supabase/storage";

function Titulo({ normal, fuerte }: { normal: string; fuerte: string }) {
  return (
    <>
      {normal} <strong className="font-semibold">{fuerte}</strong>
    </>
  );
}

export default async function Inicio() {
  const [banners, categorias, mosaico, ofertas] = await Promise.all([
    obtenerBanners(),
    obtenerCategorias(),
    obtenerMosaicoCategorias(),
    obtenerOfertas(12),
  ]);
  const destacados = await Promise.all([
    obtenerDestacados(6).then((productos) => ({ id: "todos", titulo: "Todos", productos })),
    ...categorias.map((c) => obtenerDestacados(6, c.slug).then((productos) => ({ id: c.slug, titulo: c.nombre, productos }))),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-3 pb-8 pt-3 sm:gap-16 sm:px-6 sm:pt-5">
      <CarruselBanners banners={banners} />

      <section className="flex flex-col gap-5" aria-labelledby="destacados">
        <h2 id="destacados" className="text-xl font-light tracking-tight sm:text-2xl">
          <Titulo normal="Conocé nuestros" fuerte="productos destacados" />
        </h2>
        <PestanasDestacados
          paneles={destacados
            .filter((d) => d.productos.length)
            .map((d) => ({
              id: d.id,
              titulo: d.titulo,
              contenido: (
                <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                  {d.productos.map((p) => (
                    <li key={p.id}>
                      <TarjetaProducto producto={p} horizontal />
                    </li>
                  ))}
                </ul>
              ),
            }))}
        />
      </section>

      <section
        aria-label="Cómo comprar"
        className="grid gap-6 rounded-tarjeta border border-white/10 bg-encabezado p-6 text-encabezado-foreground sm:grid-cols-3 sm:p-10"
      >
        {[
          { icono: ShoppingCart, titulo: "Armá tu carrito", texto: "Elegí productos, talles y colores. El total se calcula al instante." },
          { icono: Comment, titulo: "Pedí por WhatsApp", texto: "Enviás el pedido con un toque y te respondemos para coordinar el pago." },
          { icono: Box, titulo: "Recibilo", texto: "Retiro o envío, lo que te quede mejor." },
        ].map(({ icono: Icono, titulo, texto }) => (
          <div key={titulo} className="flex gap-4">
            <Icono aria-hidden className="size-6 shrink-0" />
            <div className="flex flex-col gap-1">
              <h3 className="font-semibold">{titulo}</h3>
              <p className="text-sm text-white/70">{texto}</p>
            </div>
          </div>
        ))}
      </section>

      {mosaico.length > 0 && (
        <section className="flex flex-col gap-5" aria-labelledby="categorias">
          <h2 id="categorias" className="text-xl font-light tracking-tight sm:text-2xl">
            <Titulo normal="Explorá nuestras" fuerte="categorías" />
          </h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            {mosaico.map((c, i) => (
              <li key={c.slug} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                <NextLink
                  href={`/catalogo?cat=${c.slug}`}
                  className="group relative block aspect-square overflow-hidden rounded-tarjeta bg-surface-secondary"
                >
                  {c.imagen && (
                    <Image
                      src={urlPublica(c.imagen)}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    {c.nombre}
                  </span>
                </NextLink>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ofertas.productos.length > 0 && (
        <CarruselProductos titulo={<Titulo normal="Los mejores" fuerte="precios rebajados" />}>
          {ofertas.productos.map((p) => (
            <TarjetaProducto key={p.id} producto={p} />
          ))}
        </CarruselProductos>
      )}
    </div>
  );
}
