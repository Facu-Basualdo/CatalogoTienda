import type { JSONContent } from "@tiptap/core";
import { renderToReactElement } from "@tiptap/static-renderer/pm/react";
import { extensionesDescripcion } from "@/lib/descripcion/extensiones";

// Server component: JSON de TipTap → elementos React, sin strings HTML ni
// dangerouslySetInnerHTML, y sin cargar el editor en el bundle de la tienda.
// Ver claude/web/descripcion-rica.md
export function Descripcion({ contenido }: { contenido: unknown }) {
  if (!contenido || typeof contenido !== "object") return null;

  return (
    <div className="prose prose-neutral max-w-none dark:prose-invert prose-headings:font-semibold prose-table:my-0 prose-th:text-left">
      {renderToReactElement({
        content: contenido as JSONContent,
        extensions: extensionesDescripcion,
        options: {
          nodeMapping: {
            // Una tabla de talles de 8 columnas desborda en el celular: scroll propio.
            table: ({ children }) => (
              <div className="not-prose my-6 overflow-x-auto rounded-[var(--radius)] border border-border">
                <table className="w-full min-w-max border-collapse text-sm [&_td]:border-t [&_td]:border-border [&_td]:px-4 [&_td]:py-2.5 [&_th]:bg-surface-secondary [&_th]:px-4 [&_th]:py-2.5 [&_th]:text-left [&_th]:font-semibold [&_p]:m-0">
                  <tbody>{children}</tbody>
                </table>
              </div>
            ),
          },
        },
      })}
    </div>
  );
}
