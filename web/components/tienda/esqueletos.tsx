import { Skeleton } from "@heroui/react";

export function EsqueletoGrilla({ cantidad = 8 }: { cantidad?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" aria-hidden>
      {Array.from({ length: cantidad }, (_, i) => (
        <li key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[4/5] w-full rounded-tarjeta" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
        </li>
      ))}
    </ul>
  );
}

export function EsqueletoCatalogo() {
  return (
    <div className="contenedor py-8 sm:py-12" aria-busy>
      <Skeleton className="mb-3 h-10 w-56 rounded" />
      <Skeleton className="mb-8 h-4 w-24 rounded" />
      <div className="flex gap-10">
        <div className="hidden w-60 shrink-0 flex-col gap-4 lg:flex">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full rounded" />
          ))}
        </div>
        <div className="flex-1">
          <EsqueletoGrilla />
        </div>
      </div>
    </div>
  );
}

export function EsqueletoFicha() {
  return (
    <div className="contenedor grid gap-10 py-8 lg:grid-cols-2" aria-busy>
      <Skeleton className="aspect-[4/5] w-full rounded-tarjeta" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-3/4 rounded" />
        <Skeleton className="h-6 w-1/4 rounded" />
        <Skeleton className="h-24 w-full rounded" />
      </div>
    </div>
  );
}
