import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";

// UNA sola lista para el editor y para el renderer: si el editor tiene un nodo que
// el renderer no, ese contenido desaparece en la tienda. Ver claude/web/descripcion-rica.md
export const extensionesDescripcion = [
  StarterKit.configure({
    codeBlock: false,
    code: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      autolink: true,
      protocols: ["http", "https"],
      HTMLAttributes: { rel: "noopener nofollow", target: "_blank" },
    },
  }),
  TableKit.configure({ table: { resizable: false } }),
];
