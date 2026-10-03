"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { adminParaAccion, fallo, ok, type Resultado } from "@/lib/admin/accion";
import { finDia, inicioDia } from "@/lib/admin/fechas";
import { TAGS } from "@/lib/catalogo/tags";

// Server Actions de promociones. Patrón en claude/web/dashboard.md#patrón-de-server-action
// Toda lectura de precios del catálogo lleva el tag `promociones`: con invalidarlo alcanza
// para que tarjetas, ofertas y fichas muestren el precio nuevo. Ver claude/web/promociones.md

const uuid = z.string().uuid();
const dia = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable();

const esquema = z
  .object({
    nombre: z.string().trim().min(1, "Poné un nombre.").max(80, "Máximo 80 caracteres."),
    tipo: z.enum(["porcentaje", "monto_fijo", "nxm", "segunda_unidad"]),
    valor: z.number().positive().nullable(),
    lleva: z.number().int().min(2).max(10).nullable(),
    paga: z.number().int().min(1).nullable(),
    alcanceTodo: z.boolean(),
    activa: z.boolean(),
    desde: dia,
    hasta: dia,
    alcance: z.object({
      productos: z.array(uuid).max(500),
      categorias: z.array(uuid).max(100),
      etiquetas: z.array(uuid).max(200),
    }),
  })
  .superRefine((p, ctx) => {
    const error = (message: string) => ctx.addIssue({ code: "custom", message });
    // Mismas reglas que el check de la tabla, con mensajes para el admin.
    if (p.tipo === "nxm") {
      if (!p.lleva || !p.paga) error("Completá cuántas lleva y cuántas paga.");
      else if (p.paga >= p.lleva) error("Tiene que pagar menos unidades de las que lleva.");
    } else if (!p.valor) error("Completá el descuento.");
    else if (p.tipo === "porcentaje" && p.valor > 90) error("El descuento máximo es 90%.");
    else if (p.tipo === "segunda_unidad" && p.valor > 100) error("La 2da unidad puede tener hasta 100% de descuento.");
    if (p.desde && p.hasta && p.hasta < p.desde) error("La fecha de fin es anterior a la de inicio.");
    const cantidad = p.alcance.productos.length + p.alcance.categorias.length + p.alcance.etiquetas.length;
    if (!p.alcanceTodo && cantidad === 0) error("Elegí a qué productos aplica la promoción.");
  });

export type DatosPromocion = z.input<typeof esquema>;

function invalidar() {
  updateTag(TAGS.promociones);
}

export async function guardarPromocion(id: string | null, datos: DatosPromocion): Promise<Resultado<{ id: string }>> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (id !== null && !uuid.safeParse(id).success) return fallo("Promoción inválida.");
  const r = esquema.safeParse(datos);
  if (!r.success) return fallo(r.error.issues[0]?.message ?? "Datos inválidos.");
  const p = r.data;
  const nxm = p.tipo === "nxm";

  const { data, error: e } = await supabase.rpc("guardar_promocion", {
    // null = crear. El tipo generado no admite null en un uuid; la función sí.
    p_id: id as string,
    p_promo: {
      nombre: p.nombre,
      tipo: p.tipo,
      valor: nxm ? null : p.valor,
      lleva: nxm ? p.lleva : null,
      paga: nxm ? p.paga : null,
      alcance_todo: p.alcanceTodo,
      activa: p.activa,
      desde: inicioDia(p.desde),
      hasta: finDia(p.hasta),
    },
    // Con alcance_todo el alcance detallado no se usa: no lo guardamos.
    p_alcance: p.alcanceTodo
      ? []
      : [
          ...p.alcance.productos.map((producto_id) => ({ producto_id })),
          ...p.alcance.categorias.map((categoria_id) => ({ categoria_id })),
          ...p.alcance.etiquetas.map((etiqueta_id) => ({ etiqueta_id })),
        ],
  });
  if (e) return fallo(e.message || "No se pudo guardar la promoción.");

  invalidar();
  return ok({ id: data });
}

export async function cambiarActiva(id: string, activa: boolean): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Promoción inválida.");
  const { error: e } = await supabase.from("promociones").update({ activa }).eq("id", id);
  if (e) return fallo("No se pudo cambiar el estado.");
  invalidar();
  return ok(undefined);
}

export async function borrarPromocion(id: string): Promise<Resultado> {
  const { supabase, error } = await adminParaAccion();
  if (!supabase) return fallo(error);
  if (!uuid.safeParse(id).success) return fallo("Promoción inválida.");
  // El alcance se borra en cascada. Los pedidos ya hechos conservan su descuento.
  const { error: e } = await supabase.from("promociones").delete().eq("id", id);
  if (e) return fallo("No se pudo borrar la promoción.");
  invalidar();
  return ok(undefined);
}
