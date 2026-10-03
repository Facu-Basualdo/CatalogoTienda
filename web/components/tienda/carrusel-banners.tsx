"use client";

import { Button } from "@heroui/react";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useState } from "react";
import type { Banner } from "@/lib/catalogo/lecturas";
import { DiapositivaBanner } from "./diapositiva-banner";

// Desktop 3:1, mobile 4:5 (imagen_mobile_path; si falta, la de desktop recortada).
// Cada diapositiva: diapositiva-banner.tsx (la reusa la vista previa del panel).
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
          {banners.map((b, i) => (
            <div key={b.id} className="relative min-w-0 flex-[0_0_100%]" aria-roledescription="diapositiva" aria-label={`${i + 1} de ${banners.length}`}>
              <DiapositivaBanner banner={b} prioridad={i === 0} />
            </div>
          ))}
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
