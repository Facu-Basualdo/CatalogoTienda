export function Seccion({
  titulo,
  descripcion,
  acciones,
  children,
  id,
}: {
  titulo: string;
  descripcion?: React.ReactNode;
  acciones?: React.ReactNode;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-titulo` : undefined} className="flex flex-col gap-5 rounded-tarjeta border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={id ? `${id}-titulo` : undefined} className="text-lg font-semibold">
            {titulo}
          </h2>
          {descripcion && <p className="text-sm text-muted">{descripcion}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
  );
}
