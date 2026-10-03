// Ventanas de fecha del panel (promociones, cupones): el admin elige DÍAS en hora de
// Argentina y la base guarda instantes (timestamptz). `desde` arranca a las 00:00 de su
// día y `hasta` termina a las 24:00 del suyo (= 00:00 del día siguiente).
// Offset fijo -03:00: Argentina no tiene horario de verano. Ver claude/web/promociones.md#fechas

export const ZONA = "America/Argentina/Buenos_Aires";
const diaAr = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" });

/** "YYYY-MM-DD" → instante de inicio de ese día. */
export const inicioDia = (d: string | null) => (d ? `${d}T00:00:00-03:00` : null);

/** "YYYY-MM-DD" → instante en que termina ese día (00:00 del siguiente). */
export function finDia(d: string | null) {
  if (!d) return null;
  const siguiente = new Date(`${d}T00:00:00Z`);
  siguiente.setUTCDate(siguiente.getUTCDate() + 1);
  return `${siguiente.toISOString().slice(0, 10)}T00:00:00-03:00`;
}

/** timestamptz → "YYYY-MM-DD" en hora argentina. `fin`: el día que termina en ese instante. */
export function aDia(ts: string | null, fin = false) {
  if (!ts) return null;
  return diaAr.format(new Date(new Date(ts).getTime() - (fin ? 1 : 0)));
}

export type Vigencia = { texto: string; estado: "vigente" | "programada" | "vencida" | "pausada" };
const fecha = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeZone: ZONA });

/** Texto de la ventana ("1/10/26 al 31/10/26") y estado para el chip del listado. */
export function vigencia(p: { activa: boolean; desde: string | null; hasta: string | null }, ahora: number): Vigencia {
  const desde = p.desde ? new Date(p.desde) : null;
  const hasta = p.hasta ? new Date(new Date(p.hasta).getTime() - 1) : null;
  const texto =
    desde && hasta
      ? `${fecha.format(desde)} al ${fecha.format(hasta)}`
      : desde
        ? `Desde ${fecha.format(desde)}`
        : hasta
          ? `Hasta ${fecha.format(hasta)}`
          : "Sin fechas";
  if (!p.activa) return { texto, estado: "pausada" };
  if (desde && desde.getTime() > ahora) return { texto, estado: "programada" };
  if (p.hasta && new Date(p.hasta).getTime() <= ahora) return { texto, estado: "vencida" };
  return { texto, estado: "vigente" };
}

export const CHIP_VIGENCIA: Record<Vigencia["estado"], { texto: string; variante: "primary" | "secondary" | "tertiary" }> = {
  vigente: { texto: "Vigente", variante: "primary" },
  programada: { texto: "Programada", variante: "secondary" },
  vencida: { texto: "Vencida", variante: "tertiary" },
  pausada: { texto: "Pausada", variante: "tertiary" },
};
