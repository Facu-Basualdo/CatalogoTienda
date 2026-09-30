import { ChevronLeft, ChevronRight } from "@gravity-ui/icons";
import NextLink from "next/link";
import { urlDeFiltros, type Filtros } from "@/lib/catalogo/filtros";

// Páginas como <a> reales (crawleables y compartibles) con las clases BEM de
// HeroUI: Pagination.Link es un botón sin href. Ver claude/web/catalogo.md#paginación
function paginasVisibles(actual: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, actual - 1, actual, actual + 1].filter((p) => p >= 1 && p <= total));
  const orden = [...set].sort((a, b) => a - b);
  const salida: (number | "…")[] = [];
  orden.forEach((p, i) => {
    if (i > 0 && p - orden[i - 1] > 1) salida.push("…");
    salida.push(p);
  });
  return salida;
}

export function Paginacion({ filtros, paginas }: { filtros: Filtros; paginas: number }) {
  if (paginas <= 1) return null;
  const actual = Math.min(filtros.pagina, paginas);
  const url = (pagina: number) => urlDeFiltros({ ...filtros, pagina });

  return (
    <nav aria-label="Paginación" className="pagination justify-center">
      <ul className="pagination__content">
        <li className="pagination__item">
          {actual > 1 ? (
            <NextLink href={url(actual - 1)} className="pagination__link pagination__link--nav" aria-label="Página anterior">
              <ChevronLeft />
            </NextLink>
          ) : (
            <span className="pagination__link pagination__link--nav" aria-disabled="true">
              <ChevronLeft />
            </span>
          )}
        </li>
        {paginasVisibles(actual, paginas).map((p, i) => (
          <li key={`${p}-${i}`} className="pagination__item">
            {p === "…" ? (
              <span className="pagination__ellipsis">…</span>
            ) : (
              <NextLink
                href={url(p)}
                className="pagination__link"
                aria-current={p === actual ? "page" : undefined}
                aria-label={`Página ${p}`}
              >
                {p}
              </NextLink>
            )}
          </li>
        ))}
        <li className="pagination__item">
          {actual < paginas ? (
            <NextLink href={url(actual + 1)} className="pagination__link pagination__link--nav" aria-label="Página siguiente">
              <ChevronRight />
            </NextLink>
          ) : (
            <span className="pagination__link pagination__link--nav" aria-disabled="true">
              <ChevronRight />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}
