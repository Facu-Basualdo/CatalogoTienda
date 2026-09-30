"use client";

import { Button } from "@heroui/react";
import { buttonVariants } from "@heroui/styles";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import NextLink from "next/link";
import { useEffect, useState } from "react";
import type { Banner } from "@/lib/catalogo/lecturas";
import { urlPublica } from "@/lib/supabase/storage";

// Desktop 3:1, mobile 4:5 (imagen_mobile_path; si falta, la de desktop recortada).
export function CarruselBanners({ banners }: { banners: Banner[] }) {
  const [ref, embla] = useEmblaCarousel({ loop: banners.length > 1 });
  const [actual, setActual] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const alSeleccionar = () => setActual(embla.selectedScrollSnap());
    embla.on("select", alSeleccionar);
    // Avance automático suave; se pausa si el usuario prefiere menos movimiento.
    const sinMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = sinMovimiento || banners.length < 2 ? undefined : setInterval(() => embla.scrollNext(), 6000);
    return () => {
      embla.off("select", alSeleccionar);
      clearInterval(timer);
    };
  }, [embla, banners.length]);

  if (!banners.length) return null;

  return (
    <section aria-roledescription="carrusel" aria-label="Novedades" className="relative overflow-hidden rounded-tarjeta">
      <div className="overflow-hidden" ref={ref}>
        <div className="flex">
          {banners.map((b, i) => {
            const oscuro = i % 2 === 1;
            return (
              <div key={b.id} className="relative min-w-0 flex-[0_0_100%]" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${banners.length}`}>
                <div className="relative aspect-[4/5] sm:aspect-[3/1]">
                  {/* Dos <Image> con visibilidad por breakpoint: art direction sin JS. */}
                  <Image
                    src={urlPublica(b.imagenMobilePath ?? b.imagenPath)}
                    alt=""
                    fill
                    sizes="100vw"
                    priority={i === 0}
                    className="object-cover sm:hidden"
                  />
                  <Image
                    src={urlPublica(b.imagenPath)}
                    alt=""
                    fill
                    sizes="100vw"
                    priority={i === 0}
                    className="hidden object-cover sm:block"
                  />
                </div>
                {(b.titulo || b.subtitulo) && (
                  <div className="absolute inset-0 mx-auto flex max-w-7xl flex-col justify-start gap-3 px-6 pt-12 sm:justify-center sm:pt-0">
                    {b.titulo && (
                      <h2 className={`max-w-md text-4xl font-semibold tracking-tight sm:text-6xl ${oscuro ? "text-white" : "text-black"}`}>
                        {b.titulo}
                      </h2>
                    )}
                    {b.subtitulo && <p className={`max-w-md text-lg ${oscuro ? "text-white/70" : "text-black/60"}`}>{b.subtitulo}</p>}
                    {b.enlace && b.textoBoton && (
                      <NextLink
                        href={b.enlace}
                        className={`${buttonVariants({ size: "lg" })} mt-2 self-start ${oscuro ? "!bg-white !text-black" : "!bg-black !text-white"}`}
                      >
                        {b.textoBoton}
                      </NextLink>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((b, i) => (
            <Button
              key={b.id}
              aria-label={`Ir a la diapositiva ${i + 1}${i === actual ? " (actual)" : ""}`}
              onPress={() => embla?.scrollTo(i)}
              className={`h-1.5 min-w-0 rounded-full p-0 transition-all ${i === actual ? "w-8 bg-neutral-500" : "w-3 bg-neutral-400/60"}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
