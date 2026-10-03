import "server-only";

import { generateText, type JSONContent } from "@tiptap/core";
import { extensionesDescripcion } from "@/lib/descripcion/extensiones";
import { fallo, ok, type Resultado } from "./accion";

/**
 * Valida la descripción que manda el editor y devuelve el JSON y el texto plano
 * (`descripcion_texto`, que usan la búsqueda y la meta description). `json` null = vacía.
 *
 * Llega como STRING JSON, no como objeto: ProseMirror crea los `attrs` de los nodos con
 * Object.create(null) y React no los serializa como datos al llamar un Server Action (los
 * vuelve "referencias temporales" opacas). Con tablas o títulos el servidor no podía leer
 * `colspan`/`level`. Ver claude/web/descripcion-rica.md#guardado
 */
export function procesarDescripcion(contenido: string): Resultado<{ json: JSONContent | null; texto: string }> {
  if (typeof contenido !== "string" || contenido.length > 100_000) return fallo("La descripción es demasiado larga.");
  let json: JSONContent;
  try {
    json = JSON.parse(contenido) as JSONContent;
  } catch {
    return fallo("Descripción inválida.");
  }
  if (!json || typeof json !== "object" || json.type !== "doc") return fallo("Descripción inválida.");

  let texto: string;
  try {
    // Valida también: un nodo que las extensiones no conocen tira error.
    texto = generateText(json, extensionesDescripcion).replace(/\s+/g, " ").trim();
  } catch {
    return fallo("La descripción tiene contenido no soportado.");
  }
  return ok({ json: texto ? json : null, texto });
}
