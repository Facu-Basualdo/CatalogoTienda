"use server";

import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { finDia, inicioDia } from "@/lib/admin/fechas";

// Server Actions de cupones. Patrón en claude/web/dashboard.md#patrón-de-server-action
// No invalidan caché: los cupones no aparecen en ninguna lectura cacheada (se evalúan
// en vivo dentro de cotizar_carrito). Ver claude/web/cupones.md

const uuid = z.string().uuid();
const dia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const esquema = z
  .object({
    codigo: z
      .string()
      .trim()
      .transform((c) => c.toUpperCase())
      .pipe(z.string().regex(/^[A-Z0-9-]{3,30}$/, "El código lleva de 3 a 30 letras, números o guiones.")),
    tipo: z.enum(["porcentaje", "monto_fijo"]),
    valor: z.number().positive("Completá el descuento."),
    minimoCompra: z.number().min(0),
    usosMaximos: z.number().int().positive().nullable(),
    activo: z.boolean(),
    desde: dia,
    hasta: dia,
  })
  .superRefine((c, ctx) => {
    if (c.tipo === "porcentaje" && c.valor > 100) ctx.addIssue({ code: "custom", message: "El porcentaje máximo es 100%." });
    if (c.desde && c.hasta && c.hasta < c.desde) ctx.addIssue({ code: "custom", message: "La fecha de fin es anterior a la de inicio." });
  });

export type DatosCupon = z.input<typeof esquema>;

export async function guardarCupon(id: string | null, datos: DatosCupon): Promise<Resultado<{ id: string }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (id !== null && !uuid.safeParse(id).success) return fallo("Cupón inválido.");
  const r = esquema.safeParse(datos);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  const c = r.data;
  const fila = {
    codigo: c.codigo,
    tipo: c.tipo,
    valor: c.valor,
    minimo_compra: c.minimoCompra,
    usos_maximos: c.usosMaximos,
    activo: c.activo,
    desde: inicioDia(c.desde),
    hasta: finDia(c.hasta),
  };

  const { data, error: e } = id
    ? await supabase.from("cupones").update(fila).eq("id", id).select("id").maybeSingle()
    : await supabase.from("cupones").insert(fila).select("id").single();
  if (e?.code === "23505") return fallo("Ya existe un cupón con ese código.");
  if (e || !data) return fallo("No se pudo guardar el cupón.");
  return ok({ id: data.id });
}

export async function cambiarActivo(id: string, activo: boolean): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Cupón inválido.");
  const { error: e } = await supabase.from("cupones").update({ activo }).eq("id", id);
  if (e) return fallo("No se pudo cambiar el estado.");
  return ok(undefined);
}

export async function borrarCupon(id: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Cupón inválido.");
  // Los pedidos que lo usaron conservan el código (pedidos.cupon_codigo); cupon_id queda en null.
  const { error: e } = await supabase.from("cupones").delete().eq("id", id);
  if (e) return fallo("No se pudo borrar el cupón.");
  return ok(undefined);
}
