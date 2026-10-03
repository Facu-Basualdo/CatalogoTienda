"use client";

import {
  ArrowUturnCcwLeft,
  ArrowUturnCwRight,
  Bold,
  Italic,
  Link as IconoLink,
  ListOl,
  ListUl,
  LayoutHeaderCells,
} from "@gravity-ui/icons";
import { Button, Separator, toast, ToggleButton, Toolbar } from "@heroui/react";
import { EditorContent, useEditor, useEditorState, type JSONContent } from "@tiptap/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Resultado } from "@/lib/admin/accion";
import { extensionesDescripcion } from "@/lib/descripcion/extensiones";
import { Seccion } from "./seccion";

// Editor de la descripción: MISMA lista de extensiones que el renderer de la tienda
// (lib/descripcion/extensiones.ts), o el contenido se pierde. Ver claude/web/descripcion-rica.md
/** `guardar`: Server Action ya ligada al producto o combo (`.bind` en la página). */
export function EditorDescripcion({ inicial, guardar }: { inicial: unknown; guardar: (contenido: string) => Promise<Resultado> }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const editor = useEditor({
    extensions: extensionesDescripcion,
    content: (inicial as JSONContent) ?? "",
    // Sin esto, hydration mismatch en Next: TipTap renderiza en el server un DOM distinto.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-neutral dark:prose-invert max-w-none min-h-48 px-4 py-3 outline-none [&_table]:w-full [&_td]:border [&_td]:border-border [&_td]:px-3 [&_th]:border [&_th]:border-border [&_th]:bg-surface-secondary [&_th]:px-3 [&_.selectedCell]:bg-surface-tertiary",
      },
    },
  });

  const estado = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            negrita: e.isActive("bold"),
            italica: e.isActive("italic"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            vinetas: e.isActive("bulletList"),
            numerada: e.isActive("orderedList"),
            link: e.isActive("link"),
            enTabla: e.isActive("table"),
            deshacer: e.can().undo(),
            rehacer: e.can().redo(),
          }
        : null,
  });

  const c = () => editor!.chain().focus();

  function link() {
    if (!editor) return;
    if (editor.isActive("link")) return void c().unsetLink().run();
    const url = window.prompt("URL del link (https://…)");
    if (url && /^https?:\/\//.test(url)) c().setLink({ href: url }).run();
  }

  return (
    <Seccion
      id="descripcion"
      titulo="Descripción"
      descripcion="Títulos, listas, links y tablas (de talles, especificaciones, comparativas)."
      acciones={
        <Button
          isPending={pendiente}
          isDisabled={!editor}
          onPress={() =>
            iniciar(async () => {
              // Como string: los attrs de ProseMirror no son objetos planos (ver la acción).
              const r = await guardar(JSON.stringify(editor!.getJSON()));
              if (!r.ok) return void toast.danger(r.error);
              toast("Descripción guardada");
              router.refresh();
            })
          }
        >
          Guardar descripción
        </Button>
      }
    >
      <div className="overflow-hidden rounded-xl border border-border">
        <Toolbar aria-label="Formato" className="flex flex-wrap items-center gap-1 border-b border-border bg-surface-secondary p-1.5">
          <ToggleButton size="sm" isIconOnly aria-label="Negrita" isSelected={!!estado?.negrita} onChange={() => c().toggleBold().run()}>
            <Bold />
          </ToggleButton>
          <ToggleButton size="sm" isIconOnly aria-label="Itálica" isSelected={!!estado?.italica} onChange={() => c().toggleItalic().run()}>
            <Italic />
          </ToggleButton>
          <ToggleButton size="sm" aria-label="Título" isSelected={!!estado?.h2} onChange={() => c().toggleHeading({ level: 2 }).run()}>
            T1
          </ToggleButton>
          <ToggleButton size="sm" aria-label="Subtítulo" isSelected={!!estado?.h3} onChange={() => c().toggleHeading({ level: 3 }).run()}>
            T2
          </ToggleButton>
          <Separator orientation="vertical" className="mx-1 h-6" />
          <ToggleButton size="sm" isIconOnly aria-label="Lista con viñetas" isSelected={!!estado?.vinetas} onChange={() => c().toggleBulletList().run()}>
            <ListUl />
          </ToggleButton>
          <ToggleButton size="sm" isIconOnly aria-label="Lista numerada" isSelected={!!estado?.numerada} onChange={() => c().toggleOrderedList().run()}>
            <ListOl />
          </ToggleButton>
          <ToggleButton size="sm" isIconOnly aria-label="Link" isSelected={!!estado?.link} onChange={link}>
            <IconoLink />
          </ToggleButton>
          <Separator orientation="vertical" className="mx-1 h-6" />
          {!estado?.enTabla ? (
            <Button size="sm" variant="ghost" onPress={() => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
              <LayoutHeaderCells />
              Tabla
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onPress={() => c().addRowAfter().run()}>
                + Fila
              </Button>
              <Button size="sm" variant="ghost" onPress={() => c().addColumnAfter().run()}>
                + Columna
              </Button>
              <Button size="sm" variant="ghost" onPress={() => c().deleteRow().run()}>
                − Fila
              </Button>
              <Button size="sm" variant="ghost" onPress={() => c().deleteColumn().run()}>
                − Columna
              </Button>
              <Button size="sm" variant="danger-soft" onPress={() => c().deleteTable().run()}>
                Borrar tabla
              </Button>
            </>
          )}
          <div className="ml-auto flex gap-1">
            <Button size="sm" isIconOnly variant="ghost" aria-label="Deshacer" isDisabled={!estado?.deshacer} onPress={() => c().undo().run()}>
              <ArrowUturnCcwLeft />
            </Button>
            <Button size="sm" isIconOnly variant="ghost" aria-label="Rehacer" isDisabled={!estado?.rehacer} onPress={() => c().redo().run()}>
              <ArrowUturnCwRight />
            </Button>
          </div>
        </Toolbar>
        <EditorContent editor={editor} />
      </div>
    </Seccion>
  );
}
