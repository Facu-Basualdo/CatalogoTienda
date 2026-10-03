import { buttonVariants } from "@heroui/styles";
import Image from "next/image";
import NextLink from "next/link";
import type { Banner } from "@/lib/catalogo/lecturas";
import { urlPublica } from "@/lib/supabase/storage";

/**
 * Una diapositiva del carrusel de la home. `variante`:
 * - "auto" (tienda): 4:5 en mobile y 3:1 desde `sm`, con dos <Image> por breakpoint
 *   (art direction sin JS);
 * - "desktop" / "mobile" (vista previa del panel): fija una de las dos, sin importar el
 *   ancho de la pantalla.
 * El color del texto lo decide el banner (`textoClaro`), no la posición en el carrusel.
 */
export function DiapositivaBanner({
  banner: b,
  variante = "auto",
  prioridad = false,
  sizes = "100vw",
}: {
  banner: Banner;
  variante?: "auto" | "desktop" | "mobile";
  prioridad?: boolean;
  sizes?: string;
}) {
  const auto = variante === "auto";
  const claro = b.textoClaro;
  const mobile = b.imagenMobilePath ?? b.imagenPath;
  const titulo = auto ? "text-4xl sm:text-6xl" : variante === "desktop" ? "text-4xl" : "text-3xl";

  return (
    <div className="relative">
      <div className={`relative ${auto ? "aspect-[4/5] sm:aspect-[3/1]" : variante === "desktop" ? "aspect-[3/1]" : "aspect-[4/5]"}`}>
        {(auto || variante === "mobile") && (
          <Image src={urlPublica(mobile)} alt="" fill sizes={sizes} priority={prioridad} className={`object-cover ${auto ? "sm:hidden" : ""}`} />
        )}
        {(auto || variante === "desktop") && (
          <Image src={urlPublica(b.imagenPath)} alt="" fill sizes={sizes} priority={prioridad} className={`object-cover ${auto ? "hidden sm:block" : ""}`} />
        )}
      </div>
      {(b.titulo || b.subtitulo) && (
        <div
          className={`absolute inset-0 flex flex-col gap-3 ${
            auto
              ? "justify-start px-6 pt-12 sm:justify-center sm:px-12 sm:pt-0 lg:px-16"
              : variante === "desktop"
                ? "justify-center px-10"
                : "justify-start px-6 pt-10"
          }`}
        >
          {b.titulo && <h2 className={`max-w-md font-semibold tracking-tight ${titulo} ${claro ? "text-white" : "text-black"}`}>{b.titulo}</h2>}
          {b.subtitulo && <p className={`max-w-md text-lg ${claro ? "text-white/70" : "text-black/60"}`}>{b.subtitulo}</p>}
          {b.enlace && b.textoBoton && (
            <NextLink
              href={b.enlace}
              className={`${buttonVariants({ size: "lg" })} mt-2 self-start ${claro ? "!bg-white !text-black" : "!bg-black !text-white"}`}
            >
              {b.textoBoton}
            </NextLink>
          )}
        </div>
      )}
    </div>
  );
}
