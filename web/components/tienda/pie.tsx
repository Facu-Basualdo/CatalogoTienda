import { Logo } from "@/components/logo";
import { SITIO } from "@/lib/sitio";

export function Pie() {
  return (
    <footer className="mt-24 border-t border-border">
      <div className="contenedor flex flex-col gap-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <Logo className="text-foreground" />
        <p>{SITIO.descripcion} Proyecto de portfolio.</p>
      </div>
    </footer>
  );
}
